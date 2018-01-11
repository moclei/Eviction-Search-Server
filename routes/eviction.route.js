var express = require('express');
var router = express.Router();
/**
 * Created by moclei on 5/27/17.
 */
var fs = require('fs');
var readline = require('readline');
//var google = require('googleapis');
var googleAuth = require('google-auth-library');

var Evictions = require('../models/eviction.model');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/script-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/script.external_request'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'script-nodejs-quickstart.json';
var EVICTIONS = 'empty';


/* GET evictions page. */
router.get('/', function (req, res, next) {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Apps Script Execution API.
        authorize(JSON.parse(content), callAppsScript, res)
    });
});

/* GET evictions page. */
router.post('/', function (req, res, next) {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Apps Script Execution API.
        authorize(JSON.parse(content), callAppsScript, res, req.body)
    });
});



/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, res, body) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        }
        else if(token.length== 0){
            console.log('token = undefined');
            getNewToken(oauth2Client, callback);
        }
        else {
           console.log('token: ' +token + ', token.length: ' +token.length);
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client, res, body);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Call an Apps Script function to list the folders in the user's root
 * Drive folder.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function callAppsScript(auth, res, body) {
    console.log("callAppsScript");
    var scriptId = 'M46_MhwZO32oKzM-nlOrco1RLchR5zaYm';
    var script = google.script('v1');

    console.log("callAppsScript. body = " + body );

    var defendantFirstName = "Juan";
    var defendantLastName = "Torres";
    var soundexCheck = false;

/*
    var defendantFirstName = body.defendantFirstName;
    var defendantLastName = body.defendantLastName;
    var soundexCheck = body.soundexCheck;
*/

    // Make the API request. The request object is included here as 'resource'.
    script.scripts.run({
        auth: auth,
        resource: {
            function: 'testReadEvictionRecords',
            parameters: [
                defendantFirstName,
                defendantLastName,
                soundexCheck
            ],
        },
        scriptId: scriptId
    }, function(err, resp) {
        if (err) {
            // The API encountered a problem before the script started executing.
            console.log('The API returned an error: ' + err);
            return;
        }
        if (resp.error) {
            // The API executed, but the script returned an error.

            // Extract the first (and only) set of error details. The values of this
            // object are the script's 'errorMessage' and 'errorType', and an array
            // of stack trace elements.
            var error = resp.error.details[0];
            console.log('Script error message: ' + error.errorMessage);
            console.log('Script error stacktrace:');

            if (error.scriptStackTraceElements) {
                // There may not be a stacktrace if the script didn't start executing.
                for (var i = 0; i < error.scriptStackTraceElements.length; i++) {
                    var trace = error.scriptStackTraceElements[i];
                    console.log('\t%s: %s', trace.function, trace.lineNumber);
                }
            }
        } else {
            // The structure of the result will depend upon what the Apps Script
            // function returns. Here, the function returns an Apps Script Object
            // with String keys and values, and so the result is treated as a
            // Node.js object (folderSet).
            //console.log("quickstart.js, callAppsScript, resp.response.result = " + resp.response.result);
            //EVICTIONS = resp.response.result;
            res.status(200).json({
                message: 'Success',
                obj: resp.response.result.evictions
            });
            /*
             var folderSet = resp.response.result;
             if (Object.keys(folderSet).length == 0) {
             console.log('No folders returned!');
             } else {
             console.log('Folders under your root folder:');
             Object.keys(folderSet).forEach(function(id){
             console.log('\t%s (%s)', folderSet[id], id);
             });
             }*/
        }

    });
}

module.exports = router;
