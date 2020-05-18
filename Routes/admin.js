var express = require("express");
var router = express.Router();
let Admin = require("../Models/adminModel.js");
let Doctor = require("../Models/doctorModel.js");
var { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");
let mongoose = require("mongoose");

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
				defaultPricePerSession: 500,
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

function getSidebar(req) {
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
	return renderer;
}

router.get("/", async (req, res) => {
	let result = await Admin.findOne({ email: req.session.email });
	let unverified = [];
	for (let i = 0; i < result.unverified.length; i++) {
		unverified.push(mongoose.Types.ObjectId(result.unverified[i]));
	}
	unverified = await Doctor.find({ _id: { $in: unverified } });
	let nunjuck = { sidebar: getSidebar(req), unverified: unverified };
	res.render("./Admin/unverified.html", nunjuck);
});

router.post("/verify", async (req, res) => {
	let hospital = await Admin.findOne({ email: req.session.email });
	let verified = [].concat(req.body.verify || []);
	let ids = [];
	let bulk = [];
	for (let i = 0; i < verified.length; i++) {
		ids.push(verified[i]);
		verified[i] = mongoose.Types.ObjectId(verified[i]);
		var index = hospital.unverified.indexOf(verified[i]);
		if (index > -1) {
			hospital.unverified.splice(index, 1);
			hospital.doctors.push(verified[i]);
			bulk.push({
				updateOne: {
					filter: { _id: verified[i] },
					update: {
						$set: {
							verified: true,
							pricePerSession:
								req.body[verified[i]] ||
								hospital.defaultPricePerSession,
						},
					},
				},
			});
		} else {
			//TODO: please get error handling done now
			return res.send("ERROR");
		}
	}
	await Doctor.bulkWrite(bulk);
	await hospital.save();
	addToast("Verified Doctors", req);
	return res.redirect(req.baseUrl + "/");
});

router.get("/doctors/:doctor", async (req, res) => {
	let doctor = mongoose.Types.ObjectId(req.params.doctor);
	//check if the doctor is under this admin
	let check = await Admin.find({
		email: req.session.email,
		$or: [{ unverified: doctor }, { doctors: doctor }],
	});
	if (check.length == 0) {
		// TODO: send error here
		return res.send("Error not found");
	}
	let result = await Doctor.findById(doctor);
	result.gravatar = gravatar.url(
		result.email,
		{
			s: "200",
			r: "g",
			d: "identicon",
		},
		true
	);
	result.sidebar = getSidebar(req);
	return res.render("./Admin/doctor.html", result);
});

router.get("/settings", async (req, res) => {
	try {
		var data = await Admin.findOne({ email: req.session.email });
		data.sidebar = getSidebar(req);
		res.render("./Admin/settings.html", data);
	} catch (err) {
		return res.send(err);
	}
});

router.post(
	"/settings",
	[
		check("hospitalName")
			.optional()
			.isLength({ min: 4 })
			.withMessage("Hospital Name needs to longer than 4 characters")
			.trim()
			.escape(),
		check("defaultPricePerSession")
			.optional()
			.isNumeric()
			.withMessage("Please input a valid number"),
	],
	async (req, res) => {
		try {
			let doc = await Admin.findOne({ email: req.session.email });
			doc.hospName = req.body.hospitalName || doc.hospName;
			doc.defaultPricePerSession =
				req.body.defaultPricePerSession || doc.defaultPricePerSession;
			await doc.save();
			req.session.hospitalName = doc.hospName;
			addToast("Settings updated", req);
			return res.redirect(req.baseUrl + "/settings");
		} catch (err) {
			return res.send(err);
		}
	}
);

router.post(
	"/changepassword",
	[
		check("oldPassword")
			.isLength({ min: 8 })
			.withMessage("Password needs be longer than 8 characters")
			.escape()
			.not()
			.isEmpty(),
		check("password")
			.isLength({ min: 8 })
			.withMessage("Password needs be longer than 8 characters")
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
	],
	async (req, res) => {
		try {
			let doc = await Admin.findOne({ email: req.session.email });
			if (!doc.validPassword(req.body.oldPassword)) {
				addToast("Old Password Incorrect", req);
				return res.redirect(req.baseUrl + "/settings");
			}
			doc.setPassword(req.body.password);
			await doc.save();
			addToast("Password Updated", req);
			return res.redirect(req.baseUrl + "/settings");
		} catch (err) {
			return res.send(err);
		}
	}
);

module.exports = router;
