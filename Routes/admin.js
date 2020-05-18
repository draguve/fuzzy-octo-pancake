var express = require("express");
var router = express.Router();
let Admin = require("../Models/adminModel.js");
var { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");
//to get the profile image
var gravatar = require("gravatar");

const USERTYPE = "ADMIN";

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
	async (req, res) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/login");
		}
		try {
			var doc = await Admin.findOne({ email: req.body.email });
			if (doc) {
				if (doc.validPassword(req.body.password)) {
					if (
						req.session.userType &&
						req.session.email == doc.email
					) {
						req.session.userType.push(USERTYPE);
					} else {
						req.session.userType = [USERTYPE];
					}
					req.session.email = doc.email;
					req.session.hospitalName = doc.hospName;
					res.redirect(req.baseUrl + "/");
				} else {
					addToast("Incorrect Password", req);
					return res.redirect(req.baseUrl + "/login");
				}
			} else {
				addToast("User with email id doesn't exist", req);
				return res.redirect(req.baseUrl + "/login");
			}
		} catch (err) {
			return res.send(err);
		}
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
			.isEmpty()
			.custom((value, { req, loc, path }) => {
				if (value !== req.body.confPassword) {
					// trow error if passwords do not match
					throw new Error("Passwords don't match");
				} else {
					return value;
				}
			}),
		check("hospitalName")
			.isLength({ min: 4 })
			.withMessage("Hospital Name needs to longer than 4 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
	],
	async (req, res) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/signup");
		}
		try {
			var doc = await Admin.find({ email: req.body.email });
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
			await admin.save();
			addToast("New Hospital Added", req);
			res.redirect(req.baseUrl + "/login");
		} catch (err) {
			return res.send(err);
		}
	}
);

router.get("/logout", function (req, res) {
	req.session.email = "";
	req.session.userType = [];
	req.hospitalName = "";
	res.redirect(req.baseUrl + "/login");
});

function checkLogin(req, res, next) {
	//check login here
	if (req.session.email && req.session.userType.includes(USERTYPE)) {
		next();
	} else {
		return res.redirect(req.baseUrl + "/login");
	}
}

router.use(checkLogin);

router.get("/", function (req, res) {
	var renderer = {
		gravatar: gravatar.url(
			req.session.email,
			{
				s: "200",
				r: "g",
				d: "identicon",
			},
			true
		),
		email: req.session.email,
		hospitalName: req.session.hospitalName,
	};
	res.render("./Admin/unverified.html", renderer);
});

module.exports = router;
