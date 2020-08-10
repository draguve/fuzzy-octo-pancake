const express = require("express");
const router = express.Router();

let Customer = require("../Models/customerModel.js");
let Admin = require("../Models/adminModel.js");
let Doctor = require("../Models/doctorModel.js");
let Booking = require("../Models/bookingModel.js");

const { joinSession, removeFromSession } = require("./Utils/openvidu.js");

const { addToast } = require("./toasts.js");
const validateToast = require("./Utils/validator.js");
const { check } = require("express-validator");

const mongoose = require("mongoose");
const spacetime = require("spacetime");

const Agenda = require("../Utils/agenda.js");

const daysOfTheWeek = require("./Utils/date.js");

const gmaps = require("./Utils/gmaps");

const upload = require("./Utils/upload");
const { promisify } = require("util");
const fs = require("fs");
const unlinkAsync = promisify(fs.unlink);
const path = require("path");

const USERTYPE = "CUSTOMER";

router.get("/login", function(req, res, next) {
	try {
		res.render("./Customer/login.html");
	} catch (err) {
		next(err);
	}
});

router.get("/signup", function(req, res, next) {
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
			.isEmpty()
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
			.isEmpty()
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
				name: req.body.name
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
		addToast("Please login first , you will be redirected to the page after login", req);
		req.session.postLoginRedirect = req.originalUrl;
		return res.redirect(req.baseUrl + "/login");
	}
}

//removed login check for now
//router.use(checkLogin);

router.get("/", async (req, res, next) => {
	console.log(req.language);
	console.log(req.i18n.exists("home"));
	console.log(req.t('home'));
	req.i18n.addResource("fr","translation","thing","test");
	// console.log(req.i18n.exists("test"));
	// console.log(req.t("test"));
	// console.log(JSON.stringify(req.i18n.services.resourceStore.data));
	res.render("./test.html");
});

router.get("/search", async (req, res, next) => {
	//TODO : also add params to search for a specific department
	try {
		if (req.query.q) {
			var results = Admin.search({
				query_string: {
					query: req.query.q + "~"
				}
			});
			var results2 = Doctor.search({
				bool: {
					must: [
						{
							query_string: {
								query: req.query.q + "~"
							}
						}
					],
					filter: [
						{
							match: {
								verified: true
							}
						}
					]
				}
			});

			results = await results;
			results2 = await results2;
			var hits = results.hits.hits;
			hits = hits.concat(results2.hits.hits);
			hits.sort((a, b) => b._score - a._score).reverse();
			res.render("./Customer/search.html", {
				hits: hits
			});
		} else {
			var query = {
				location: {
					$near: {
						$geometry: {
							type: "Point",
							coordinates: [-73.9667, 40.78]
						}
						//$maxDistance: 5000,
					}
				}
			};
			let hospitals = await Admin.find(query).populate("doctors");
			let hits = [], docs = [];
			for (let i = 0; i < hospitals.length; i++) {
				hits.push({
					_index: "admins",
					_source: hospitals[i],
					_id: hospitals[i]._id
				});
				for (let j = 0; j < hospitals[i].doctors.length; j++) {
					docs.push({
						_index: "doctors",
						_source: hospitals[i].doctors[i],
						_id: hospitals[i].doctors[i]._id
					});
				}
			}
			hits = hits.concat(docs);
			res.render("./Customer/search.html", {
				hits: hits
			});
		}
	} catch (err) {
		next(err);
	}
});

router.get("/book/:doctor", async (req, res, next) => {
	try {
		let doctor = mongoose.Types.ObjectId(req.params.doctor);
		//check if the doctor is under this admin
		let doc = await Doctor.findOne({
			_id: doctor
		});
		let toSend = {};
		if (!doc) {
			addToast("Couldn't find the doctor", req);
			return res.redirect(req.baseUrl + "/search");
		}
		toSend["doc"] = doc;
		if (doc.verified) {
			if (!doc.isWorking()) {
				toSend.doc.working = false;
				return res.render("./Customer/book.html", toSend);
			}
			toSend.doc.working = true;

			//start checking the dates
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

			//these will store the start time of the first day , and the end time of the last day of the week
			let startDate, endDate;

			let endEvents = [], toAdd = true, diff = todayStart.diff(todayEnd);

			//remove end events if the days are too long
			if (diff.hours >= 23) {
				toAdd = false;
			}
			//check if the working on all the days , then if yes create the 'locations' array for the tape
			let locations = [],
				i = 0;
			for (let day in rotatedDays) {
				//ok this shit makes no sense if i do it with a hardcoded number its fine,by heaven forbid i use the
				//ITERATION varible day to then it fucking becomes december somehow , fucking shit makes no sense
				// I mean why the fuck , this is the reason i fucking hate JS
				if (doc.workingDays[rotatedDays[day]]) {
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
							endTime: todayStart
								.add(i, "days")
								.format("iso-utc")
						}
					});
					if (toAdd) {
						endEvents.push({
							start: todayStart.add(i, "day").subtract(59, "minute").format("iso-utc"),
							end: todayStart.add(i, "day").format("iso-utc")
						});
						endEvents.push({
							start: todayEnd.add(i, "days").format("iso-utc"),
							end: todayEnd.add(i, "days").add(59, "minute").format("iso-utc")
						});
					}
				}
				i++;
			}

			// noinspection JSCheckFunctionSignatures
			var bookings = await Booking.find({
				doctor: doc._id,
				start: {
					$gte: new Date(startDate.format("iso-utc")),
					$lt: new Date(endDate.format("iso-utc"))
				},
				canceled: { $exists: false }
			}).select(["-customer", "-doctor", "-originalEnd", "-originalStart", "-_id"]);
			bookings = bookings.concat(endEvents);

			toSend["json"] = JSON.stringify({
				start: todayStart.format("iso-utc"),
				end: todayEnd.format("iso-utc"),
				locations: locations,
				bookings: bookings,
				timePerSession: doc.persession
			});
		}
		return res.render("./Customer/book.html", toSend);
	} catch (err) {
		next(err);
	}
});

router.get("/info/:hosp", async (req, res, next) => {
	try {
		//implement this
		if (req.params.hosp.length !== 24) {
			addToast("Could'nt find the hospital", req);
			return res.redirect(req.baseUrl);
		}
		let hosp = await Admin.findOne({ _id: mongoose.Types.ObjectId(req.params.hosp) }).populate("doctors");
		if (!hosp) {
			addToast("Could'nt find the hospital", req);
			return res.redirect(req.baseUrl);
		}
		return res.render("./Customer/hosp-info.html", {
			hosp: hosp,
			map: gmaps(hosp.location.coordinates[0], hosp.location.coordinates[1])
		});
	} catch (err) {
		next(err);
	}
});

router.get("/info/:hosp/image", async (req, res, next) => {
	if (req.params.hosp.length !== 24) {
		return res.send("Could'nt find the hospital");
	}
	let hosp = await Admin.findOne({ _id: mongoose.Types.ObjectId(req.params.hosp) }).populate("doctors");
	if (!hosp || !hosp.image) {
		return res.send("Could'nt find the hospital image");
	}
	res.contentType(hosp.image.mimetype);
	return res.sendFile(path.resolve(__dirname + "/../" + hosp.image.path));
});

router.post(
	"/book/:doctor",
	[check("data").trim().not().isEmpty()],
	async (req, res, next) => {
		try {
			//check if the customer is logged in
			if (
				!req.session.email ||
				!req.session.userType.includes(USERTYPE)
			) {
				addToast(
					"Please login as a customer before trying to book",
					req
				);
				return res.redirect(req.originalUrl);
			}

			let customer = await Customer.findOne({
				email: req.session.email
			});

			let doc = await Doctor.findOne({
				_id: mongoose.Types.ObjectId(req.params.doctor)
			});
			let data = JSON.parse(req.body.data);

			let bookStart = spacetime(data.start).goto(doc.timeZone);
			let bookEnd = spacetime(data.end).goto(doc.timeZone);

			let docStart = bookStart
				.hour(doc.timings.start.getHours())
				.minute(doc.timings.start.getMinutes());
			let docEnd = bookEnd
				.hour(doc.timings.end.getHours())
				.minute(doc.timings.end.getMinutes());

			//check length between bookStart and book end
			if (bookStart.diff(bookEnd, "minute") > doc.persession) {
				return res.redirect(
					req.baseUrl + "/book/" + doc._id.toString()
				);
			}

			//check if the doc is working on the day
			if (!doc.workingDays[bookStart.dayName().toLowerCase()]) {
				return res.redirect(
					req.baseUrl + "/book/" + doc._id.toString()
				);
			}

			var oldBookings = await Booking.find({
				doctor: doc._id,
				start: {
					$lt: new Date(docEnd.format("iso-utc")),
					$gte: new Date(docStart.format("iso-utc"))
				},
				canceled: { $exists: false }
			});

			//check overlap with other bookings
			for (let booking of oldBookings) {
				let oldBookStart = spacetime(booking.start).goto(doc.timeZone);
				let oldBookEnd = spacetime(booking.end).goto(doc.timeZone);

				if (bookStart.isBetween(oldBookStart, oldBookEnd, false)) {
					addToast(
						"Sorry could'nt book clashed with other booking",
						req
					);
					return res.redirect(
						req.baseUrl + "/book/" + doc._id.toString()
					);
				}

				if (bookEnd.isBetween(oldBookStart, oldBookEnd, false)) {
					addToast(
						"Sorry could'nt book clashed with other booking",
						req
					);
					return res.redirect(
						req.baseUrl + "/book/" + doc._id.toString()
					);
				}
			}

			// noinspection JSCheckFunctionSignatures,JSCheckFunctionSignatures
			let book = new Booking({
				start: new Date(bookStart.format("iso-utc")),
				end: new Date(bookEnd.format("iso-utc")),
				originalStart: new Date(bookStart.format("iso-utc")),
				originalEnd: new Date(bookEnd.format("iso-utc")),
				customer: customer._id,
				doctor: doc._id
			});

			await book.save();

			//add as patient to the doctors patient array
			let index = doc.patients.findWithAttr("patient", customer._id);
			if (index > -1) {
				doc.patients[index].till = undefined;
			} else {
				doc.patients.push({ patient: customer._id, till: undefined });
			}
			doc.save();

			//create agenda to create the session on the openvidu server and send emails and such
			const job = await Agenda.create("callNotification", { _id: book._id })
				.unique({ "data._id": book._id })
				.schedule(book.start).save();
			addToast("Added new booking", req);
			return res.redirect(req.baseUrl + "/book/" + doc._id.toString());
		} catch (e) {
			next(e);
		}
	}
);

router.get("/call/:id", async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			return res.render("./Customer/callfail.html");
		}
		let book = await Booking.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }).populate("customer");
		let current = new Date();
		if (book.customer.email !== req.session.email) {
			addToast("Email didnt match", req);
			return res.redirect(req.baseUrl);
		}
		if (!book.started && (book.start > current || book.end < current)) {
			addToast("The call hasn't started yet", req);
			return res.redirect(req.baseUrl);
		}
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let token = await joinSession(book._id.toString(), req.session.email);
		let data = {
			token: token,
			sessionName: book._id.toString(),
			username: req.session.email,
			nickname: book.customer.name
		};
		return res.render("./Customer/call.html", data);
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
		await removeFromSession(req.body.sessionname, req.body.token);
		return res.redirect(req.baseUrl + "/");
	} catch (error) {
		next(error);
	}
});

router.get("/history", checkLogin, async (req, res, next) => {
	try {
		let customer = await Customer.findOne({ email: req.session.email });
		return res.render("./Customer/history.html", customer);
	} catch (e) {
		next(e);
	}
});

router.post("/history", checkLogin, upload.array("files", 10), async (req, res, next) => {
	try {
		if (req.files.length === 0) {
			addToast("Please upload a file", req);
			return res.redirect(req.originalUrl);
		}
		let customer = await Customer.findOne({ email: req.session.email });
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
					uploadedOn: new Date()
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

router.get("/history/:id", checkLogin, async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			return res.send("Could'nt find the resource");
		}
		let customer = await Customer.findOne({
			email: req.session.email
		}).select({
				history: {
					$elemMatch: { _id: mongoose.Types.ObjectId(req.params.id) }
				}
			}
		);
		if (!customer) {
			return res.send("Could'nt find the resource");
		}
		if (customer.history.length <= 0) {
			return res.send("Could'nt find the resource");
		}
		res.contentType(customer.history[0].mimetype);
		let mime = customer.history[0].mimetype.split("/");
		if (mime[0] === "image" || mime[1] === "pdf") {
			return res.sendFile(path.resolve(__dirname + "/../" + customer.history[0].path));
		} else {
			return res.send(customer.history[0].text);
		}
	} catch (e) {
		next(e);
	}
});

router.get("/my-bookings", checkLogin, async (req, res, next) => {
	try {
		let page = 0;
		if (req.query.page) {
			page = parseInt(req.query.page);
		}
		let customer = await Customer.findOne({ email: req.session.email });
		let bookings = await Booking.find({
			customer: customer._id,
			start: { $gte: new Date() }
		}).sort({ "start": 1 }).limit(10).skip(10 * page).populate("doctor");
		return res.render("./Customer/my-bookings.html", { bookings: bookings, page: page , title:"Upcoming Bookings",current:new Date()});
	} catch (e) {
		next(e);
	}
});

router.get("/old-bookings", checkLogin, async (req, res, next) => {
	try {
		let page = 0;
		if (req.query.page) {
			page = parseInt(req.query.page);
		}
		let customer = await Customer.findOne({ email: req.session.email });
		let bookings = await Booking.find({
			customer: customer._id,
			start: { $lt: new Date() }
		}).sort({ "start": 0 }).limit(10).skip(10 * page).populate("doctor");
		return res.render("./Customer/my-bookings.html", { bookings: bookings, page: page , title:"Old Bookings" });
	} catch (e) {
		next(e);
	}
});

router.get("/booking/:id", checkLogin, async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl);
		}
		let book = await Booking.findOne({ _id: mongoose.Types.ObjectId(req.params.id) }).populate("doctor").populate("customer");
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		if (req.session.email !== book.customer.email) {
			addToast("You do not have access to this booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		return res.render("./Customer/booking.html", { book: book , current:new Date()});
	} catch (e) {
		next(e);
	}
});

router.get("/cancel-booking/:id", async (req, res, next) => {
	try {
		if (req.params.id.length !== 24) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		let book = await Booking.findOne({
			_id: mongoose.Types.ObjectId(req.params.id)
		}).populate("doctor").populate("customer");
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		if (book.customer.email !== req.session.email) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		if (book.canceled && book.canceled.status) {
			addToast("Booking already canceled", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		return res.render("./Doctor/cancel-booking.html", { book: book });
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
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		let book = await Booking.findOne({
			_id: mongoose.Types.ObjectId(req.params.id)
		}).populate("customer");
		if (!book) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		if (book.customer.email !== req.session.email) {
			addToast("Could'nt find the booking", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		if (book.canceled && book.canceled.status) {
			addToast("Booking already canceled", req);
			return res.redirect(req.baseUrl + "/my-bookings");
		}
		book.canceled = {
			status: true,
			date: new Date(),
			reason: req.body.reason,
			canceledBy: "customer"
		};
		await book.save();
		//cancel the call notification and send booking canceled email
		await Agenda.cancel({ name: "callNotification", data: { _id: mongoose.Types.ObjectId(book._id) } });
		await Agenda.create("customerBookingCanceled", { _id: mongoose.Types.ObjectId(book._id) }).schedule(new Date()).save();
		return res.redirect(req.baseUrl + "/my-bookings");
	} catch (e) {
		next(e);
	}
});

//TODO: remove this later
router.get("/thing", function(req, res) {
	res.render("Customer/thing.html");
});

module.exports = router;
