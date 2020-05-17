var express = require("express");
var router = express.Router();
let Doctor = require("../Models/doctorModel.js");
var { _, addToast } = require("./toasts.js");

const adminType = "DOCTOR";

router.get("/login", function (req, res) {
	res.render("./Doctor/login.html");
});

router.get("/signup", function (req, res) {
	res.render("./Doctor/signup.html");
});

router.get("/", function (req, res) {
	res.send("Doctor");
});
module.exports = router;
