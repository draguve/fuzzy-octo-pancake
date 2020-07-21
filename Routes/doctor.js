const express = require("express");
const router = express.Router();
const Doctor = require("../Models/doctorModel.js");
const Admin = require("../Models/adminModel.js");
const Booking = require("../Models/bookingModel.js");
const { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");

const gravatar = require("gravatar");
const imageFromEmail = require("./Utils/gravatar.js");

const { joinSession, removeFromSession } = require("./Utils/openvidu.js");
const daysOfTheWeek = require("./Utils/date.js");
const mongoose = require("mongoose");
const spacetime = require("spacetime");

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
		name: req.session.name
	};
	return renderer;
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

router.get("/call/:id",async (req,res,next) => {
	try{
		if(req.params.id.length !== 24){
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({_id:mongoose.Types.ObjectId(req.params.id)});
		if(!book){
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let token = await joinSession(book._id.toString(),req.session.email);
		book.started = true;
		await book.save();
		let data = {
			sidebar:  getSidebar(req),
			token:token,
			sessionName:book._id.toString(),
			username:req.session.email,
			nickname: req.session.name
		};
		return res.render("./Doctor/call.html",data)
	}catch(error){
		next(error);
	}
});

router.post("/leave-call", async (req, res, next) => {
	try {
		if(req.body.sessionname.length !== 24){
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({_id:mongoose.Types.ObjectId(req.body.sessionname)});
		if(book === null){
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		book.started=false;
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
			}
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
			doctor: doc._id,
		});
		for(let book of updated_old){
			let value = updated[book._id];
			let start = new Date(value.start);
			let end = new Date(value.end);
			changed.push({
				_id: book._id,
				start: start,
				end: end
			});
			if(book.start < current || book.end < current){
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
			}
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
		for(let item of changed){
			bulk.push({
				updateOne: {
					filter: { _id: mongoose.Types.ObjectId(item._id) },
					update: {
						$set: {
							start:item.start,
							end:item.end
						}
					}
				}
			});
		}
		await Booking.bulkWrite(bulk);
		for(let item of changed){
			const job = await Agenda.create('callNotification', {_id:mongoose.Types.ObjectId(item._id)})
				.unique({'data._id':mongoose.Types.ObjectId(item._id)})
				.schedule(item.start).save();

			const timeChangedNotif = await Agenda.create('bookingTimeChanged',{_id:mongoose.Types.ObjectId(item._id)}).schedule(new Date()).save();
		}

		//sends notification to doctor&customer for the updates and update our future job system,
		addToast("Bookings Updated",req);
		return res.redirect(req.baseUrl + "/bookings");
	} catch (e) {
		next(e);
	}
});

router.get("/bookings/:id",async (req,res,next) => {
	try{
		if(req.params.id.length !== 24){
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({_id:mongoose.Types.ObjectId(req.params.id)}).populate("customer");
		if(!book){
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		console.log(book);
		let send = {
			sidebar:getSidebar(req),
			gravatar:imageFromEmail,
			book:book
		}
		return res.render("./Doctor/booking_details.html",send)
	}catch(err){
		next(err);
	}
});

//seperate this out to 2 pages
router.get("/future-bookings",async (req,res,next) => {
	try{
		let page = 0
		if(req.query.page){
			page = parseInt(req.query.page);
		}
		let doc = await Doctor.findOne({email:req.session.email});
		let future = await Booking.find({
			doctor: doc._id,
			start: {
				$gte: new Date()
			}
			//date length checks as well
		}).sort({'start': 1}).limit( 10 ).skip(10 * page).populate("customer");
		return res.render("./Doctor/future-bookings.html",{
			sidebar:getSidebar(req),
			future:future,
			page:page
		});
	}catch (e) {
		next(e);
	}
});

router.get("/past-bookings",async (req,res,next) => {
	try{
		let page = 0
		if(req.query.page){
			page = parseInt(req.query.page);
		}
		let doc = await Doctor.findOne({email:req.session.email});
		let past = await Booking.find({
			doctor: doc._id,
			start: {
				$lt: new Date()
			}
			//date length checks as well
		}).sort({'start': -1}).limit( 10 ).skip(10 * page).populate("customer");
		return res.render("./Doctor/past-bookings.html",{
			sidebar:getSidebar(req),
			past:past,
			page:page
		});
	}catch (e) {
		next(e);
	}
});

module.exports = router;
