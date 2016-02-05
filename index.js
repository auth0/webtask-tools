exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromHapi = fromHapi;
exports.fromServer = exports.fromRestify = fromServer;


// API functions

function fromConnect (connectFn) {
    return function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt.jtn);
        
        req.originalUrl = req.url;
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = attachStorageHelpers(context);
        
        return connectFn(req, res);
    };
}

function fromHapi(server) {
    var webtaskContext;
    
    server.ext('onRequest', function (request, response) {
        var normalizeRouteRx = createRouteNormalizationRx(request.x_wt.jtn);
        
        request.setUrl(request.url.replace(normalizeRouteRx, '/'));
        request.webtaskContext = webtaskContext;
    });
  
    return function (context, req, res) {
        var dispatchFn = server._dispatch();
        
        webtaskContext = attachStorageHelpers(context);
        
        dispatchFn(req, res);
    };
}

function fromServer(httpServer) {
    return function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt.jtn);
        
        req.originalUrl = req.url;
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = attachStorageHelpers(context);
        
        return httpServer.emit('request', req, res);
    };
}


// Helper functions

function createRouteNormalizationRx(jtn) {
    var normalizeRouteBase = '^\/api\/run\/[^\/]+\/';
    var normalizeNamedRoute = '(?:[^\/\?#]*\/?)?';

    return new RegExp(
        normalizeRouteBase + (
        jtn
            ?   normalizeNamedRoute
            :   ''
    ));
}

function attachStorageHelpers(context) {
    context.read = context.secrets.EXT_STORAGE_URL
        ?   readPath
        :   readNotAvailable;
    context.read = context.secrets.EXT_STORAGE_URL
        ?   writePath
        :   writeNotAvailable;
    
    function readNotAvailable(path, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        
        cb(new Error('Storage is not available in this context'));
    }
    
    function readPath(path, options, cb) {
        var Boom = require('boom');
        var Request = require('request');
        
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        
        Request({
            method: 'GET',
            headers: options.headers || {},
            qs: { path: path },
            json: true,
        }, function (err, res, body) {
            if (err) return cb(Boom.wrap(err, 502));
            if (res.statusCode >= 400) return cb(Boom.create(res.statusCode, body && body.message));
            
            res(null, body);
        });
    }
    
    function writeNotAvailable(path, data, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        
        cb(new Error('Storage is not available in this context'));
    }
    
    function writePath(path, data, options, cb) {
        var Boom = require('boom');
        var Request = require('request');
        
        if (typeof options === 'function') {
            cb = options;
            options = {};
        }
        
        Request({
            method: 'GET',
            headers: options.headers || {},
            qs: { path: path },
            body: data,
        }, function (err, res, body) {
            if (err) return cb(Boom.wrap(err, 502));
            if (res.statusCode >= 400) return cb(Boom.create(res.statusCode, body && body.message));
            
            res(null);
        });
    }
}