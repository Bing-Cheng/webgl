<script>
$(function(){main();});

function main()//the entrance
{
	var image=new Image();
	image.src="images/farm8.jpg";//pass from Fritz
	image.onload=function()
	{
		render(image);
	}
}

function render(image)
{
	var canvas=document.getElementById("canvas");
	var gl=getWebGLContext(canvas);
	if(!gl){return;}
	vertexShader=createShaderFromScriptElement(gl,"2d-vertex-shader");
	fragmentShader=createShaderFromScriptElement(gl,"2d-fragment-shader");
	program=createProgram(gl,[vertexShader,fragmentShader]);
	gl.useProgram(program);
	var positionLocation=gl.getAttribLocation(program,"a_position");
	var texCoordLocation=gl.getAttribLocation(program,"a_texCoord");
	var texCoordBuffer=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,texCoordBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0.0,0.0,1.0,0.0,0.0,1.0,0.0,1.0,1.0,0.0,1.0,1.0]),gl.STATIC_DRAW);
	gl.enableVertexAttribArray(texCoordLocation);
	gl.vertexAttribPointer(texCoordLocation,2,gl.FLOAT,false,0,0);
	var originalImageTexture=createAndSetupTexture(gl);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
	gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
	var textures=[];
	var framebuffers=[];
	for(var ii=0;ii<2;++ii)
	{
		var texture=createAndSetupTexture(gl);
		textures.push(texture);
		gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,image.width,image.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
		var fbo=gl.createFramebuffer();framebuffers.push(fbo);
		gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
		gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
	}
	var resolutionLocation=gl.getUniformLocation(program,"u_resolution");
	var textureSizeLocation=gl.getUniformLocation(program,"u_textureSize");
	var kernelLocation=gl.getUniformLocation(program,"u_kernel[0]");
	var flipXLocation=gl.getUniformLocation(program,"u_flipX");
	var flipYLocation=gl.getUniformLocation(program,"u_flipY");
	var colorPLocation=gl.getUniformLocation(program,"u_cPick");
	gl.uniform2f(textureSizeLocation,image.width,image.height);
	var kernels={restore:[0,0,0,0,1,0,0,0,0],smooth:[0.045,0.122,0.045,0.122,0.332,0.122,0.045,0.122,0.045],sharpen:[-1,-1,-1,-1,16,-1,-1,-1,-1],edgeDetect:[-5,0,0,0,0,0,0,0,5]};
	var positionBuffer=gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation,2,gl.FLOAT,false,0,0);
	setRectangle(gl,0,0,image.width,image.height);
	gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
	gl.uniform1f(flipXLocation,1);
	gl.uniform1f(flipYLocation,1);
	setFramebuffer(null,canvas.width,canvas.height);
	var edgeStrength = 5;
	drawWithKernel("restore");
	var restore=document.getElementById("restore");
	var smooth=document.getElementById("smooth");
	var sharpen=document.getElementById("sharpen");
	var edgeDetect=document.getElementById("edgeDetect");
	var colorPick=document.getElementById("colorPick");
	var currentValue = $('#currentValue');
	var onSmooth;
	var onSharpen;
	var onEdge;
	var onColor;
	var sliderValue = 50;
	var hFlip = true;
	var vFlip = false;

//functions	
	function createAndSetupTexture(gl)
	{
		var texture=gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D,texture);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
		return texture;
	}
	function smoothFunc(sValue)
	{
		gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
		for(var j=0;j<sValue;++j)
		{
			setFramebuffer(framebuffers[j%2],image.width,image.height);
			drawWithKernel("smooth");
			gl.bindTexture(gl.TEXTURE_2D,textures[j%2]);
		}
		setFramebuffer(null,canvas.width,canvas.height);
		drawWithKernel("restore");
	}
	function sharpenFunc(sValue)
	{
		var sValue1 = sValue/10;
		gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
		for(var j=0;j<sValue1;++j)
		{
			setFramebuffer(framebuffers[j%2],image.width,image.height);
			drawWithKernel("sharpen");
			gl.bindTexture(gl.TEXTURE_2D,textures[j%2]);
		}
		setFramebuffer(null,canvas.width,canvas.height);
		drawWithKernel("restore");
	}
	function edgeFunc(sValue)
	{
		 edgeStrength = sValue/10;
		 if(edgeStrength<0.1){edgeStrength=0.1;}
				gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
				setFramebuffer(framebuffers[0],image.width,image.height);
			drawWithKernel("edgeDetect");
			gl.bindTexture(gl.TEXTURE_2D,textures[0]);
		setFramebuffer(null,canvas.width,canvas.height);
		drawWithKernel("restore");
	}
	function setFramebuffer(fbo,width,height)
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
		gl.uniform2f(resolutionLocation,width,height);gl.viewport(0,0,width,height);
	}
	function setRectangle(gl,x,y,width,height)
	{
		var x1=x;
		var x2=x+width;
		var y1=y;
		var y2=y+height;
		gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x1,y1,x2,y1,x1,y2,x1,y2,x2,y1,x2,y2]),gl.STATIC_DRAW);
	}
	function drawWithKernel(name)
	{
		var kArray = kernels[name];
		if (name=='edgeDetect')
		{
			for (var i=0;i<9;i++)
			{
				kArray[i] =edgeStrength*kernels[name][i];
			}
			gl.uniform1fv(kernelLocation,kArray);
			gl.drawArrays(gl.TRIANGLES,0,6);
			for (var i=0;i<9;i++)
			{
				kArray[i] =kernels[name][i]/edgeStrength;
			}
		}
		else
		{
			gl.uniform1fv(kernelLocation,kArray);
			gl.drawArrays(gl.TRIANGLES,0,6);
		}
	}
	
//events handle	
    $('#Slider').change(function(){
        sliderValue = this.value;
		currentValue.html(this.value);
		if (onSmooth){
			smoothFunc(sliderValue);
		}
		if (onSharpen){
			sharpenFunc(sliderValue);
		}
		if (onEdge){
			edgeFunc(sliderValue);
		}
    });
	restore.onclick=function(event)
	{
		$('#smooth').attr('class','up');
		$('#sharpen').attr('class','up');
		$('#edgeDetect').attr('class','up');
		$('#colorPick').attr('class','up');
		onSmooth = false;
		onSharpen = false;
		onEdge = false;
		onColor = false;
		gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
		gl.uniform1f(flipXLocation,1);
		gl.uniform1f(flipYLocation,1);
		setFramebuffer(framebuffers[0],image.width,image.height);
		drawWithKernel("restore");
		gl.bindTexture(gl.TEXTURE_2D,textures[0]);
		setFramebuffer(null,canvas.width,canvas.height);
		drawWithKernel("restore");
	}
	smooth.onclick=function(event)
	{
		if(onSmooth) {
			$('#smooth').attr('class','up');
			onSmooth = false;
		}else{
			$('#smooth').attr('class','dn');
			$('#sharpen').attr('class','up');
			$('#edgeDetect').attr('class','up');
			$('#colorPick').attr('class','up');
			onSmooth = true;
			onSharpen = false;
			onEdge = false;
			onColor = false;
			smoothFunc(sliderValue);
		}
	}
	sharpen.onclick=function(event)
	{
		if(onSharpen) {
			$('#sharpen').attr('class','up');
			onSharpen = false;
		}else{
			$('#smooth').attr('class','up');
			$('#sharpen').attr('class','dn');
			$('#edgeDetect').attr('class','up');
			$('#colorPick').attr('class','up');
			onSmooth = false;
			onSharpen = true;
			onEdge = false;
			onColor = false;
			sharpenFunc(sliderValue);
		}
	}
	edgeDetect.onclick=function(event)
	{
		if(onEdge) {
			$('#edgeDetect').attr('class','up');
			onEdge = false;
		}else{
			$('#smooth').attr('class','up');
			$('#sharpen').attr('class','up');
			$('#edgeDetect').attr('class','dn');
			$('#colorPick').attr('class','up');
			onSmooth = false;
			onSharpen = false;
			onEdge = true;
			onColor = false;
			edgeFunc(sliderValue);
		}
	}
	flipV.onclick=function(event)
	{
		gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
		gl.uniform1f(flipYLocation,1);
		setFramebuffer(framebuffers[0],image.width,image.height);
		drawWithKernel("restore");
		gl.bindTexture(gl.TEXTURE_2D,textures[0]);
		if (vFlip){
			gl.uniform1f(flipYLocation,-1);
			vFlip = false;
		}else
		{
			gl.uniform1f(flipYLocation,1);
			vFlip = true;
		}
		setFramebuffer(null,canvas.width,canvas.height);
		drawWithKernel("restore");
	}
	flipH.onclick=function(event)
	{
		gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
		gl.uniform1f(flipXLocation,1);
		setFramebuffer(framebuffers[0],image.width,image.height);
		drawWithKernel("restore");
		gl.bindTexture(gl.TEXTURE_2D,textures[0]);
		if (hFlip){
			gl.uniform1f(flipXLocation,-1);
			hFlip = false;
		}else
		{
			gl.uniform1f(flipXLocation,1);
			hFlip = true;
		}
		setFramebuffer(null,canvas.width,canvas.height);
		drawWithKernel("restore");
	}
	colorPick.onclick=function(event){
		gl.bindTexture(gl.TEXTURE_2D,originalImageTexture);
		gl.uniform1f(colorPLocation,0.6);
		setFramebuffer(framebuffers[0],image.width,image.height);
		drawWithKernel("restore");
		gl.bindTexture(gl.TEXTURE_2D,textures[0]);
		setFramebuffer(null,canvas.width,canvas.height);
		gl.uniform1f(colorPLocation,0.6);
		drawWithKernel("restore");
	}	
}//end of render
</script>


