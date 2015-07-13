var request = require('request');
var path    = require('path');

function fromConnect (connectFn) {
    return function (context, req, res) {
        req.url = req.url.replace('/api/run/', '/');
        req.webtaskContext = context;
        
        return connectFn(req, res);
    };
}

function fromServer (httpServer) {
    return function (context, req, res) {
        req.url = req.url.replace('/api/run/', '/');
        req.webtaskContext = context;

        return httpServer.emit('request', req, res);
    };
}

function getTask (name, container, base_url) {

    var url = base_url || 'https://webtask.it.auth0.com/' +
        path.join(
            'api',
            'run',
            encodeURIComponent(container),
            encodeURIComponent(name) + '?webtask_no_cache=1'
        );

    return {
        url: url,
        run: function(ctx, args, opts) {
            if(!opts) opts = {};

            return new Promise(function (resolve, reject) {
                request({
                    url:    url,
                    method: opts.method || 'POST',
                    json:   opts.json   || true,
                    query:  opts.query,
                    body:   args

                }, function (err, res, body) {
                    if(err) return reject(err);

                    resolve(res, body);
                });
            });
        }
    };
}

exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromServer  = exports.fromRestify = fromServer;
exports.getTask     = getTask;
