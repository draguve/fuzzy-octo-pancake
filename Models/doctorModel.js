let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let crypto = require("crypto");

let doctorModel = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, unique: true, required: true },
	designation: { type: String, required: true },
	department: { type: String, required: true },
	employeeID: { type: String, required: true },
	speciality: { type: String },
	hospital: { type: Schema.ObjectId, required: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
	languages: [{ type: String }],
	verified: { type: Boolean, required: true },
	pricePerSession: { type: Number },
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

module.exports = mongoose.model("Doctor", doctorModel);
