module.exports = function (err, res) {
    res.writeHead(err.code || 500, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(err));
};
