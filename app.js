let path = require('path');
let fs = require('fs');
let http = require('http');

var request = require('request');
var apiKey = 'XzV6MVFO8WbDias9oRIv1mEhQmDy2Nc1wM1wIgMe9x5i37wexMgD0w1ChjhCRaFK';
var defaultUrl = 'https://shougenshi.backlogtool.com';
var action = '/api/v2/space/image';
var uri = defaultUrl + action + '?apiKey=' + apiKey;
var options = {
  uri: uri,
  headers: {
  },
};
request.get(options, function(error, response, body){
	console.log(response);
});