let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let crypto = require("crypto");

//Elastic search stuff
let mongoosastic = require("mongoosastic");
const Promise = require("bluebird");
const elastic = require("../Utils/elastic.js");
const daysOfTheWeek = require("../Routes/Utils/date.js");

let doctorModel = new mongoose.Schema({
	name: { type: String, required: true, es_indexed: true },
	email: { type: String, unique: true, required: true, es_indexed: true },
	designation: { type: String, required: true, es_indexed: true },
	department: { type: String, required: true, es_indexed: true },
	employeeID: { type: String, required: true },
	speciality: { type: String, es_indexed: true },
	hospital: { type: Schema.ObjectId, required: true, es_indexed: true },
	hospitalName: { type: String, required: true, es_indexed: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
	languages: [{ type: String }], // Index this in elastic search
	verified: { type: Boolean, required: true },
	pricePerSession: { type: Number },
	timings: {
		start: Date,
		end: Date,
	},
	workingDays: {
		monday: Boolean,
		tuesday: Boolean,
		wednesday: Boolean,
		thursday: Boolean,
		friday: Boolean,
		saturday: Boolean,
		sunday: Boolean,
	},
	timeZone: { type: String },

	persession: { type: Number },
});

doctorModel.plugin(mongoosastic, {
	esClient: elastic,
});

doctorModel.methods.setPassword = function (password) {
	this.salt = crypto.randomBytes(16).toString("hex");

	this.hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
};

doctorModel.methods.validPassword = function (password) {
	let hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
	return this.hash === hash;
};

//this function will check if the doctor is ever working in the current future
doctorModel.methods.isWorking = function () {
	if (!this.timings || !this.timeZone) {
		return false;
	}
	if (
		!this.timings.start ||
		!this.timings.end ||
		this.timings.start == this.timings.end
	) {
		return false;
	}
	var days = daysOfTheWeek();
	for (var day of days) {
		if (this.workingDays[day]) {
			return true;
		}
	}
	return false;
};

const Doctor = mongoose.model("Doctor", doctorModel);

//Convert the callback search function to a promise to use async await
Doctor.search = Promise.promisify(Doctor.search, {
	context: Doctor,
});

module.exports = Doctor;
