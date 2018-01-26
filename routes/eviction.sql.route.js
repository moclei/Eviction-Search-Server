
/**
 * Created by moclei on 5/27/17.
 */


const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
// const extend = require('lodash').assign;
const mysql = require('mysql');
const config = require('../config');
// const fs = require('fs');
// const readline = require('readline');

// const Evictions = require('../models/eviction.model');

const options = {
    user: config.get('MYSQL_USER'),
    password: config.get('MYSQL_PASSWORD'),
    database: 'myevictionsschema'
};

if (config.get('INSTANCE_CONNECTION_NAME') && config.get('NODE_ENV') === 'production') {
    console.log("eviction.sql.route.js -> config.get(instance connection name): "+config.get('INSTANCE_CONNECTION_NAME'));
    options.socketPath = "/cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}";
}

const connection = mysql.createConnection(options);
console.log("eviction.sql.route.js ->connectionCreated");

// Automatically parse request body as JSON
router.use(bodyParser.json());

/**
 * GET /evictions
 *
 * Retrieve most recent record
 */
router.get('/', (req, res, next) => {
    /** @namespace req.query.pageToken */
    /*
    list(10, req.query.pageToken, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        res.json({
            items: entities,
            nextPageToken: cursor
        });
    });
    */
    getMostRecent((err, entities)=> {
        if (err) {
            next(err);
            return;
        }
        res.json({
            items: entities
        });
    });
});

/**
 * Search evictions
 */
router.post('/', function (req, res, next) {
    /** @namespace req.body.defendantFirstName */
    /** @namespace req.body.defendantLastName */
    /** @namespace req.body.soundexCheck */
    /** @namespace req.body.isDebug */
    /** @namespace req.body.useFilings */
    /** @namespace req.body.useJudgments */
    let firstName = req.body.defendantFirstName;
    let lastName = req.body.defendantLastName;
    let soundex = req.body.soundexCheck;
    let isDebug = req.body.isDebug;
    let useFilings = req.body.useFilings;
    let useJudgments = req.body.useJudgments;
    console.log("eviction.sql.route -> router.post -> firstName = " + firstName
        + ", lastName = " + lastName
        + ", soundex = " + soundex
        + ", useFilings = " + useFilings
        + ", useJudgments = " + useJudgments);

    search(firstName, lastName, soundex, isDebug, useFilings, useJudgments, (err, entities, cursor) => {
        if (err) {
            next(err);
            return;
        }
        res.json({
            items: entities,
            nextPageToken: cursor
        });
    });
});

router.delete('/', function (req, res, next) {
    console.log("eviction.sql.route -> router.delete");
    deleteDebug((err, results) => {
        if (err) {
            console.log("router.delete-> error: " + err);
            next(err);
            return;
        }
        res.json({
            message: results
        });
    });
});

// [START deleteDebug]
function deleteDebug (cb) {
    console.log("eviction.sql.route -> deleteDebug()");
    connection.query(
        "DELETE FROM `judgementsandfilings` WHERE ev_added_date > '2018-01-01'",
        (err, results) => {
            if (err) {
                cb(err);
                return;
            }
            console.log("eviction.sql.route.js -> results: " + results);
            cb(null, results);
        }
    );
}
// [END deleteDebug]

// [START list]
function list (limit, token, cb) {
    console.log("eviction.sql.route.js -> list()");
    token = token ? parseInt(token, 10) : 0;
    connection.query(
        "SELECT * FROM `judgementsandfilings` WHERE DefendantFirstName = ? AND DefendantLastName = ?", ["Juan", "Ibarra"],
        (err, results) => {
            if (err) {
                cb(err);
                return;
            }
            const hasMore = results.length === limit ? token + results.length : false;
            cb(null, results, hasMore);
        }
    );
}
// [END list]

// [START search]
function search (firstName, lastName, soundex, isDebug, useFilings, useJudgments, cb) {
    console.log("eviction.sql.route -> search()");
    let finalQuery = '';
    let queryString = "SELECT * FROM `judgementsandfilings` WHERE ";
    let soundexQueryExt = " SoundexDefFirstName = ? AND SoundexDefLastName = ? ";
    let specificQueryExt = " DefendantFirstName = ? AND DefendantLastName = ? ";
    let filingsOnlyQueryExt = " AND DispositionAmount < 0";
    let judgmentsOnlyQueryExt = " AND DispositionAmount > -1";
    finalQuery = queryString;
    if(isDebug){
        connection.query(
            "SELECT * FROM `judgementsandfilings` WHERE ev_added_date > '2018-01-01'",
            (err, results) => {
                if (err) {
                    cb(err);
                    return;
                }
                console.log("eviction.sql.route.js -> results: " + results);
                cb(null, results);
            }
        );
    }
    else{
        if(soundex){
            finalQuery += soundexQueryExt;
            if(useFilings && !useJudgments){
                finalQuery += filingsOnlyQueryExt;
                console.log('eviction.sql.route.js -> search() with soundex, useFilingsOnly');
            }
            else if(useJudgments && !useFilings){
                finalQuery += judgmentsOnlyQueryExt;
                console.log('eviction.sql.route.js -> search() with soundex, useJudgmentsOnly');
            }
            // Old query: "SELECT * FROM `judgementsandfilings` WHERE SoundexDefFirstName = ? AND SoundexDefLastName = ?"
            console.log("eviction.sql.route.js -> submitting query to database");
            connection.query(finalQuery, [convertToSoundex(firstName), convertToSoundex(lastName)],
                (err, results) => {
                    if (err) {
                        console.log("eviction.sql.route.js -> err: " + err);
                        cb(err);
                        return;
                    }
                    cb(null, results);
                });
        }
        else{
            finalQuery += specificQueryExt;
            if(useFilings && !useJudgments){
                console.log('eviction.sql.route.js -> search() without soundex, useFilingsOnly');
                finalQuery += filingsOnlyQueryExt;
            }
            else if(useJudgments && !useFilings){
                console.log('eviction.sql.route.js -> search() without soundex, useJudgementsOnly');
                finalQuery += judgmentsOnlyQueryExt;
            }
            console.log("eviction.sql.route.js -> search() without soundex");
            // Old query string: "SELECT * FROM `judgementsandfilings` WHERE DefendantFirstName = ? AND DefendantLastName = ?"
            connection.query(finalQuery, [firstName, lastName],
                (err, results) => {
                    if (err) {
                        cb(err);
                        console.log("eviction.sql.route.js -> search() without soundex -> there was an error: " +  err);
                        return;
                    }
                    cb(null, results);
                });
        }
    }

}
// [END search]

/*
// [START search]
function search (firstName, lastName, soundex, isDebug, cb) {
    console.log("eviction.sql.route -> search()");
    if(isDebug){
        connection.query(
            // "SELECT * FROM `judgementsandfilings` WHERE ev_is_debug = true",
            "SELECT * FROM `judgementsandfilings` WHERE CaseFileDate > '2017-01-01'",
            (err, results) => {
            if (err) {
                cb(err);
                return;
            }
            console.log("eviction.sql.route.js -> results: " + results);
        cb(null, results);
    }
    );
    }
    else{
        if(soundex){
            // console.log("eviction.sql.route.js -> whatevs");
            // whatevs(firstName);
            // console.log("eviction.sql.route.js -> whatevs over");
            // soundex(firstName);
            console.log("eviction.sql.route.js -> submitting query to database");
            //token = token ? parseInt(token, 10) : 0;
            connection.query(
                "SELECT * FROM `judgementsandfilings` WHERE SoundexDefFirstName = ? AND SoundexDefLastName = ?", [convertToSoundex(firstName), convertToSoundex(lastName)],
                (err, results) => {
                if (err) {
                    cb(err);
                    return;
                }
                console.log("eviction.sql.route.js -> results: " + results);
            cb(null, results);
        }
        );
        }
        else{
            console.log("eviction.sql.route.js -> search() without soundex");
            //token = token ? parseInt(token, 10) : 0;
            connection.query(
                "SELECT * FROM `judgementsandfilings` WHERE DefendantFirstName = ? AND DefendantLastName = ?", [firstName, lastName],
                (err, results) => {
                if (err) {
                    cb(err);
                    console.log("eviction.sql.route.js -> search() without soundex -> there was an error: " +  err);
                    return;
                }
                //console.log("eviction.sql.route.js -> results: " + results);
                cb(null, results);
        }
        );
        }
    }

}
// [END search]
*/
// [START search]
function getMostRecent(cb) {
    console.log("eviction.sql.route.js -> getMostRecent()");
    connection.query(
        "SELECT * FROM `judgementsandfilings` ORDER BY ev_added_date DESC LIMIT 1",
        (err, results) => {
            if (err) {
                console.log("eviction.sql.route.js -> getMostRecent() -> err: " + err);
                cb(err);
                return;
            }
            cb(null, results);
        }
    );
}
// [END search]

function convertToSoundex(s_src){
    console.log("soundex");
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
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};


module.exports = router;
