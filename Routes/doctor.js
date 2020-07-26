const express = require("express");
const router = express.Router();
const Doctor = require("../Models/doctorModel.js");
const Admin = require("../Models/adminModel.js");
const Booking = require("../Models/bookingModel.js");
const Customer = require("../Models/customerModel");
const { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");

const { joinSession, removeFromSession } = require("./Utils/openvidu.js");
const daysOfTheWeek = require("./Utils/date.js");
const mongoose = require("mongoose");
const spacetime = require("spacetime");

const path = require("path");
const upload = require("./Utils/upload");
const { promisify } = require("util");
const fs = require("fs");
const unlinkAsync = promisify(fs.unlink);

const Agenda = require("../Utils/agenda.js");

const USERTYPE = "DOCTOR";

router.get("/login", function(req, res, next) {
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
			})
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
				hospitalName: hospital.hospName,
				languages: langs,
				employeeID: req.body.empid,
				verified: false,
				pricePerSession: hospital.defaultPricePerSession
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
			.isEmpty()
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
						req.session.email === doc.email
					) {
						req.session.userType.push(USERTYPE);
					} else {
						req.session.userType = [USERTYPE];
					}
					req.session.email = doc.email;
					req.session.name = doc.name;

					//redirect to right location
					if (req.session.postLoginRedirect && req.session.postLoginRedirect !== "") {
						let url = req.session.postLoginRedirect;
						req.session.postLoginRedirect = "";
						return res.redirect(url);
					}
					return res.redirect(req.baseUrl + "/");

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

router.get("/logout", function(req, res, next) {
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
		addToast("Please login first , you will be redirected to the page after login", req);
		req.session.postLoginRedirect = req.originalUrl;
		return res.redirect(req.baseUrl + "/login");
	}
}

router.use(checkLogin);

function getSidebar(req) {
	return {
		email: req.session.email,
		name: req.session.name
	};
}

router.get("/", function(req, res, next) {
	try {
		return res.render("./Doctor/settings.html", {
			sidebar: getSidebar(req)
		});
	} catch (err) {
		next(err);
	}
});

router.get("/call", async (req, res, next) => {
	try {
		res.render("./Doctor/createsession.html", { sidebar: getSidebar(req) });
	} catch (error) {
		next(error);
	}
});

router.post("/call", async (req, res, next) => {
	try {
		var token = await joinSession(req.body.sessionName, req.session.email);
		var render = {
			sidebar: getSidebar(req),
			token: token,
			sessionName: req.body.sessionName,
			username: req.session.email,
			nickname: req.session.name
		};
		res.render("./Doctor/call.html", render);
	} catch (error) {
		next(error);
	}
});

router.get("/call/:id", async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({ _id: mongoose.Types.ObjectId(req.params.id) });
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let token = await joinSession(book._id.toString(), req.session.email);
		book.started = true;
		await book.save();
		let data = {
			sidebar: getSidebar(req),
			token: token,
			sessionName: book._id.toString(),
			username: req.session.email,
			nickname: req.session.name
		};
		return res.render("./Doctor/call.html", data);
	} catch (error) {
		next(error);
	}
});

router.post("/leave-call", async (req, res, next) => {
	try {
		if (req.body.sessionname.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({ _id: mongoose.Types.ObjectId(req.body.sessionname) });
		if (book === null) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		book.started = false;
		await book.save();
		await removeFromSession(req.body.sessionname, req.body.token);
		return res.redirect(req.baseUrl + "/");
	} catch (error) {
		next(error);
	}
});

router.get("/timings", async (req, res, next) => {
	try {
		var doc = await Doctor.findOne({ email: req.session.email }),
			timings = {};
		if (doc.timings) {
			if (doc.timings.start) {
				timings["start"] = doc.timings.start;
				timings["end"] = doc.timings.end;
			}
		}
		return res.render("./Doctor/time.html", {
			sidebar: getSidebar(req),
			timings: JSON.stringify(timings),
			workingDays: doc.workingDays,
			persession: doc.persession
		});
	} catch (err) {
		next(err);
	}
});

router.post(
	"/timings",
	[check("time").not().isEmpty()],
	async (req, res, next) => {
		try {
			if (validateToast(req)) {
				return res.redirect(req.baseUrl + "/timings");
			}
			var timeData = JSON.parse(req.body.time),
				startTime = new Date(timeData.start),
				endTime = new Date(timeData.end),
				workingDays = [];
			var persession = parseInt(req.body.persession, 10);
			if (persession <= 0) {
				addToast("Ensure time is non negative", req);
				return res.redirect(req.baseUrl + "/timings");
			}

			if (req.body.workingDays != undefined) {
				workingDays = workingDays.concat(req.body.workingDays);
			}

			if (endTime < startTime) {
				addToast("Ensure start time is before end time", req);
				return res.redirect(req.baseUrl + "/timings");
			}
			var doc = await Doctor.findOne({ email: req.session.email });
			doc.timings = {
				start: startTime,
				end: endTime
			};
			doc.timeZone = timeData.timeZone;

			var days = daysOfTheWeek();
			doc.persession = persession;

			for (var day of days) {
				if (workingDays.includes(day)) {
					doc.workingDays[day] = true;
				} else {
					doc.workingDays[day] = false;
				}
			}
			await doc.save();
			addToast("Consultation timings updated", req);

			return res.redirect(req.baseUrl + "/timings");
		} catch (err) {
			next(err);
		}
	}
);

router.get("/bookings", async (req, res, next) => {
	try {
		let doc = await Doctor.findOne({ email: req.session.email });
		if (!doc.timeZone || !doc.timings) {
			addToast("Please select timings before you can see bookings", req);
			return res.redirect(req.baseUrl + "/timings");
		}
		var current = spacetime.now(doc.timeZone).nearest("minute");
		var todayEnd = current
				.hour(doc.timings.end.getHours())
				.minute(doc.timings.end.getMinutes()),
			todayStart;
		//check if the counsultations for the day have ended or not
		if (current.isAfter(todayEnd)) {
			//today's sessions ended , move to next day
			todayEnd = todayEnd.add(1, "day");
			todayStart = todayEnd
				.hour(doc.timings.start.getHours())
				.minute(doc.timings.start.getMinutes());
		} else {
			//its a new day out there
			todayStart = todayEnd
				.hour(doc.timings.start.getHours())
				.minute(doc.timings.start.getMinutes());
		}

		var rotatedDays = daysOfTheWeek();
		//here i first find out the index of the today's day in the week, then rotate the array
		rotatedDays.rotateRight(
			rotatedDays.indexOf(todayStart.dayName().toLowerCase())
		);

		let startDate, endDate;

		let locations = [],
			i = 0;
		for (let day in rotatedDays) {
			//get the startTime of the first Date of the week
			if (!startDate) {
				startDate = todayStart.add(i, "days");
			}

			//get the endTime of the last day of the week
			//this should be the last one of the week right ??? at the end????
			endDate = todayEnd.add(i, "days");

			locations.push({
				id: rotatedDays[day],
				name: rotatedDays[day],
				order: day,
				userData: {
					startTime: todayStart
						.add(i, "days")
						.format("iso-utc"),
					endTime: todayEnd
						.add(i, "days")
						.format("iso-utc")
				}
			});

			i++;
		}

		let startTime, endTime;

		var bookings = await Booking.find({
			doctor: doc._id,
			start: {
				$gte: new Date(startDate.format("iso-utc")),
				$lt: new Date(endDate.format("iso-utc"))
			},
			canceled: { $exists: false }
		}).populate("customer");

		//calculate the start and the end of the tape
		for (let book of bookings) {
			let startTime = spacetime(book.start).goto(doc.timeZone);
			let endTime = spacetime(book.end).goto(doc.timeZone);
			if (endTime.hour() >= todayEnd.hour()) {
				if (endTime.minute() > todayEnd.minute()) {
					todayEnd = todayEnd.minute(endTime.minute());
				}
				todayEnd = todayEnd.hour(endTime.hour());
			}
			if (startTime.hour() <= todayStart.hour()) {
				todayStart = todayStart.hour(startTime.hour());
				if (endTime.minute() < todayEnd.minute()) {
					todayStart = todayStart.minute(startTime.minute());
				}
			}
		}

		let toSend = JSON.stringify({
			start: todayStart.format("iso-utc"),
			end: todayEnd.format("iso-utc"),
			locations: locations,
			bookings: bookings
		});

		return res.render("./Doctor/bookings.html", {
			sidebar: getSidebar(req),
			json: toSend,
			bookings: bookings
		});
	} catch (e) {
		next(e);
	}
});

//this is called when the doctor changes any booking timings from the booking page
router.post("/bookings", [check("data").not().isEmpty()], async (req, res, next) => {
	try {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/bookings");
		}
		let updated = JSON.parse(req.body.data);
		let doc = await Doctor.findOne({ email: req.session.email });
		let ids = Object.keys(updated);

		let searchStart, searchEnd;
		let current = new Date();

		let changed = [];
		let updated_old = await Booking.find({
			_id: { $in: ids },
			doctor: doc._id
		});
		for (let book of updated_old) {
			let value = updated[book._id];
			let start = new Date(value.start);
			let end = new Date(value.end);
			changed.push({
				_id: book._id,
				start: start,
				end: end
			});
			if (book.start < current || book.end < current) {
				addToast("Cannot move a booking already started or finished", req);
				return res.redirect(req.baseUrl + "/bookings");
			}
			if (searchStart > start || searchStart === undefined) {
				searchStart = start;
			}
			if (searchEnd < end || searchEnd === undefined) {
				searchEnd = end;
			}
		}

		//check if all the dates are in the future
		if (current > searchStart) {
			addToast("Cannot move a booking to behind current time", req);
			return res.redirect(req.baseUrl + "/bookings");
		}

		let bookings = await Booking.find({
			_id: { $not: { $in: ids } },
			doctor: doc._id,
			start: {
				$lt: searchEnd,
				$gte: searchStart
			},
			canceled: { $exists: false }
			//date length checks as well
		});
		bookings = bookings.concat(changed);

		bookings.sort(function(a, b) {
			return new Date(a.start) - new Date(b.start);
		});

		for (let i = 0; i < bookings.length - 1; i++) {
			let startA = bookings[i].start,
				endA = bookings[i].end,
				startB = bookings[i + 1].start,
				endB = bookings[i + 1].end;

			if ((startA < endB) && (startB < endA)) {
				addToast("there is a collision", req);
				return res.redirect(req.baseUrl + "/bookings");
			}
		}
		//everything checks out
		//check if the start date is too far from the original dates

		//bulk write change the start and end dates
		let bulk = [];
		for (let item of changed) {
			bulk.push({
				updateOne: {
					filter: { _id: mongoose.Types.ObjectId(item._id) },
					update: {
						$set: {
							start: item.start,
							end: item.end
						}
					}
				}
			});
		}
		await Booking.bulkWrite(bulk);
		for (let item of changed) {
			await Agenda.create("callNotification", { _id: mongoose.Types.ObjectId(item._id) })
				.unique({ "data._id": mongoose.Types.ObjectId(item._id) })
				.schedule(item.start).save();

			await Agenda.create("bookingTimeChanged", { _id: mongoose.Types.ObjectId(item._id) }).schedule(new Date()).save();
		}

		//sends notification to doctor&customer for the updates and update our future job system,
		addToast("Bookings Updated", req);
		return res.redirect(req.baseUrl + "/bookings");
	} catch (e) {
		next(e);
	}
});

router.get("/bookings/:id", async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }).populate("customer");
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let send = {
			sidebar: getSidebar(req),
			book: book
		};
		return res.render("./Doctor/booking_details.html", send);
	} catch (err) {
		next(err);
	}
});

router.get("/future-bookings", async (req, res, next) => {
	try {
		let page = 0;
		if (req.query.page) {
			page = parseInt(req.query.page);
		}
		let doc = await Doctor.findOne({ email: req.session.email });
		let future = await Booking.find({
			doctor: doc._id,
			start: {
				$gte: new Date()
			},
			canceled: { $exists: false }
			//date length checks as well
		}).sort({ "start": 1 }).limit(10).skip(10 * page).populate("customer");
		return res.render("./Doctor/future-bookings.html", {
			sidebar: getSidebar(req),
			future: future,
			page: page
		});
	} catch (e) {
		next(e);
	}
});

router.get("/past-bookings", async (req, res, next) => {
	try {
		let page = 0;
		if (req.query.page) {
			page = parseInt(req.query.page);
		}
		let doc = await Doctor.findOne({ email: req.session.email });
		let past = await Booking.find({
			doctor: doc._id,
			$or: [{
				start: {
					$lt: new Date()
				}
			}, {
				canceled: { $exists: true }
			}]
		}).sort({ "start": -1 }).limit(10).skip(10 * page).populate("customer");
		return res.render("./Doctor/past-bookings.html", {
			sidebar: getSidebar(req),
			past: past,
			page: page
		});
	} catch (e) {
		next(e);
	}
});

router.get("/cancel-booking/:id", async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		let book = await Booking.findOne({
			_id: mongoose.Types.ObjectId(req.params.id)
		}).populate("doctor").populate("customer");
		if (book.doctor.email !== req.session.email) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		if (book.canceled && book.canceled.status) {
			addToast("Booking already canceled", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		return res.render("./Doctor/cancel-booking.html", { sidebar: getSidebar(req), book: book });
	} catch (e) {
		next(e);
	}
});

router.post("/cancel-booking/:id", [
	check("reason").not().isEmpty().withMessage("Please put in a message")], async (req, res, next) => {
	try {
		if (validateToast(req)) {
			return res.redirect(req.originalUrl);
		}
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		let book = await Booking.findOne({
			_id: mongoose.Types.ObjectId(req.params.id)
		}).populate("doctor");
		if (book.doctor.email !== req.session.email) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		if (book.canceled && book.canceled.status) {
			addToast("Booking already canceled", req);
			return res.redirect(req.baseUrl + "/bookings");
		}
		book.canceled = {
			status: true,
			date: new Date(),
			reason: req.body.reason
		};
		await book.save();
		//cancel the call notification and send booking canceled email
		await Agenda.cancel({ name: "callNotification", data: { _id: mongoose.Types.ObjectId(book._id) } });
		await Agenda.create("bookingCanceled", { _id: mongoose.Types.ObjectId(book._id) }).schedule(new Date()).save();
		return res.redirect(req.baseUrl + "/bookings");
	} catch (e) {
		next(e);
	}
});

//paginate this later
router.get("/my-patients", async (req, res, next) => {
	try {
		let doc = await Doctor.findOne({
			email: req.session.email
		}).select({
			patients: {
				$elemMatch: { $or: [{ till: { $gte: new Date() } }, { till: { $exists: false } }] }
			}
		}).populate("patients.patient");
		return res.render("./Doctor/my-patients.html", {
			sidebar: getSidebar(req),
			doctor: doc
		});
	} catch (e) {
		next(e);
	}
});

router.get("/patient/:id", async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let doc = await Doctor.findOne({
			email: req.session.email
		}).select({
			patients: {
				$elemMatch: { patient: mongoose.Types.ObjectId(req.params.id) }
			}
		}).populate("patients.patient");
		if (doc.patients.length > 0) {
			if (doc.patients[0].till && doc.patients[0].till < new Date()) {
				addToast("Couldn't find patient", req);
				return res.redirect(req.baseUrl + "/my-patients");
			}
			return res.render("./Doctor/patient.html", {
				sidebar: getSidebar(req),
				patient: doc.patients[0].patient
			});
		}
		addToast("Couldn't find patient", req);
		return res.redirect(req.baseUrl + "/my-patients");
	} catch (e) {
		next(e);
	}
});

router.get("/patient/:patient/:resource", checkLogin, async (req, res, next) => {
	try {
		if (req.params.patient.length !== 24 && req.params.resource.length !== 24) {
			return res.send("Could'nt find the resource");
		}
		let doc = await Doctor.aggregate([
			{ $match: { email: req.session.email } },
			{ $unwind: "$patients" },
			{ $match: { "patients.patient": mongoose.Types.ObjectId(req.params.patient) } },
			{ $match: { $or: [{ "patients.till": { $gte: new Date() } }, { "patients.till": { $exists: false } }] } },
			{
				$lookup: {
					from: Customer.collection.name,
					localField: "patients.patient",
					foreignField: "_id",
					as: "patient"
				}
			},
			{ $unwind: "$patient" },
			{ $unwind: "$patient.history" },
			{ $match: { "patient.history._id": mongoose.Types.ObjectId(req.params.resource) } }
		]);
		if (doc.length <= 0) {
			return res.send("Could'nt find the resource");
		}
		doc = doc[0];
		if (!doc.patient || !doc.patient.history) {
			return res.send("Could'nt find the resource");
		}
		res.contentType(doc.patient.history.mimetype);
		let mime = doc.patient.history.mimetype.split("/");
		if (mime[0] === "image" || mime[1] === "pdf") {
			return res.sendFile(path.resolve(__dirname + "/../" + doc.patient.history.path));
		} else {
			return res.send(doc.patient.history.text);
		}
	} catch (e) {
		next(e);
	}
});

router.post("/patient/:patient", upload.array("files", 10), async (req, res, next) => {
	try {
		if (req.files.length === 0) {
			addToast("Please upload a file", req);
			return res.redirect(req.originalUrl);
		}

		let doc = await Doctor.findOne({
			email: req.session.email
		}).select({
			patients: {
				$elemMatch: { patient: mongoose.Types.ObjectId(req.params.patient) }
			}
		});

		if (doc.patients.length <= 0) {
			addToast("Couldn't find patient", req);
			return res.redirect(req.baseUrl + "/my-patients");
		}

		if (doc.patients[0].till && doc.patients[0].till < new Date()) {
			addToast("Couldn't find patient", req);
			return res.redirect(req.baseUrl + "/my-patients");
		}

		let customer = await Customer.findById(req.params.patient);
		let count = 0;
		for (let file of req.files) {
			if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/)) {
				addToast(`${file.originalname} not allowed , ignoring file`, req);
				await unlinkAsync(file.path);
			} else {
				count++;
				customer.history.push({
					originalName: file.originalname,
					path: file.path,
					size: file.size,
					mimetype: file.mimetype,
					uploadedOn: new Date(),
					uploadedBy: doc._id
				});
			}
		}
		customer.save();
		addToast(`Added ${count} new files`, req);
		return res.redirect(req.originalUrl);
	} catch (e) {
		next(e);
	}
});

router.get("/patient/:patient/edit/:id", async (req, res, next) => {
	try {
		if (req.params.patient.length !== 24 && req.params.resource.length !== 24) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + "/my-patients");
		}
		let doc = await Doctor.aggregate([
			{ $match: { email: req.session.email } },
			{ $unwind: "$patients" },
			{ $match: { "patients.patient": mongoose.Types.ObjectId(req.params.patient) } },
			{ $match: { $or: [{ "patients.till": { $gte: new Date() } }, { "patients.till": { $exists: false } }] } },
			{
				$lookup: {
					from: Customer.collection.name,
					localField: "patients.patient",
					foreignField: "_id",
					as: "patient"
				}
			},
			{ $unwind: "$patient" },
			{ $unwind: "$patient.history" },
			{ $match: { "patient.history._id": mongoose.Types.ObjectId(req.params.id) } }
		]);
		if (doc.length <= 0) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}`);
		}
		doc = doc[0];
		if (!doc.patient || !doc.patient.history) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}`);
		}
		if (doc.patient.history.mimetype !== "text/markdown") {
			addToast("Can't edit this resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}`);
		}
		//convert to base64
		//Buffer() requires a number, array or string as the first parameter, and an optional encoding type as the second parameter.
		// Default is utf8, possible encoding types are ascii, utf8, ucs2, base64, binary, and hex
		let base64 = new Buffer(doc.patient.history.text);
		// If we don't use toString(), JavaScript assumes we want to convert the object to utf8.
		// We can make it convert to other formats by passing the encoding type to toString().
		base64 = base64.toString("base64");

		return res.render("./Doctor/edit-markdown.html", {
			sidebar: getSidebar(req),
			markdown: base64,
			title: doc.patient.history.originalName
		});
	} catch (e) {
		next(e);
	}
});

router.post("/patient/:patient/edit/:id",[check("filename").not().isEmpty(),check("markdown").not().isEmpty()],async (req, res, next) => {
	try {
		if (validateToast(req)) {
			return res.redirect(req.originalUrl);
		}
		if (req.params.patient.length !== 24 && req.params.resource.length !== 24) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + "/my-patients");
		}
		let doc = await Doctor.findOne({
			email: req.session.email
		}).select({
			patients: {
				$elemMatch: { patient: mongoose.Types.ObjectId(req.params.patient) }
			}
		});
		if (!doc || !doc.patients || doc.patients.length === 0) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + "/my-patients");
		}
		if (doc.patients[0].till < new Date()) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}`);
		}
		let result = await Customer.update({ "history._id": mongoose.Types.ObjectId(req.params.id) }, {
			"$set": {
				"history.$.originalName": req.body.filename,
				"history.$.text": req.body.markdown
			}
		});
		if (result.nModified > 1) {
			//WTF happened this should not have happened something got fucked up make a huge ass notification system to fix this , in case this happens

		}
		return res.redirect(req.originalUrl);
	} catch (e) {
		next(e);
	}
});

router.post("/patient/:patient/new", async (req, res, next) => {
	try {
		if (req.params.patient.length !== 24) {
			addToast("Could'nt find the patient", req);
			return res.redirect(req.baseUrl + "/my-patients");
		}
		let doc = await Doctor.findOne({
			email: req.session.email
		}).select({
			patients: {
				$elemMatch: { patient: mongoose.Types.ObjectId(req.params.patient) }
			}
		});
		if (doc.patients[0].till < new Date()) {
			addToast("Could'nt add the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}`);
		}
		let patient = await Customer.findOne({ _id: doc.patients[0].patient });
		patient.history.push({
			originalName: "New Page",
			mimetype: "text/markdown",
			uploadedOn: new Date(),
			uploadedBy: doc._id,
			text: ""
		});
		await patient.save();
		return res.redirect(req.baseUrl + `/patient/${patient._id}/edit/${patient.history[patient.history.length - 1]._id}`);
	} catch (e) {
		next(e);
	}
});

router.post("/patient/:patient/remove/:resource", async (req, res, next) => {
	try {
		if (req.params.patient.length !== 24 && req.params.resource.length !== 24) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}/`);
		}
		let doc = await Doctor.aggregate([
			{ $match: { email: req.session.email } },
			{ $unwind: "$patients" },
			{ $match: { "patients.patient": mongoose.Types.ObjectId(req.params.patient) } },
			{ $match: { $or: [{ "patients.till": { $gte: new Date() } }, { "patients.till": { $exists: false } }] } },
			{
				$lookup: {
					from: Customer.collection.name,
					localField: "patients.patient",
					foreignField: "_id",
					as: "patient"
				}
			},
			{ $unwind: "$patient" },
			{ $unwind: "$patient.history" },
			{ $match: { "patient.history._id": mongoose.Types.ObjectId(req.params.resource) } }
		]);
		if (doc.length <= 0) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}/`);
		}
		doc = doc[0];
		if (!doc.patient || !doc.patient.history) {
			addToast("Could'nt find the resource", req);
			return res.redirect(req.baseUrl + `/patient/${req.params.patient}/`);
		}
		let old = Object.assign({},doc.patient.history);
		let result = await Customer.updateOne({
				_id: mongoose.Types.ObjectId(req.params.patient),
				"history._id": mongoose.Types.ObjectId(req.params.resource),
			},
			{ $pull: { history: { _id: mongoose.Types.ObjectId(req.params.resource) } } });
		if(old.path){
			await unlinkAsync(path.resolve(__dirname + "/../" + doc.patient.history.path));
		}
		if (result.nModified > 1) {
			//WTF happened this should not have happened something got fucked up make a huge ass notification system to fix this , in case this happens
		}
		return res.redirect(req.baseUrl + `/patient/${req.params.patient}/`);
	} catch (e) {
		next(e);
	}
});

// router.get("/patient2/:patient/:resource", checkLogin, async (req, res, next) => {
// 	try {
// 		if (req.params.patient.length !== 24 && req.params.resource.length !== 24) {
// 			return res.send("Could'nt find the resource");
// 		}
//
// 		let doc = await Doctor.findOne({
// 			email: req.session.email,
// 		}).select({
// 			patients: {
// 				$elemMatch: { patient:mongoose.Types.ObjectId(req.params.patient)}
// 			}
// 		});
// 		if(doc.patients[0].till<new Date()){
// 			return res.send("Could'nt find the resource");
// 		}
// 		let patient = await Customer.findOne({_id:doc.patients[0].patient}).select({
// 			history: {
// 				$elemMatch: { _id:mongoose.Types.ObjectId(req.params.resource)}
// 			}
// 		});
// 		res.send(patient);
// 	} catch (e) {
// 		next(e);
// 	}
// });


module.exports = router;
