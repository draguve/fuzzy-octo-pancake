var express = require("express");
var router = express.Router();
let Customer = require("../Models/customerModel.js");
let Admin = require("../Models/adminModel.js");
let Doctor = require("../Models/doctorModel.js");
var { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");
let mongoose = require("mongoose");

//to get the profile image
var gravatar = require("gravatar");

const USERTYPE = "CUSTOMER";

router.get("/login", function (req, res, next) {
	try {
		res.render("./Customer/login.html");
	} catch (err) {
		next(err);
	}
});

router.get("/signup", function (req, res, next) {
	try {
		res.render("./Customer/signup.html");
	} catch (err) {
		next(err);
	}
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
	async (req, res, next) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/login");
		}
		try {
			var doc = await Customer.findOne({ email: req.body.email });
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
			next(err);
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
		check("name")
			.isLength({ min: 4 })
			.withMessage("Name needs to longer than 4 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
	],
	async (req, res, next) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/signup");
		}
		try {
			var doc = await Customer.find({ email: req.body.email });
			if (doc.length > 0) {
				addToast("Email ID already in use", req);
				return res.render("./Customer/signup.html");
			}
			let customer = new Customer({
				email: req.body.email,
				name: req.body.name,
			});
			customer.setPassword(req.body.password);
			await customer.save();
			addToast("New Customer Added Added", req);
			res.redirect(req.baseUrl + "/login");
		} catch (err) {
			next(err);
		}
	}
);

router.get("/logout", function (req, res, next) {
	try {
		req.session.email = "";
		req.session.userType = [];
		req.hospitalName = "";
		res.redirect(req.baseUrl + "/login");
	} catch (err) {
		next(err);
	}
});

function checkLogin(req, res, next) {
	//check login here
	if (req.session.email && req.session.userType.includes(USERTYPE)) {
		next();
	} else {
		return res.redirect(req.baseUrl + "/login");
	}
}

//removed login check for now
//router.use(checkLogin);

router.get("/", async (req, res, next) => {
	res.render("./test.html");
});

router.get("/search", async (req, res, next) => {
	//TODO : Remove doctors from search which are not verified
	try {
		if (req.query.q) {
			var results = Admin.search({
				query_string: {
					query: req.query.q,
				},
			});
			var results2 = Doctor.search({
				query_string: {
					query: req.query.q,
				},
			});
			results = await results;
			results2 = await results2;
			var hits = results.hits.hits;
			hits = hits.concat(results2.hits.hits);
			hits.sort((a, b) => b._score - a._score).reverse();
			res.render("./Customer/search.html", {
				hits: hits,
				gravatar: gravatar.url,
			});
		} else {
			var query = {
				location: {
					$near: {
						$geometry: {
							type: "Point",
							coordinates: [-73.9667, 40.78],
						},
						//$maxDistance: 5000,
					},
				},
			};
			var hospitals = await Admin.find(query);
			console.log(hospitals);
			res.render("./Customer/search.html");
		}
	} catch (err) {
		next(err);
	}
});

router.get("/book", async (req, res, next) => {
	try {
		res.render("./Customer/book.html");
	} catch (err) {
		next(err);
	}
});

module.exports = router;
