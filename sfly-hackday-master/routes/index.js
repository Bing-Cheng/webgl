var fs = require('fs'),
    request = require('request'),
    events = require('events'),
    util = require('util'),
    async = require('async');

var RESULT_SIZE_LIMIT = 5,
    BASE_DIR = 'public',
    IMG_DIR = 'images',
    NO_DOWNLOAD_URLS =
        [{imgFilename: '/images/test/0B2kX.jpg', thumbFilename: '/images/test/0B2kXt.jpg'},
         {imgFilename: '/images/test/0CAOb6y.jpg', thumbFilename: '/images/test/0CAOb6yt.jpg'}];

/**
 * Get the filename part of a url.
 */
var getFilename = function (url) {
    var start = url.lastIndexOf('/');

    return url.substr(start + 1);
};

/**
 * Download a file.
 */
var downloadFile = function (url, filename, cb) {
    console.log('Downloading ' + url);

    request(url, function(error, response, body) {
        console.log('Download complete ' + url);
        if (cb) {
            cb(null, filename);
        }
    }).pipe(fs.createWriteStream(filename));
};

/**
 * imgur object constructor. Make the request to imgur and download the images.
 */
var Imgur = function(query) {
    var imgur = this,
        SEARCH_URL = 'https://api.imgur.com/3/gallery/hot/viral/0.json',
        GALLERY_SEARCH_URL = 'https://api.imgur.com/3/gallery/search?q=',
        CLIENT_ID = '11524c81a7a288f',
        request_url,    // actual request url sent to imgur
        r;

    this.jsonBody = {};
    this.localImageUrls = [];

    // Caller provided a query for image search
    if (query) {
        request_url = GALLERY_SEARCH_URL + query;
    } else {
        request_url = SEARCH_URL;
    }

    var options = { uri: request_url,
                    headers: { 'Authorization': 'Client-ID ' + CLIENT_ID }
                  };

    r = request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Body is a JSON object
            imgur.jsonBody = JSON.parse(body);
            var urlList = imgur.getImageUrls();
        } else {
            console.log('Error occurred');
            console.log('Status code: ' + response.statusCode);
        }
    });
}

util.inherits(Imgur, events.EventEmitter);

/**
 * Download the images in the imgur search result set.
 */
Imgur.prototype.getImageUrls = function () {
    var self = this,
        numImages = this.jsonBody.data.length,  // number of images in imgur response
        thumbFiledata = [], // array used to call async thumbnail download operation
        url,    // imgur image url
        thumbUrl,   // imgur thumbnail url
        i,
        numProcessed = 0,   // number of images actually processed
        filename,   // image location relative to our server
        localfilename,  // image location on filesystem
        thumbnailFilename, // thumbnail location relative to our server
        localthumbnailFilename; // thumbnail location on filesystem
    
    console.log('Processing ' + numImages + ' images');
    
    for (i = 0; i < numImages; i++) {
        if (numProcessed >= RESULT_SIZE_LIMIT) {
            break;
        }

        // ignore non-image results
        if (this.jsonBody.data[i].type != 'image/jpeg' &&
                this.jsonBody.data[i].type != 'image/gif') {
            continue;
        }

        numProcessed++;

        // Get image link
        url = this.jsonBody.data[i].link;
        // Generate relative filename for page
        filename = IMG_DIR + '/' + getFilename(url);

        // Generate absolute filename for saving image to server
        localfilename = BASE_DIR + '/' + filename;
        // Download full size image to server
        downloadFile(url, localfilename);
        
        // Generate thumbnail URL from original link
        thumbUrl = Imgur.getThumbUrl(url);
        // Generate relative filename for page
        thumbnailFilename = IMG_DIR + '/' + getFilename(thumbUrl);

        // Generate absolute filename for saving thumbnail to server
        localthumbnailFilename = BASE_DIR + '/' + thumbnailFilename;

        // Build an array of save operations for thumbnails
        thumbFiledata.push({url: thumbUrl, filename: localthumbnailFilename});

        // Build an array of relative path names to render web page
        self.localImageUrls.push({imgFilename: filename, thumbFilename: thumbnailFilename});
    }

    var getThumbs = function(thumb, callback) {
        console.log('adding thumbnail: ' + thumb.url);
        downloadFile(thumb.url, thumb.filename, callback);
    };

    async.each(thumbFiledata, getThumbs, function (err) {
        console.log('Fetch completed');
        self.emit('end', 'Fetch completed');
    });

};

/**
 * Construct imgur thumbnail URL from original image URL.
 */
Imgur.getThumbUrl = function (url) {
    var extIndex = url.lastIndexOf('.');

    return url.substr(0, extIndex) + 't' + url.substr(extIndex);
};

/*
 * Fetch photos from imgur.
 */

exports.index = function(req, res){
    var query = req.query.q,
        local = req.query.local,
        imgur;

    if (local) {  // local test only, no downloads
        console.dir('thumbs ' + NO_DOWNLOAD_URLS);
        res.render('index', {title: 'Express', endpoint: '/effect2?img=',
                             thumbs: NO_DOWNLOAD_URLS});
    } else {
        imgur = new Imgur(query);
        imgur.on('end', function () {
            console.dir('thumbs ' + imgur.localImageUrls);
            res.render('index', {title: 'Express', endpoint: '/effect2?img=',
                                 thumbs: imgur.localImageUrls});
        });
    }
};

exports.effect = function(req, res) {
    res.render('effect', { title: 'Effect',
                           effect: req.query.effect,
                           imageUrl: req.query.imageUrl });
};

exports.effect2 = function(req, res) {
    res.render('effect2', { title: 'Effect',
                           imageUrl: req.query.img });
};
