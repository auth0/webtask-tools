module.exports = function (options, ctx, req) {
    var authParams = {
        clientId: options.clientId(ctx, req),
        domain: options.domain(ctx, req),
        clientSecret: options.clientSecret(ctx, req),
        secretEncoding: options.secretEncoding(ctx, req)
    };
    var count = !!authParams.clientId + !!authParams.domain + !!authParams.clientSecret + !!authParams.secretEncoding;
    return count === 4 ? authParams : null;
};
