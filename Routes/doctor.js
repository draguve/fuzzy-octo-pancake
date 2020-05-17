var express = require("express");
var router = express.Router();
let Doctor = require("../Models/doctorModel.js");
let Admin = require("../Models/adminModel.js");
var { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");

const adminType = "DOCTOR";

router.get("/login", function (req, res) {
	res.render("./Doctor/login.html");
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

router.post(
	"/signup",
	[
		check("name")
			.isLength({ min: 3 })
			.withMessage("Name needs to be longer than 3 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
		check("email")
			.isEmail()
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please input a valid email")
			.normalizeEmail(),
		check("designation").trim().escape().not().isEmpty(),
		check("department").trim().escape().not().isEmpty(),
		check("hospital").trim().escape().not().isEmpty(),
		check("password")
			.isLength({ min: 8 })
			.withMessage("Password needs be longer than 8 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
	],
	function (req, res) {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/signup");
		}
		res.send("todo");
	}
);

router.post(
	"/login",
	[
		check("email")
			.isEmail()
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please input a valid email")
			.normalizeEmail(),
		check("password")
			.isLength({ min: 8 })
			.withMessage("Password needs be longer than 8 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
	],
	function (req, res) {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/login");
		}
		res.send("todo");
	}
);

router.get("/", function (req, res) {
	res.send("Doctor");
});
module.exports = router;
