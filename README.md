# Usage

This module contains helper functions to convert common http(s) servers
to functions suitable for running in a webtask.

### Example

This example shows how you can transform an entire express server into a
function suitable for using in a webtask.

**webtask.js**

```javascript
var Express = require('express');
var Webtask = require('webtask-tools');
var server = Express();

server.use(require('body-parser'));

// Create
server.post('/', function (req, res) {
    createInMongo(req.webtaskContext.data.MONGO_URL, req.body, function (err, data) {
        if (err) return res.status(500).send("Error creating record.");
        
        res.json(data);
    });
});

// Read
server.get('/', function (req, res) {
    fetchDataFromMongo(req.webtaskContext.data.MONGO_URL, function (err, data) {
        if (err) return res.status(500).send("Error reading record.");
        
        res.json(data);
    });
});

// Update
server.put('/', function (req, res) {
    updateInMongo(req.webtaskContext.data.MONGO_URL, req.body, function (err, data) {
        if (err) return res.status(500).send("Error updating record.");
        
        res.json(data);
    });
});

// Delete
server.del('/', function (req, res) {
    removeFromMongo(req.webtaskContext.data.MONGO_URL, function (err, data) {
        if (err) return res.status(500).send("Error removing record.");
        
        res.json(data);
    });
});

// Expose this express server as a webtask-compatible function

module.exports = Webtask.fromExpress(server);
```

# API

## Runner.fromConnect(connectServer)

*Alias: `Runner.fromExpress`*

Returns a function that will inject a single request into the supplied server
with the 3-argument webtask signature:

```javascript
function (context, req, res) {}
```

The webtask `context` object will be available as `req.webtaskContext` from
within route handlers.


## Runner.fromServer(httpServer)

*Alias: `Runner.fromRestify`*

Returns a function that will inject a single request into the supplied server
with the 3-argument webtask signature:

```javascript
function (context, req, res) {}
```

The webtask `context` object will be available as `req.webtaskContext` from
within route handlers.

## Runner.fromHapi(hapiServer)

Returns a function that will inject a single request into the supplied server
with the 3-argument webtask signature:

```javascript
function (context, req, res) {}
```

The webtask `context` object will be available as `request.webtaskContext` from
within route handlers.

## Issue Reporting

If you have found a bug or if you have a feature request, please report them at this repository issues section. Please do not report security vulnerabilities on the public GitHub issue tracker. The [Responsible Disclosure Program](https://auth0.com/whitehat) details the procedure for disclosing security issues.

## Author

[Auth0](auth0.com)

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
