function fromConnect (connectFn) {
    return function (context, req, res) {
        var normalizeRouteRx = createRouteNormalizationRx(req.query.webtask_jtn);
        
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = context;
        
        return connectFn(req, res);
    };
}

function fromHapi (server) {
    var webtaskContext;
    
    server.ext('onRequest', function (request, response) {
        var normalizeRouteRx = createRouteNormalizationRx(request.query.webtask_jtn);
        
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
        var normalizeRouteRx = createRouteNormalizationRx(req.query.webtask_jtn);
        
        req.url = req.url.replace(normalizeRouteRx, '/');
        req.webtaskContext = context;
        
        return httpServer.emit('request', req, res);
    };
}

function createRouteNormalizationRx (jtn) {
    var normalizeRouteBase = '^\/api\/run\/[^\/]+\/';
    var normalizeNamedRoute = '(?:[^\/\?#]*\/?)?';

    return new RegExp(
        normalizeRouteBase + (
        jtn
            ? normalizeNamedRoute
            : ''
    ));
}

exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromHapi = fromHapi;
exports.fromServer = exports.fromRestify = fromServer;