/**
 * Created by moclei on 5/28/17.
 */
var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
    res.render('index');
    /*Eviction.findByName("Joe", function(err, doc) {
        if (err) {
            return res.send('Error!');
        }

    });*/
});

module.exports = router;