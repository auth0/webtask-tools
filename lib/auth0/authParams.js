module.exports = function (options, ctx, req) {
    var authParams = {
        clientId: options.clientId(ctx, req),
        domain: options.domain(ctx, req),
        clientSecret: options.clientSecret(ctx, req)
    };
    var count = !!authParams.clientId + !!authParams.domain + !!authParams.clientSecret;
    return count === 3 ? authParams : null;
};
