var express = require('express');
var router = express.Router();
let EmailModel = require("../Models/email.js");

// define the home page route
router.get('/', function(req, res) {
    let msg = new EmailModel({
        email: 'ADA.LOVELACE@GMAIL.COM'
    });

    msg.save()
        .then(doc => {
            console.log(doc)
        })
        .catch(err => {
            console.error(err)
        });
    res.send("Admin");
});

router.get('/test', function(req, res) {
    EmailModel
        .find({})
        .then(doc => {
            console.log(doc);
        })
        .catch(err => {
            console.error(err);
        });
    res.send("Admin");
});

module.exports = router;