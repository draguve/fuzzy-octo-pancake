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

router.get("/login", function(req, res, next) {
	try {
		res.render("./Admin/login.html");
	} catch (err) {
		next(err);
	}
});

router.get("/signup", function(req, res, next) {
	try {
		res.render("./Admin/signup.html");
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
			.isEmpty()
	],
	async (req, res, next) => {
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
		check("hospitalName")
			.isLength({ min: 4 })
			.withMessage("Hospital Name needs to longer than 4 characters")
			.trim()
			.escape()
			.not()
			.isEmpty(),
		check("address1")
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please add the address"),
		check("state")
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please add the state"),
		check("zip")
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please add the zip code"),
		check("city")
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please add the city"),
		check("country")
			.trim()
			.escape()
			.not()
			.isEmpty()
			.withMessage("Please select a country"),
		check("lat")
			.not()
			.isEmpty()
			.isNumeric()
			.withMessage("Please select a location"),
		check("lng")
			.not()
			.isEmpty()
			.isNumeric()
			.withMessage("Please select a location")
	],
	async (req, res, next) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/signup");
		}
		//return res.redirect(req.baseUrl + "/signup");
		try {
			var doc = await Admin.find({ email: req.body.email });
			if (doc.length > 0) {
				var refilData = {
					hospitalName: req.body.hospitalName
				};
				addToast("Email ID already in use", req);
				return res.render("./Admin/signup.html", refilData);
			}
			if (!req.body.address2) {
				req.body.address2 = "";
			}
			let admin = new Admin({
				email: req.body.email,
				hospName: req.body.hospitalName,
				address: {
					address1: req.body.address1,
					address2: req.body.address2,
					city: req.body.city,
					state: req.body.state,
					zip: req.body.zip,
					country: req.body.country
				},
				location: {
					type: "Point",
					coordinates: [req.body.lat, req.body.lng]
				},
				defaultPricePerSession: 500
			});
			admin.setPassword(req.body.password);
			await admin.save();
			addToast("New Hospital Added", req);
			res.redirect(req.baseUrl + "/login");
		} catch (err) {
			next(err);
		}
	}
);

router.get("/logout", function(req, res, next) {
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

router.use(checkLogin);

function getSidebar(req) {
	var renderer = {
		gravatar: gravatar.url(
			req.session.email,
			{
				s: "200",
				r: "g",
				d: "identicon"
			},
			true
		),
		email: req.session.email,
		hospitalName: req.session.hospitalName
	};
	return renderer;
}

router.get("/unverified", async (req, res, next) => {
	try {
		let result = await Admin.findOne({ email: req.session.email });
		let unverified = [];
		for (let i = 0; i < result.unverified.length; i++) {
			unverified.push(mongoose.Types.ObjectId(result.unverified[i]));
		}
		unverified = await Doctor.find({ _id: { $in: unverified } });
		let nunjuck = { sidebar: getSidebar(req), unverified: unverified };
		return res.render("./Admin/unverified.html", nunjuck);
	} catch (err) {
		next(err);
	}
});

router.get("/", async (req, res, next) => {
	try {
		let result = await Admin.findOne({ email: req.session.email });
		let doctors = [];
		for (let i = 0; i < result.doctors.length; i++) {
			doctors.push(mongoose.Types.ObjectId(result.doctors[i]));
		}
		doctors = await Doctor.find({ _id: { $in: doctors } });
		let nunjuck = { sidebar: getSidebar(req), doctors: doctors };
		return res.render("./Admin/doctors.html", nunjuck);
	} catch (err) {
		next(err);
	}
});

router.post("/unverified", async (req, res, next) => {
	try {
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
									hospital.defaultPricePerSession
							}
						}
					}
				});
			} else {
				next(new Error("Couldn't find the id"));
			}
		}
		await Doctor.bulkWrite(bulk);
		await hospital.save();

		//Sync cuz bulk write doesnt
		Doctor.synchronize({ hospital: hospital._id });
		addToast("Verified Doctors", req);
		return res.redirect(req.baseUrl + "/unverified");
	} catch (err) {
		next(err);
	}
});

router.get("/doctors/:doctor", async (req, res, next) => {
	try {
		let doctor = mongoose.Types.ObjectId(req.params.doctor);
		//check if the doctor is under this admin
		let check = await Admin.find({
			email: req.session.email,
			$or: [{ unverified: doctor }, { doctors: doctor }]
		});
		if (check.length == 0) {
			res.status(404);
			next(new Error("Couldn't find the doctor"));
		}
		let result = await Doctor.findById(doctor);
		result.gravatar = gravatar.url(
			result.email,
			{
				s: "200",
				r: "g",
				d: "identicon"
			},
			true
		);
		result.sidebar = getSidebar(req);
		return res.render("./Admin/doctor.html", result);
	} catch (err) {
		next(err);
	}
});

router.get("/settings", async (req, res, next) => {
	try {
		var data = await Admin.findOne({ email: req.session.email });
		data.sidebar = getSidebar(req);
		res.render("./Admin/settings.html", data);
	} catch (err) {
		next(err);
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
			.withMessage("Please input a valid number")
	],
	async (req, res, next) => {
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
			next(err);
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
			})
	],
	async (req, res, next) => {
		try {
			if (validateToast(req)) {
				return res.redirect(req.baseUrl + "/settings");
			}
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
			next(err);
		}
	}
);

router.get("/info", async (req, res, next) => {
	try {
		let data = await Admin.findOne({ email: req.session.email });
		data.sidebar = getSidebar(req);
		res.render("./Admin/info.html", data);
	} catch (err) {
		next(err);
	}
});

router.post("/info", [
	check("about")
		.trim()
		.escape(),
	check("phone")
		.trim()
		.escape()], async (req, res, next) => {
	try {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/info");
		}
		let data = await Admin.findOne({ email: req.session.email });
		data.about = req.body.about;
		data.phone = req.body.phone;
		await data.save();
		data.sidebar = getSidebar(req);
		res.render("./Admin/info.html", data);
	} catch (err) {
		next(err);
	}
});

module.exports = router;

// router.get("/thing", async (req, res, next) => {
// 	try {
// 		//https://stackoverflow.com/questions/35612428/call-async-await-functions-in-parallel
// 		var results = Admin.search({
// 			query_string: {
// 				query: "punjab",
// 			},
// 		});
// 		var results2 = Doctor.search({
// 			query_string: {
// 				query: "gmail.com",
// 			},
// 		});
// 		results = await results;
// 		results2 = await results2;
// 		var hits = [];
// 		hits.push(results.hits.hits);
// 		hits.push(results2.hits.hits);
// 		hits.sort((a, b) => b._score - a._score).reverse();
// 		res.send(hits);
// 	} catch (err) {
// 		next(err);
// 	}
// });
