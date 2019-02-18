/**
 * Created by moclei on 5/27/17.
 */
const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const config = require('../config');

const options = {
    user: config.get('MYSQL_USER'),
    password: config.get('MYSQL_PASSWORD'),
    database: 'myevictionsschema'
};

if (config.get('INSTANCE_CONNECTION_NAME') && config.get('NODE_ENV') === 'production') {
    const connName = config.get('INSTANCE_CONNECTION_NAME');
    const connBase = "/cloudsql/";
    const connString = connBase + connName;
    options.socketPath = connString;
}

console.log("eviction.upload.route.js -> mysql.createConnection(options); creating")
const connection = mysql.createConnection(options);
console.log("eviction.upload.route.js -> mysql.createConnection(options); created");
router.use(bodyParser.json());

//Insert evictions
router.post('/', function (req, res, next) {
    /** @namespace req.body.sheetData */
    let sheetData = req.body.sheetData;
    console.log("eviction.upload.sql.route -> router.post -> sheetData received. Attempting to process." );

    uploadEvictionSheet(sheetData, (err, successMessage, cursor) => {
        if (err) {
            next(err);
            return res.send('error: ' + error);
        }
        res.json({
            items: successMessage,
            nextPageToken: cursor
        });
    });
});

function convertToSoundex(s_src){
    // console.log("soundex");
    let s_rez = "0000" ;
    let new_code, prev, idx;

    let a_codes = { "bfpv": 1, "cgjkqsxz":2, "dt": 3, "l": 4, "mn": 5, "r": 6 };
    s_src = s_src.toLowerCase().replace(/ /g,"");

    if ( s_src.length < 1) {
        return(s_rez);
    }
    s_rez = s_src.substr(0,1);
    prev = "0";
    for ( idx = 1 ; idx < s_src.length ; idx++) {
        new_code = "0";
        let cur_char = s_src.substr(idx,1);

        for (let s_code in a_codes)
            if (s_code.indexOf(cur_char) >= 0)
            { new_code = a_codes[ s_code ] ; break ; }

        if (new_code !== prev && new_code !== "0" )  {
            s_rez += new_code;
        }

        prev = new_code;
    }
    s_rez = s_rez + "0000";
    return s_rez.substr(0,4);
}

function uploadEvictionSheet(sheetData, cb){

    let addedDate = new Date();
    // let jdbcDateAdded = Jdbc.newDate(addedDate);
    console.log("uploadJudgementSheet: number source objects to add: "  + sheetData.length);
    var records = [];
    let stmtStr = 'INSERT INTO `judgementsandfilings` '
        + '(Defendant, DefendantAddress, DefendantCity, ' +
        'DefendantState, DefendantZIP, DefendantDOB, ' +
        'PlaintiffName, PlaintiffAddress, PlaintiffCity, ' +
        'PlaintiffState, '
        + ' PlaintiffZIP, PlaintiffPhone, PlaintiffCorp, ' +
        'CaseFileDate, CaseNumber, CaseStatusCD, CaseStatus, ' +
        'CaseTypeDescription, DispositionDate, DispositionAmount, '
        + ' Disposition, PersonAliasID, DefendantFirstName, ' +
        'DefendantLastName, SoundexDefFirstName, SoundexDefLastName, ' +
        'ev_added_date, ev_is_debug, ev_is_writ) '
        + ' VALUES ?';

    for(let i=2;i<sheetData.length;i++){

        // console.log("iterating through sheetData. On item: "  + i);
        let data = sheetData[i];
        let caseNumber = data[0];
        // console.log("caseNumber was: " + caseNumber)
        if(typeof caseNumber !== 'undefined' && caseNumber) {

            let caseFileDate = data[1];
            let corp = data[2];
            let plaintiff = data[3];
            let personAliasId = data[4];
            let plaintiffPhone = data[5];
            let plaintiffAddress = data[6];
            let plCity = data[7];
            let plState = data[8];
            let plZip = data[9];
            let defendantAddress = data[10];
            let cityName = data[11];
            let stateCd = data[12];
            let postalCd = data[13];
            let defendant = data[14];
            let caseStatusCd = data[15];
            let caseStatus = data[16];
            let dispositionDate = data[17];
            let dispAmt = data[18];
            let caseTypDesc = data[19];
            let disposition = data[20];
            let defDob = data[21];
            // console.log("Assigned all variables");
            // console.log("Created statement strings");

            let defDob_Date = null;
            if (defDob) {
                if (defDob.length === 8) {
                    defDob_Date = new Date(defDob.substring(4),
                        (parseInt(defDob.substring(0, 2), 10) - 1),
                        (defDob.substring(2, 4) + 1) );
                    // jdbcDefendantDOB = Jdbc.newDate(defDob_Date);
                }
                else {
                    defDob_Date = null;
                }
            }

            if (dispAmt === null || dispAmt.trim() === ''){
                dispAmt = -1;
            }
            // console.log("Created defendant dob");

            let caseFileDate_Date = new Date(caseFileDate);
            // let jdbcCaseFileDate = Jdbc.newDate(caseFileDate_Date);

            let dispositionDt_Date = new Date(dispositionDate);
            // let jdbcDispositionDt = Jdbc.newDate(dispositionDt_Date);
            // console.log("Created other dates");
            // console.log("Splitting names. Defendant Name: " + defendant);
            let defNameSplit = defendant.split(',');
            let defName1 = defNameSplit[0];
            // console.log("Split names");
            let hasLastName = false;
            let defName2, sDefName1, sDefName2;
            // console.log("Created defendant name: names split - number of names: " + defNameSplit.length);
            if (defNameSplit.length > 1) {
                defName1 = defNameSplit[1].trim();
                defName2 = defNameSplit[0].trim();
                // console.log("Created defendant name: before lastname soundex");
                sDefName2 = convertToSoundex(defName2);
                hasLastName = true;
            }
            if (!hasLastName) {
                defName2 = "";
                sDefName2 = "";
            }
            // console.log("Created defendant names");
            sDefName1 = convertToSoundex(defName1);
            // console.log("Prepared all statement values");
            let stmtVals = [defendant, defendantAddress, cityName, stateCd, postalCd, defDob_Date];
            // console.log("Connection put together. StmtStr = " + stmtStr + ", stmtVals = " + stmtVals);
            stmtVals.push(plaintiff, plaintiffAddress, plCity, plState, plZip,
                plaintiffPhone, corp, caseFileDate_Date, caseNumber, caseStatusCd,
                caseStatus, caseTypDesc, dispositionDt_Date, dispAmt,
                disposition, personAliasId, defName1, defName2, sDefName1, sDefName2,
                addedDate, true, false);

            records.push(stmtVals);
            // console.log("Connection put together. StmtStr = " + stmtStr + ", stmtVals = " + stmtVals);
           /*  connection.query(stmtStr, stmtVals,
                (err, results) => {
                    if (err) {
                        cb(err);
                        return;
                    }
                    cb(null, results);
                }
            );

            var query = connection.query(stmtStr, [records], function(err, result) {
                console.log(result);
            });

            connection.end(); */
            // console.log("Insert Query Complete ");
        }

    }

    connection.query(stmtStr, [records], function(err, result) {
        if (err) throw err;
        console.log('Insert query successful. Result: ' + result);
    });
    // console.log("End of upload");
   // return 'Items Uploaded';
}

/**
 * You first need to create a formatting function to pad numbers to two digits…
 **/
function twoDigits(d) {
    if(0 <= d && d < 10) return "0" + d.toString();
    if(-10 < d && d < 0) return "-0" + (-1*d).toString();
    return d.toString();
}

/**
 * …and then create the method to output the date string as desired.
 * Some people hate using prototypes this way, but if you are going
 * to apply this to more than one Date object, having it as a prototype
 * makes sense.
 **/
Date.prototype.toMysqlFormat = function() {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth())
        + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours())
        + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};

module.exports = router;
