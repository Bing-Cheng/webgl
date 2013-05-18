window.onload = function() {
    var prepareCanvas = function () {
      var canvas;
      //
      // try to create a WebGL canvas (will fail if WebGL isn't supported)
      try {
        canvas = fx.canvas();
      } catch (e) {
        alert(e);
      }
      return canvas;
    };

    // Get the canvas ready
    var canvas = prepareCanvas();

    // convert the image to a texture
    var image = document.getElementById('image');
    var width = image.clientWidth;
    var height = image.clientHeight;
    var texture = canvas.texture(image);

    // apply the ink filter
    if(effect === 'ink') {
      canvas.draw(texture).ink(0.25).update();
    } else if (effect === 'zoomblur') {
      canvas.draw(texture).zoomBlur(width / 2, height / 2, 0.30).update();
    }

    // replace the image with the canvas
    image.parentNode.insertBefore(canvas, image);
    image.parentNode.removeChild(image);
};
