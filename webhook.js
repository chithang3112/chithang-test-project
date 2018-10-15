let path = require('path');
let fs = require('fs');
let http = require('http');
let express = require('express');

let PORT = process.env.PORT || 80;

var app = express();
var httpServer = http.createServer(app);
//webhook作成
app.post('/webhook',function(req, res){
    var headers = {
        'Content-Type': 'application/json',
    }
    var body = {
    }
    var url = 'https://shou-web-hook.herokuapp.com/index';
    request({
        url: url,
        method: 'POST',
        headers: headers,
        body: body,
        json: true
    });
    res.status(200).end();
});
app.get('/webhook',function(req, res){
	res.status(200).end();
});

httpServer.listen(PORT, () => console.log('Running!!! Listenning on ' + PORT));