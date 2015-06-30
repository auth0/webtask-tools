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

exports.fromConnect = exports.fromExpress = fromConnect;
exports.fromServer = exports.fromRestify = fromServer;