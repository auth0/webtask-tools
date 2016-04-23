var error = require('./error');

module.exports = function (options, ctx, req, res, routingInfo) {
    if (!ctx.query.code) {
        return options.loginError({
            code: 401,
            message: 'Authentication error.',
            callbackQuery: ctx.query
        }, ctx, req, res, routingInfo.baseUrl);
    }

    var authParams = {
        clientId: options.clientId(ctx, req),
        domain: options.domain(ctx, req),
        clientSecret: options.clientSecret(ctx, req)
    };
    var count = !!authParams.clientId + !!authParams.domain + !!authParams.clientSecret;
    if (count !== 3) {
        return error({
            code: 400,
            message: 'Auth0 Client ID, Client Secret, and Auth0 Domain must be specified.'
        }, res);
    }

    return require('superagent')
        .post('https://' + authParams.domain + '/oauth/token')
        .type('form')
        .send({
            client_id: authParams.clientId,
            client_secret: authParams.clientSecret,
            redirect_uri: routingInfo.baseUrl + '/callback',
            code: ctx.query.code,
            grant_type: 'authorization_code'
        })
        .timeout(15000)
        .end(function (err, ares) {
            if (err || !ares.ok) {
                return options.loginError({
                    code: 502,
                    message: 'OAuth code exchange completed with error.',
                    error: err && err.message,
                    auth0Status: ares && ares.status,
                    auth0Response: ares && (ares.body || ares.text)
                }, ctx, req, res, routingInfo.baseUrl);
            }

            return issueApiKey(ares.body.id_token);
        });

    function issueApiKey(id_token) {
        var jwt = require('jsonwebtoken');
        var claims;
        try {
            claims = jwt.decode(id_token);
        }
        catch (e) {
            return options.loginError({
                code: 502,
                message: 'Cannot parse id_token returned from Auth0.',
                id_token: id_token,
                error: e.message
            }, ctx, req, res, routingInfo.baseUrl);
        }

        // Issue apiKey by re-signing the id_token claims 
        // with configured secret (webtask token by default).

        var secret = options.webtaskSecret(ctx, req);
        if (!secret) {
            return error({
                code: 400,
                message: 'The webtask secret must be be provided to allow for issuing apiKeys.'
            }, res);
        }

        claims.iss = routingInfo.baseUrl;
        req.user = ctx.user = claims;
        ctx.apiKey = jwt.sign(claims, secret);

        // Perform post-login action (redirect to /?apiKey=... by default)
        return options.loginSuccess(ctx, req, res, routingInfo.baseUrl);
    }
};
