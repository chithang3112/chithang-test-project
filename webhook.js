let path = require('path');
let fs = require('fs');
let http = require('http');
let express = require('express');

var app = express();
var httpServer = http.createServer(app);
//webhook作成
app.get('/',function(req, res){
    res.redirect('/login');
});