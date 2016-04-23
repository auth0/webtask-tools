var url = require('url');
var error = require('./error');
var handleAppEndpoint = require('./appEndpointHandler');
var handleLogin = require('./loginHandler');
var handleCallback = require('./callbackHandler');

module.exports = function (options) {
    if (typeof this !== 'function' || this.length !== 3) {
        throw new Error('The auth0() function can only be called on webtask functions with the (ctx, req, res) signature.');
    }
    if (!options) {
        options = {};
    }
    if (typeof options !== 'object') {
        throw new Error('The options parameter must be an object.');
    }
    if (options.scope && typeof options.scope !== 'string') {
        throw new Error('The scope option, if specified, must be a string.');
    }
    if (options.authorized && ['string','function'].indexOf(typeof options.authorized) < 0 && !Array.isArray(options.authorized)) {
        throw new Error('The authorized option, if specified, must be a string or array of strings with e-mail or domain names, or a function that accepts (ctx, req) and returns boolean.');
    }
    if (options.clientId && typeof options.clientId !== 'function') {
        throw new Error('The clientId option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Client ID.');
    }
    if (options.clientSecret && typeof options.clientSecret !== 'function') {
        throw new Error('The clientSecret option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Client Secret.');
    }
    if (options.domain && typeof options.domain !== 'function') {
        throw new Error('The domain option, if specified, must be a function that accepts (ctx, req) and returns an Auth0 Domain.');
    }
    if (options.webtaskSecret && typeof options.webtaskSecret !== 'function') {
        throw new Error('The webtaskSecret option, if specified, must be a function that accepts (ctx, req) and returns a key to be used to sign issued JWT tokens.');
    }
    if (options.getApiKey && typeof options.getApiKey !== 'function') {
        throw new Error('The getApiKey option, if specified, must be a function that accepts (ctx, req) and returns an apiKey associated with the request.');
    }
    if (options.loginSuccess && typeof options.loginSuccess !== 'function') {
        throw new Error('The loginSuccess option, if specified, must be a function that accepts (ctx, req, res, baseUrl) and generates a response.');
    }
    if (options.loginError && typeof options.loginError !== 'function') {
        throw new Error('The loginError option, if specified, must be a function that accepts (error, ctx, req, res, baseUrl) and generates a response.');
    }

    options.clientId = options.clientId || function (ctx, req) {
        return ctx.secrets.AUTH0_CLIENT_ID;
    };
    options.clientSecret = options.clientSecret || function (ctx, req) {
        return ctx.secrets.AUTH0_CLIENT_SECRET;
    };
    options.domain = options.domain || function (ctx, req) {
        return ctx.secrets.AUTH0_DOMAIN;
    };
    options.webtaskSecret = options.webtaskSecret || function (ctx, req) {
        // By default we don't expect developers to specify WEBTASK_SECRET when
        // creating authenticated webtasks. In this case we will use webtask token
        // itself as a JWT signing key. The webtask token of a named webtask is secret
        // and it contains enough entropy (jti, iat, ca) to pass
        // for a symmetric key. Using webtask token ensures that the JWT signing secret 
        // remains constant for the lifetime of the webtask; however regenerating 
        // the webtask will invalidate previously issued JWTs. 
        return ctx.secrets.WEBTASK_SECRET || req.x_wt.token;
    };
    options.getApiKey = options.getApiKey || function (ctx, req) {
        if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
            return req.headers.authorization.split(' ')[1];
        } else if (req.query && req.query.apiKey) {
            return req.query.apiKey;
        }
        return null;
    };
    options.loginSuccess = options.loginSuccess || function (ctx, req, res, baseUrl) {
        res.writeHead(302, { Location: baseUrl + '?apiKey=' + ctx.apiKey });
        return res.end();
    };
    options.loginError = options.loginError || function (error, ctx, req, res, baseUrl) {
        if (req.method === 'GET') {
            if (error.redirect) {
                res.writeHead(302, { Location: error.redirect });
                return res.end(JSON.stringify(error));
            }
            res.writeHead(error.code || 401, { 
                'Content-Type': 'text/html', 
                'Cache-Control': 'no-cache' 
            });
            return res.end(getNotAuthorizedHtml(baseUrl + '/login'));
        }
        else {
            // Reject all other requests
            return error(error, res);
        }            
    };
    if (typeof options.authorized === 'string') {
        options.authorized = [ options.authorized ];
    }
    if (Array.isArray(options.authorized)) {
        var authorized = [];
        options.authorized.forEach(function (a) {
            authorized.push(a.toLowerCase());
        });
        options.authorized = function (ctx, res) {
            if (ctx.user.email_verified) {
                for (var i = 0; i < authorized.length; i++) {
                    var email = ctx.user.email.toLowerCase();
                    if (email === authorized[i] || authorized[i][0] === '@' && email.indexOf(authorized[i]) > 1) {
                        return true;
                    }
                }
            }
            return false;
        }
    }

    return createAuthenticatedWebtask(this, options);
};

function createAuthenticatedWebtask(webtask, options) {

    // Inject middleware into the HTTP pipeline before the webtask handler
    // to implement authentication endpoints and perform authentication 
    // and authorization.

    return function (ctx, req, res) {
        if (!req.x_wt.jtn || !req.x_wt.container) {
            return error({
                code: 400,
                message: 'Auth0 authentication can only be used with named webtasks.'
            }, res);
        }

        var routingInfo = getRoutingInfo(req);
        if (!routingInfo) {
            return error({
                code: 400,
                message: 'Error processing request URL path.'
            }, res);
        }
        switch (req.method === 'GET' && routingInfo.appPath) {
            case '/login': handleLogin(options, ctx, req, res, routingInfo); break;
            case '/callback': handleCallback(options, ctx, req, res, routingInfo); break;
            default: handleAppEndpoint(webtask, options, ctx, req, res, routingInfo); break;
        };
        return;
    };
}

function getRoutingInfo(req) {
    var routingInfo = url.parse(req.url, true);
    var segments = routingInfo.pathname.split('/');
    if (segments[1] === 'api' && segments[2] === 'run' && segments[3] === req.x_wt.container && segments[4] === req.x_wt.jtn) {
        // Shared domain case: /api/run/{container}/{jtn}
        routingInfo.basePath = segments.splice(0, 5).join('/');
    }
    else if (segments[1] === req.x_wt.container && segments[2] === req.x_wt.jtn) {
        // Custom domain case: /{container}/{jtn}
        routingInfo.basePath = segments.splice(0, 3).join('/');
    }
    else {
        return null;
    }
    routingInfo.appPath = '/' + segments.join('/');
    routingInfo.baseUrl = [
        req.headers['x-forwarded-proto'] || 'https',
        '://',
        req.headers.host,
        routingInfo.basePath
    ].join('');
    return routingInfo;
}

var notAuthorizedTemplate = function () {/*
<!DOCTYPE html5>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <link href="https://cdn.auth0.com/styleguide/latest/index.css" rel="stylesheet" />
    <title>Access denied</title>
  </head>
  <body>
    <div class="container">
      <div class="row text-center">
        <h1><a href="https://auth0.com" title="Go to Auth0!"><img src="https://cdn.auth0.com/styleguide/1.0.0/img/badge.svg" alt="Auth0 badge" /></a></h1>
        <h1>Not authorized</h1>
        <p><a href="##">Try again</a></p>
      </div>
    </div>
  </body>
</html>
*/}.toString().match(/[^]*\/\*([^]*)\*\/\s*\}$/)[1];

function getNotAuthorizedHtml(loginUrl) {
    return notAuthorizedTemplate.replace('##', loginUrl);
}
