let path = require('path');
let fs = require('fs');
let http = require('http');
let express = require('express');
var request = require('request');
const readline = require('readline');
const {google} = require('googleapis');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';
let PORT = process.env.PORT || 80;

var app = express();
var httpServer = http.createServer(app);
var projectList = ['JM1','JM2','LC','LW1','LW2','LW3','P-MOVIE'];

//webhook作成

app.post('/update-issue-backlog',function(req, res){
var defaultUrl = 'https://esk-sys.backlog.jp/api/v2/';
// var action = 'issues/LW3_SHUKAN-2152'
var params = '';
// var params = '';
var uri = defaultUrl + process.env.ACTIVITY_ACTION +'?apiKey='+process.env.API_KEY+params;
var options = {
  uri: uri,
  headers: {
  },
};
request.get(options, function(error, response, body){
	// console.log(JSON.parse(body)[0].content.id);
	let issueId = JSON.parse(body)[0].content.id;
	action = 'issues/'+issueId;
	uri = defaultUrl + action +'?apiKey='+process.env.API_KEY+params;
	options = {
	  uri: uri,
	  headers: {
	  },
	};
	request.get(options, function(error, response, body){
		// console.log(JSON.parse(body));
		var summary = JSON.parse(body).summary;
		if(JSON.parse(body).hasOwnProperty('assignee')){
			if(JSON.parse(body).assignee != null){
	        	var username = JSON.parse(body).assignee.name;
	    	}
	    }else{
	    	username = '';
	    }
		
		var projectName = summary.substring(
		    summary.lastIndexOf("[") + 1, 
		    summary.lastIndexOf("]")
		);
		var dueDate = summary.substring(
		    summary.lastIndexOf("【") + 4, 
		    summary.lastIndexOf("】")
		);
		var title = summary.substring(
		    summary.lastIndexOf("】") + 1
		);
		var description = JSON.parse(body).description;
		for (var i = 0; i < projectList.length; i++) { 
		    var num = projectName.search(projectList[i]);
		    if(num != -1){
		    	if(dueDate !== ''){
		    		dueDate = dueDate.substr(0, 4) + '/' + dueDate.substr(4);
		    		var releaseDate = dueDate.substr(0, 7) + '/' + dueDate.substr(7);
		    		backlogApiParams = [projectList[i],releaseDate,username,title];
		    		var params = {
		    			detail : backlogApiParams,
		    			description : description,
		    		}
				  	if(username == 'チータン'){
				    	// Load client secrets from a local file.
						fs.readFile('credentialsDrive.json', (err, content) => {
						  if (err) return console.log('Error loading client secret file:', err);
						  // Authorize a client with credentials, then call the Google Drive API.
						  	authorize(JSON.parse(content), doAction , params);
						});
					}
		    	}
		    }
		}
	});
});



/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback , params) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client,params);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function doAction(auth,params) {
	var parentId = process.env.DRIVE_FOLDER;
	var counter = 0;
	createFolder(auth,params,parentId,counter);
}
function createFolder(auth,params,parentId,counter){
	const drive = google.drive({version: 'v3', auth});
	drive.files.list({
		q: 'mimeType = "application/vnd.google-apps.folder" and parents = "' + parentId + '"',
	}, function (err, res) {
		if (err) {
		  	// Handle error
		  	console.error(err);
		} else {
			var driveListFolder = res.data.files;
			var targetDriveId = '';
			for (var i = 0; i < driveListFolder.length; i++) {
				if(driveListFolder[i].name == params.detail[counter]){
					// access to this folder
					targetDriveId = driveListFolder[i].id;
					if (counter > 2) {
						excelProcessAction(auth,targetDriveId,params);
					}else{
						counter++;
						createFolder(auth,params,targetDriveId,counter);
					};
				}
			}
			if (targetDriveId ==='') {
				//create folder
				var fileMetadata = {
				    'name': params.detail[counter],
				    'mimeType' : 'application/vnd.google-apps.folder',
				    'parents' : [parentId],
				};
				drive.files.create({
					resource: fileMetadata,
				}, function (err, res) {
					if (err) {
					  	// Handle error
					  	console.error(err);
					} else {
						targetDriveId = res.data.id;
						if (counter > 2) {
							excelProcessAction(auth,targetDriveId);
						}else{
							counter++;
							createFolder(auth,params,targetDriveId,counter);
						};
					}
				});
			}
		}
	});
}
//backlog API kZzCDStci3DETl1yaWoEWY9YWTnptueBwzv8mOdnccoAdLoR3pj47datZ2R51K5p

function excelProcessAction(auth,id,params){
	var description = params.description;
	var detail = params.detail;
	const drive = google.drive({version: 'v3', auth});

	// 要件定義書コード
	drive.files.list({
		q: 'mimeType = "application/vnd.google-apps.spreadsheet" and parents = "' + id + '" and name ="要件定義書"',
	}, function (err, res) {
		if (err) {
		  	// Handle error
		  	console.error(err);
		} else {
			var driveListFolder = res.data.files;
			if(driveListFolder.length>0){
		      	var params = {
		         	fileId : driveListFolder[0].id,
		         	description : description,
		         	detail : detail,
		      	}
				findOrCreateSpreadSheetYouKen(params)
			}else{
			  	var fileMetadata = {
				    'name': '要件定義書',
				    'mimeType': 'application/vnd.google-apps.spreadsheet',
				    'parents': [id]
			  	};
			  	drive.files.copy({
			    	resource: fileMetadata,
			    	fileId: '1Fo1B0kpVMdkyo2eemSv_bUwWX_LM3KdpeNkj4kyeDTk'
			  	}, function (err, file) {
			    if (err) {
			      // Handle error
			      console.error(err);
			    } else {
			      	var params = {
			         	fileId : file.data.id,
			         	description : description,
			         	detail : detail,
			      	}
			      	findOrCreateSpreadSheetYouKen(params)
			    }
			  });
			}
		}
	});

	// 要件定義書コード
	drive.files.list({
		q: 'mimeType = "application/vnd.google-apps.spreadsheet" and parents = "' + id + '" and name ="総合テスト仕様書"',
	}, function (err, res) {
		if (err) {
		  	// Handle error
		  	console.error(err);
		} else {
			var driveListFolder = res.data.files;
			if(driveListFolder.length>0){
		      	var params = {
		         	fileId : driveListFolder[0].id,
		         	description : description,
		         	detail : detail,
		      	}
				findOrCreateSpreadSheetTestShiyou(params)
			}else{
			  	var fileMetadata = {
				    'name': '総合テスト仕様書',
				    'mimeType': 'application/vnd.google-apps.spreadsheet',
				    'parents': [id]
			  	};
			  	drive.files.copy({
			    	resource: fileMetadata,
			    	fileId: '1lW6aFgshlIKnHfZ1AvmhdWvOS8c7Y67it5IYC_t7yrc'
			  	}, function (err, file) {
			    if (err) {
			      // Handle error
			      console.error(err);
			    } else {
			      	var params = {
			         	fileId : file.data.id,
			         	description : description,
			         	detail : detail,
			      	}
			      	findOrCreateSpreadSheetTestShiyou(params)
			    }
			  });
			}
		}
	});
}

function findOrCreateSpreadSheetYouKen(params){
	// Load client secrets from a local file.
  	fs.readFile('credentialsSpreadSheet.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorizeSpreadSheet(JSON.parse(content), spreadSheetActionYouKen,params);
  	});
}

function findOrCreateSpreadSheetTestShiyou(params){
	// Load client secrets from a local file.
  	fs.readFile('credentialsSpreadSheet.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorizeSpreadSheet(JSON.parse(content), spreadSheetActionTestShiyou,params);
  	});
}

// note
// テンプレートファイルID
// 要件定義書 ID-1Fo1B0kpVMdkyo2eemSv_bUwWX_LM3KdpeNkj4kyeDTk
// テスト仕様書 ID-1lW6aFgshlIKnHfZ1AvmhdWvOS8c7Y67it5IYC_t7yrc

// If modifying these scopes, delete token.json.
const SPREAD_SHEET_SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREAD_SHEET_TOKEN_PATH = 'tokenSpread.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorizeSpreadSheet(credentials, callback , params) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(SPREAD_SHEET_TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client , params);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SPREAD_SHEET_SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(SPREAD_SHEET_TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', SPREAD_SHEET_TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function spreadSheetActionYouKen(auth , params) {
	const sheets = google.sheets({version: 'v4', auth});
	//要件定義書
  	spreadsheetId = params.fileId;
	var description = params.description;
	var detail = params.detail;
	//　担当者を書く
	var tantousha = detail[2];
	var tantoushaRange = 'AZ1:BI1';
  	var tantoushaResource = {
	    values : [
	      [tantousha]
	    ]
  	}
	sheets.spreadsheets.values.update({
	    spreadsheetId: spreadsheetId,
	    range: tantoushaRange,
	    valueInputOption : "USER_ENTERED",
	    resource : tantoushaResource,
  	}, (err, res) => {
	    if (err) return console.log('The API returned an error: ' + err);
  	});
  	//　タイトルを書く
	var title = detail[3];
	var titleRange = 'E3:E3';
  	var titleResource = {
	    values : [
	      [title]
	    ]
  	}
	sheets.spreadsheets.values.update({
	    spreadsheetId: spreadsheetId,
	    range: titleRange,
	    valueInputOption : "USER_ENTERED",
	    resource : titleResource,
  	}, (err, res) => {
	    if (err) return console.log('The API returned an error: ' + err);
  	});
	// 背景を書く
	var haikei = description.match(/# 背景\n([^]*?)\n#/i)[1];
	var haikeiRange = 'N7:W19';
  	var haikeiResource = {
	    values : [
	      [haikei]
	    ]
  	}
  	sheets.spreadsheets.values.update({
	    spreadsheetId: spreadsheetId,
	    range: haikeiRange,
	    valueInputOption : "USER_ENTERED",
	    resource : haikeiResource,
  	}, (err, res) => {
	    if (err) return console.log('The API returned an error: ' + err);
  	});
	// 目的を書く
	var mokuteki = description.match(/# 目的\n([^]*?)\n#/i)[1];
	var mokutekiRange = 'C7:M19';
  	var mokutekiResource = {
	    values : [
	      [mokuteki]
	    ]
  	}
  	sheets.spreadsheets.values.update({
	    spreadsheetId: spreadsheetId,
	    range: mokutekiRange,
	    valueInputOption : "USER_ENTERED",
	    resource : mokutekiResource,
  	}, (err, res) => {
	    if (err) return console.log('The API returned an error: ' + err);
  	});
	// 修正方針を書く
	var shuuseihoushin = description.match(/# 修正方針\n([^]*?)\n#/i)[1];
	var shuuseihoushinRange = 'x7:AF19';
  	var shuuseihoushinResource = {
	    values : [
	      [shuuseihoushin]
	    ]
  	}
  	sheets.spreadsheets.values.update({
	    spreadsheetId: spreadsheetId,
	    range: shuuseihoushinRange,
	    valueInputOption : "USER_ENTERED",
	    resource : shuuseihoushinResource,
  	}, (err, res) => {
	    if (err) return console.log('The API returned an error: ' + err);
  	});
}

function spreadSheetActionTestShiyou(auth , params) {
	const sheets = google.sheets({version: 'v4', auth});
}
});
httpServer.listen(PORT, () => console.log('Running!!! Listenning on ' + PORT));