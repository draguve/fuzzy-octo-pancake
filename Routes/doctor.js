var express = require("express");
var router = express.Router();
let Doctor = require("../Models/doctorModel.js");
let Admin = require("../Models/adminModel.js");
var { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");
var gravatar = require("gravatar");
var { joinSession, removeFromSession } = require("./Utils/openvidu.js");

const USERTYPE = "DOCTOR";

router.get("/login", function (req, res, next) {
	try {
		res.render("./Doctor/login.html");
	} catch (err) {
		next(err);
	}
});

router.get("/signup", async (req, res, next) => {
	try {
		let result = await Admin.find({});
		let hospitals = [];
		for (let i = 0; i < result.length; i++) {
			hospitals.push({ id: result[i]._id, name: result[i].hospName });
		}
		return res.render("./Doctor/signup.html", { hospitals: hospitals });
	} catch (err) {
		next(err);
	}
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
		check("hospital").trim().not().isEmpty(),
		check("empid").trim().not().isEmpty(),
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
	],
	async (req, res, next) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/signup");
		}
		//check if not already present
		try {
			let result = await Doctor.find({ email: req.body.email });
			if (result.length > 0) {
				addToast("Email already in use", req);
				return res.redirect(req.baseUrl + "/signup");
			}
			let hospital = await Admin.findById(req.body.hospital);
			if (!hospital) {
				addToast("Not a valid hostital", req);
				return res.redirect(req.baseUrl + "/signup");
			}
			let langs = [];
			if (req.body.language) {
				langs = langs.concat(req.body.language);
			}
			let doctor = new Doctor({
				name: req.body.name,
				email: req.body.email,
				designation: req.body.designation,
				department: req.body.department,
				speciality: req.body.speciality || "",
				hospital: hospital._id,
				languages: langs,
				employeeID: req.body.empid,
				verified: false,
				pricePerSession: hospital.defaultPricePerSession,
			});
			doctor.setPassword(req.body.password);
			doctor = await doctor.save();
			hospital.unverified.push(doctor._id);
			await hospital.save();
			addToast("Added new doctor", req);
			return res.redirect(req.baseUrl + "/login");
		} catch (err) {
			next(err);
		}
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
	async (req, res, next) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/login");
		}
		try {
			var doc = await Doctor.findOne({ email: req.body.email });
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
					req.session.name = doc.name;
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

router.get("/logout", function (req, res, next) {
	try {
		req.session.email = "";
		req.session.userType = [];
		req.session.name = "";
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
		name: req.session.name,
	};
	return renderer;
}

router.get("/", function (req, res, next) {
	try {
		return res.render("./Doctor/settings.html", {
			sidebar: getSidebar(req),
		});
	} catch (err) {
		next(err);
	}
});

router.get("/createsession", async (req, res, next) => {
	try {
		res.render("./Doctor/createsession.html", { sidebar: getSidebar(req) });
	} catch (error) {
		next(error);
	}
});

router.post("/createsession", async (req, res, next) => {
	try {
		var token = await joinSession("draguve", req.session.email);
		console.log(token);
		var render = {
			sidebar: getSidebar(req),
			token: token,
			sessionName: "Draguve",
			username: req.session.email,
			nickname: req.session.name,
		};
		res.render("./Doctor/video.html", render);
	} catch (error) {
		next(error);
	}
});

module.exports = router;
