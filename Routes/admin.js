var express = require("express");
var router = express.Router();
let Admin = require("../Models/adminModel.js");
var { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");

const adminType = "ADMIN";

router.get("/login", function (req, res) {
	res.render("./Admin/login.html");
});

router.get("/signup", function (req, res) {
	res.render("./Admin/signup.html");
});

router.post(
	"/login",
	[
		check("email")
			.isEmail()
			.withMessage("Please put in a valid email")
			.trim()
			.escape()
			.not()
			.isEmpty(),
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
		Admin.findOne({ email: req.body.email })
			.then((doc) => {
				if (doc) {
					if (doc.validPassword(req.body.password)) {
						if (
							req.session.userType &&
							req.session.email == doc.email
						) {
							req.session.userType.push(adminType);
						} else {
							req.session.userType = [adminType];
						}
						req.session.email = doc.email;

						res.redirect(req.baseUrl + "/");
					} else {
						addToast("Incorrect Password", req);
						res.render("./Admin/login.html");
					}
				} else {
					addToast("User with email id doesn't exist", req);
					res.render("./Admin/login.html");
				}
			})
			.catch((err) => {
				console.error(err);
			});
	}
);

router.post(
	"/signup",
	[
		check("email")
			.isEmail()
			.withMessage("Please put in a valid email")
			.not()
			.trim()
			.escape()
			.isEmpty(),
		check("password")
			.isLength({ min: 8 })
			.withMessage("Password needs be longer than 8 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
		check("hospitalName")
			.isLength({ min: 4 })
			.withMessage("Hospital Name needs to longer than 4 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
	],
	function (req, res) {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/signup");
		}
		Admin.find({ email: req.body.email })
			.then((doc) => {
				if (doc.length > 0) {
					var refilData = {
						hospitalName: req.body.hospitalName,
					};
					addToast("Email ID already in use", req);
					return res.render("./Admin/signup.html", refilData);
				}
				let admin = new Admin({
					email: req.body.email,
					hospName: req.body.hospitalName,
				});
				admin.setPassword(req.body.password);
				admin
					.save()
					.then(() => {
						addToast("New Hospital Added", req);
						res.redirect(req.baseUrl + "/login");
					})
					.catch((err) => {
						console.error(err);
					});
			})
			.catch((err) => {
				console.error(err);
			});
	}
);

router.get("/logout", function (req, res) {
	req.session.email = "";
	req.session.userType = [];
	res.redirect(req.baseUrl + "/login");
});

function checkLogin(req, res, next) {
	//check login here
	if (req.session.email && req.session.userType.includes(adminType)) {
		next();
	} else {
		return res.redirect(req.baseUrl + "/login");
	}
}

router.use(checkLogin);

router.get("/", function (req, res) {
	res.render("./Defaults/dashboard.html");
});

module.exports = router;
