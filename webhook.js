let path = require('path');
let fs = require('fs');
let http = require('http');
let express = require('express');
var request = require('request');

let PORT = process.env.PORT || 80;

var app = express();
var httpServer = http.createServer(app);
//webhook作成

app.post('/update-issue-backlog',function(req, res){
	var apiKey = 'kZzCDStci3DETl1yaWoEWY9YWTnptueBwzv8mOdnccoAdLoR3pj47datZ2R51K5p';
	var defaultUrl = 'https://esk-sys.backlog.jp/api/v2/';
	// var action = 'issues/LW3_SHUKAN-2152'
	var action = 'projects/CHITHANG_TEST_PROJECT/activities';
	var params = '';
	// var params = '';
	var uri = defaultUrl + action +'?apiKey='+apiKey+params;
	var options = {
	  uri: uri,
	  headers: {
	  },
	};
	request.get(options, function(error, response, body){
		console.log(body);
	});
});
httpServer.listen(PORT, () => console.log('Running!!! Listenning on ' + PORT));