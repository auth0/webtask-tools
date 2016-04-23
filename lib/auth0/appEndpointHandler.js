module.exports = function (webtask, options, ctx, req, res, routingInfo) {
    var apiKey = options.getApiKey(ctx, req);
    if (!apiKey) {
        return options.loginError({
            code: 401,
            message: 'Unauthorized.',
            error: 'Missing apiKey.',
            redirect: routingInfo.baseUrl + '/login'
        }, ctx, req, res, routingInfo.baseUrl);
    }

    // Authenticate

    var secret = options.webtaskSecret(ctx, req);
    if (!secret) {
        return error({
            code: 400,
            message: 'The webtask secret must be provided to allow for validating apiKeys.'
        }, res);
    }

    try {
        ctx.user = req.user = require('jsonwebtoken').verify(apiKey, secret);
    }
    catch (e) {
        return options.loginError({
            code: 401,
            message: 'Unauthorized.',
            error: e.message
        }, ctx, req, res, routingInfo.baseUrl);       
    }

    ctx.apiKey = apiKey;

    // Authorize

    if  (options.authorized && !options.authorized(ctx, req)) {
        return options.loginError({
            code: 403,
            message: 'Forbidden.'
        }, ctx, req, res, routingInfo.baseUrl);        
    }

    // Route request to webtask code

    return webtask(ctx, req, res);
};
