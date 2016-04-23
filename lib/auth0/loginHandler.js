var error = require('./error');

module.exports = function(options, ctx, req, res, routingInfo) {
    var authParams = {
        clientId: options.clientId(ctx, req),
        domain: options.domain(ctx, req)
    };
    var count = !!authParams.clientId + !!authParams.domain;
    var scope = 'openid name email email_verified ' + (options.scope || '');
    if (count ===  0) {
        // TODO, tjanczuk, support the shared Auth0 application case
        return error({
            code: 501,
            message: 'Not implemented.'
        }, res);
        // Neither client id or domain are specified; use shared Auth0 settings
        // var authUrl = 'https://auth0.auth0.com/i/oauth2/authorize'
        //     + '?response_type=code'
        //     + '&audience=https://auth0.auth0.com/userinfo'
        //     + '&scope=' + encodeURIComponent(scope)
        //     + '&client_id=' + encodeURIComponent(routingInfo.baseUrl)
        //     + '&redirect_uri=' + encodeURIComponent(routingInfo.baseUrl + '/callback');
        // res.writeHead(302, { Location: authUrl });
        // return res.end();
    }
    else if (count === 2) {
        // Use custom Auth0 account
        var authUrl = 'https://' + authParams.domain + '/authorize' 
            + '?response_type=code'
            + '&scope=' + encodeURIComponent(scope)
            + '&client_id=' + encodeURIComponent(authParams.clientId)
            + '&redirect_uri=' + encodeURIComponent(routingInfo.baseUrl + '/callback');
        res.writeHead(302, { Location: authUrl });
        return res.end();
    }
    else {
        return error({
            code: 400,
            message: 'Both or neither Auth0 Client ID and Auth0 domain must be specified.'
        }, res);
    }
};
