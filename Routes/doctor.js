var express = require("express");
var router = express.Router();
let Doctor = require("../Models/doctorModel.js");
let Admin = require("../Models/adminModel.js");
var { _, addToast } = require("./toasts.js");

const adminType = "DOCTOR";

router.get("/login", function (req, res) {
	res.render("./Doctor/signup.html");
});

router.get("/signup", function (req, res) {
	Admin.find({})
		.then((result) => {
			let hospitals = [];
			for (let i = 0; i < result.length; i++) {
				hospitals.push({ id: result[i]._id, name: result[i].hospName });
			}
			return res.render("./Doctor/signup.html", { hospitals: hospitals });
		})
		.catch((err) => {
			return res.send(err);
		});
});

router.get("/", function (req, res) {
	res.send("Doctor");
});
module.exports = router;
