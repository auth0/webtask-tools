exports.auth0 = require('./auth0/auth0');
exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromHapi = fromHapi;
exports.fromServer = exports.fromRestify = fromServer;

/*
var app = new (require('express'))();

app.get('/', function (req, res) {
   res.send('Hello, world'); 
});

module.exports = app;
*/
exports.express = function (options, cb) {
    options.nodejsCompiler(options.script, function (error, func) {
        if (error) return cb(error);
        try {
            func = fromConnect(func);
        }
        catch (e) {
            return cb(e);
        }
        return cb(null, func);
    });
};

/*
async (dynamic context) => {
    return "Hello, world!";  
}
*/
exports.cs = function (options, cb) {
    cb(null, require('edge').func(options.script));
};

/*
function (user, context, callback) {
    callback(null, user, context);
}
*/
exports['login-success'] = function (options, cb) {
    options.nodejsCompiler('return ' + options.script, function (error, func) {
        if (error) return cb(error);
        return cb(null, function (ctx, cb) {
            func(ctx.body.user, ctx.body.context, function (error, user, context) {
                cb(error, error ? null : { user: user, context: context });
            });
        });
    });
};

const SANITIZE_RX = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;

// API functions

function addAuth0(func) {
    func.auth0 = function (options) {
        return exports.auth0(func, options);
    }

    return func;
}

function fromConnect (connectFn) {
    return addAuth0(function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt);

        req.originalUrl = req.url;
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = attachStorageHelpers(context);

        return connectFn(req, res);
    });
}

function fromHapi(server) {
    var webtaskContext;

    server.ext('onRequest', function (request, response) {
        var normalizeRouteRx = createRouteNormalizationRx(request.x_wt.jtn);

        request.setUrl(request.url.replace(normalizeRouteRx, '/'));
        request.webtaskContext = webtaskContext;
    });

    return addAuth0(function (context, req, res) {
        var dispatchFn = server._dispatch();

        webtaskContext = attachStorageHelpers(context);

        dispatchFn(req, res);
    });
}

function fromServer(httpServer) {
    return addAuth0(function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.x_wt);

        req.originalUrl = req.url;
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = attachStorageHelpers(context);

        return httpServer.emit('request', req, res);
    });
}


// Helper functions

function createRouteNormalizationRx(claims) {
    var rxSegments = ['^\/'];
    var container = claims.container.replace(SANITIZE_RX, '\\$&');
    
    // When using a token with a host claim, the api prefix is stripped
    rxSegments.push('(?:api\/run\/)?');
    // Match the container (this gives us our anchor)
    rxSegments.push(`${container}/`);
    // Match a named webtask
    if (claims.jtn) {
        var name = claims.jtn.replace(SANITIZE_RX, '\\$&');
        
        rxSegments.push(`(?:${name}\/?)?`);
    }
    
    var normalizeRouteRx = rxSegments.join('');
    
    return new RegExp(normalizeRouteRx);
}

function attachStorageHelpers(context) {
    context.read = context.secrets.EXT_STORAGE_URL
        ?   readFromPath
        :   readNotAvailable;
    context.write = context.secrets.EXT_STORAGE_URL
        ?   writeToPath
        :   writeNotAvailable;

    return context;


    function readNotAvailable(path, options, cb) {
        var Boom = require('boom');

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        cb(Boom.preconditionFailed('Storage is not available in this context'));
    }

    function readFromPath(path, options, cb) {
        var Boom = require('boom');
        var Request = require('request');

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        Request({
            uri: context.secrets.EXT_STORAGE_URL,
            method: 'GET',
            headers: options.headers || {},
            qs: { path: path },
            json: true,
        }, function (err, res, body) {
            if (err) return cb(Boom.wrap(err, 502));
            if (res.statusCode === 404 && Object.hasOwnProperty.call(options, 'defaultValue')) return cb(null, options.defaultValue);
            if (res.statusCode >= 400) return cb(Boom.create(res.statusCode, body && body.message));

            cb(null, body);
        });
    }

    function writeNotAvailable(path, data, options, cb) {
        var Boom = require('boom');

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        cb(Boom.preconditionFailed('Storage is not available in this context'));
    }

    function writeToPath(path, data, options, cb) {
        var Boom = require('boom');
        var Request = require('request');

        if (typeof options === 'function') {
            cb = options;
            options = {};
        }

        Request({
            uri: context.secrets.EXT_STORAGE_URL,
            method: 'PUT',
            headers: options.headers || {},
            qs: { path: path },
            body: data,
        }, function (err, res, body) {
            if (err) return cb(Boom.wrap(err, 502));
            if (res.statusCode >= 400) return cb(Boom.create(res.statusCode, body && body.message));

            cb(null);
        });
    }
}
