let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let crypto = require("crypto");

let godSchema = new mongoose.Schema({
	email: { type: String, unique: true, required: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
});

godSchema.methods.setPassword = function (password) {
	this.salt = crypto.randomBytes(16).toString("hex");

	this.hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
};

godSchema.methods.validPassword = function (password) {
	let hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
	return this.hash === hash;
};

const god = mongoose.model("god", godSchema);

module.exports = god;
