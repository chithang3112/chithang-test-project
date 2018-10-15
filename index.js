const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';
let http = require('http');
let express = require('express');

// Load client secrets from a local file.
fs.readFile('credentialsDrive.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), doAction);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
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
function doAction(auth) {
    const drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
    'name': 'テストファイル',
    'mimeType': 'application/vnd.google-apps.spreadsheet',
    'parents': ['1sIP-Vlh8aFX5Zoo0PAlKfATvtHap1D6V']
  };
  drive.files.copy({
    resource: fileMetadata,
    fileId: '1Fo1B0kpVMdkyo2eemSv_bUwWX_LM3KdpeNkj4kyeDTk'
  }, function (err, file) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      console.log(file.data.id);
      var params = {
         fileId : file.data.id,
      }
      // Load client secrets from a local file.
      fs.readFile('credentialsSpreadSheet.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Sheets API.
        authorizeSpreadSheet(JSON.parse(content), spreadSheetAction,params);
      });
    }
  });
}


// note
// テンプレートファイルID
// 要件定義書 ID-1Fo1B0kpVMdkyo2eemSv_bUwWX_LM3KdpeNkj4kyeDTk
// テスト仕様書 ID-1lW6aFgshlIKnHfZ1AvmhdWvOS8c7Y67it5IYC_t7yrc

//1D-b1Wbt0fsP_JkGqm-mamMO93iB_qFX8

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
function spreadSheetAction(auth , params) {
  const sheets = google.sheets({version: 'v4', auth});
  spreadsheetId = params.fileId;
  var resource = {
    values : [
      ["aaaaaaaabb"]
    ]
  }
  sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'C20:M30',
    valueInputOption : "USER_ENTERED",
    resource : resource,
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
  });
}