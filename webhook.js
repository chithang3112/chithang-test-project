let path = require('path');
let fs = require('fs');
let http = require('http');
let express = require('express');
var request = require('request');

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

	var apiKey = 'kZzCDStci3DETl1yaWoEWY9YWTnptueBwzv8mOdnccoAdLoR3pj47datZ2R51K5p';
	var defaultUrl = 'https://esk-sys.backlog.jp/api/v2/';
	// var action = 'issues/LW3_SHUKAN-2152'
	var action = 'users';
	// var params = '&projectId[]=73975';
	var params = '';
	var url = defaultUrl + action +'?apiKey='+apiKey+params;

    // var url = 'https://shou-web-hook.herokuapp.com/index';
    request({
        url: url,
        method: 'POST',
        headers: headers,
        body: body,
        json: true
    });
    res.status(200).end();
    console.log(res);
});
httpServer.listen(PORT, () => console.log('Running!!! Listenning on ' + PORT));