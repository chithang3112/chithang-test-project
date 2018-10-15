let path = require('path');
let fs = require('fs');
let http = require('http');
let express = require('express');

var app = express();
var httpServer = http.createServer(app);
//webhook作成
app.post('/webhook',function(req, res){
    var headers = {
        'Content-Type': 'application/json',
    }
    var body = {
    }
    var url = 'https://api.line.me/v2/bot/message/reply';
    request({
        url: url,
        method: 'POST',
        headers: headers,
        body: body,
        json: true
    });
    res.status(200).end();
});

httpServer.listen(PORT, () => console.log('Running!!! Listenning on ' + PORT));