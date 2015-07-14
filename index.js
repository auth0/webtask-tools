var normalizeRouteRx = /^\/api\/run\/[^\/]+\/(?:[^\/\?#]*\/?)?/;

function fromConnect (connectFn) {
    return function (context, req, res) {
        req.url = req.url.replace(normalizeRouteRx, '');
        req.webtaskContext = context;
        
        return connectFn(req, res);
    };
}

function fromHapi (server) {
    var webtaskContext;
    
    server.ext('onRequest', function (request, response) {
        request.setUrl(request.url.replace(normalizeRouteRx, '/'));
        request.webtaskContext = webtaskContext;
    });
  
    return function (context, req, res) {
        var dispatchFn = server._dispatch();
        
        webtaskContext = context;
        
        dispatchFn(req, res);
    };
}

function fromServer (httpServer) {
    return function (context, req, res) {
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = context;
        
        return httpServer.emit('request', req, res);
    };
}

exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromHapi = fromHapi;
exports.fromServer = exports.fromRestify = fromServer;