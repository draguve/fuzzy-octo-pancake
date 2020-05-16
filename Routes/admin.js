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

router.get('/login', function(req, res) {
    res.render('./Admin/login.html');
});

router.get('/signup', function(req, res) {
    res.render('./Admin/signup.html');
});

function checkLogin(req, res, next) {
    //check login here
    if (true) {
        res.redirect('/login');
    }
    next();
}

module.exports = router;