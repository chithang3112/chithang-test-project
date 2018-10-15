let path = require('path');
let fs = require('fs');
let http = require('http');

var request = require('request');
var apiKey = 'kZzCDStci3DETl1yaWoEWY9YWTnptueBwzv8mOdnccoAdLoR3pj47datZ2R51K5p';
var defaultUrl = 'https://esk-sys.backlog.jp/api/v2/';
// var action = 'issues/LW3_SHUKAN-2152'
var action = 'users';
// var params = '&projectId[]=73975';
var params = '';
var uri = defaultUrl + action +'?apiKey='+apiKey+params;
var options = {
  uri: uri,
  headers: {
  },
};
request.get(options, function(error, response, body){
	console.log(body);
});

//backlog API kZzCDStci3DETl1yaWoEWY9YWTnptueBwzv8mOdnccoAdLoR3pj47datZ2R51K5p
// example link https://xx.backlogtool.com/api/v2/users/myself?apiKey=abcdefghijklmn 