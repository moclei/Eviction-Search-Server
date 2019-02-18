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
    database: 'myevictionsschema',
    googlePassword: 'zhnefeilusczeusx'
};

if (config.get('INSTANCE_CONNECTION_NAME') && config.get('NODE_ENV') === 'production') {
    options.socketPath = "cloudsql/${config.get('INSTANCE_CONNECTION_NAME')}";
}

const connection = mysql.createConnection(options);
router.use(bodyParser.json());

//Send email
router.post('/', function (req, res, next) {
    console.log("eviction.email.route -> router.post -> messageData received. Attempting to process." );
    sendEmail(req.body, (err, successMessage) => {
        if (err) {
            next(err);
            return res.send('error: ' + error);
        }
        res.json({
            returnMessage: successMessage
        });
    });
});

function sendEmail(messageData, cb){
    console.log('* [example 1.1] sending test email');
    // Require'ing module and setting default options
    var name = messageData.contactName;
    var message = messageData.contactMessage;
    var email = messageData.contactEmail;
    var phone = messageData.contactPhone;

    var htmlBody = '<p>Hi ' + name + '</p>';
    htmlBody += '<p>Thank you for your enquiry</p>';
    htmlBody += '<p>Someone from our team will get back to you as soon as possible</p>';
    htmlBody += '<p>Regards,</p>';
    htmlBody += '<p>The Bexar County Evictions Search Team</p>';

    var teamBody = '<p>You have a new Evictions enquiry from:  ' + name + '</p>';
    teamBody += '<p>Their question is: '+ message +'</p>';
    teamBody += '<p>Their email is: ' + email + '</p>';
    teamBody += '<p>Their phone is: ' + phone + '</p>';
    teamBody += '<p>Regards,</p>';
    teamBody += '<p>The Bexar County Evictions Search Team</p>';


    var send = require('gmail-send')({
        user: 'marc.ocleirigh@gmail.com',
        pass: options.googlePassword,
        to:   email,
        from: 'Bexar County Evictions Search',
        // from:    credentials.user
        // from: by default equals to user
        // replyTo: credentials.user
        // replyTo: by default undefined
        subject: 'Your Bexar County Evictions question',
        text:    'Hi ' + name + ',\n\n Thank you for your enquiry. ' +
            'We will get back to you as soon as ' +
            'possible.\n\n The Bexar County ' +
            'Eviction Search Team.',
        // Plain text
        html:    htmlBody            // HTML
    });

    console.log('* Sending email to user');
    send({}, function (err, res) {
        console.log('* Sending email to user. send() callback returned: err:', err, '; res:', res);
    });

    // Set additional file properties
    console.log('* Sending email to team');
    send({to:'marc.ocleirigh@gmail.com', subject: 'You have a new enquiry regarding Evictions',
    body: 'Their name is: ' + name, html: teamBody}, function (err, res) {
        console.log('* Sending email to team. send() callback returned: err:', err, '; res:', res);
    });
    cb(null, 'message sent');
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
    return this.getUTCFullYear() + "-"
        + twoDigits(1 + this.getUTCMonth()) + "-"
        + twoDigits(this.getUTCDate()) + " "
        + twoDigits(this.getUTCHours()) + ":"
        + twoDigits(this.getUTCMinutes()) + ":"
        + twoDigits(this.getUTCSeconds());
};

module.exports = router;
