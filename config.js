'use strict';

// Hierarchical node.js configuration with command-line arguments, environment
// variables, and files.
const nconf = module.exports = require('nconf');
const path = require('path');

nconf
// 1. Command-line arguments
    .argv()
    // 2. Environment variables
    .env([
        'DATA_BACKEND',
        'GCLOUD_PROJECT',
        'INSTANCE_CONNECTION_NAME',
        'MYSQL_USER',
        'MYSQL_PASSWORD',
        'NODE_ENV',
        'PORT'
    ])
    .file({ file: path.join(__dirname, 'config.json') })
    // 4. Defaults
    .defaults({
        DATA_BACKEND: 'cloudsql',
        GCLOUD_PROJECT: '',
        MYSQL_USER: 'marc',
        MYSQL_PASSWORD: 'avatar',
        NODE_ENV: 'production',
        PORT: 8080
    });

// Check for required settings
checkConfig('GCLOUD_PROJECT');

if (nconf.get('DATA_BACKEND') === 'cloudsql') {
    checkConfig('MYSQL_USER');
    checkConfig('MYSQL_PASSWORD');
    if (nconf.get('NODE_ENV') === 'production') {
        checkConfig('INSTANCE_CONNECTION_NAME');
    }
}

function checkConfig (setting) {
    if (!nconf.get(setting)) {
        throw new Error(`You must set ${setting} as an environment variable or in config.json!`);
    }
}