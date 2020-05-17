let mongoose = require("mongoose");
let crypto = require("crypto");

let doctorModel = new mongoose.Schema({
	email: { type: String, unique: true, required: true },
	hospName: { type: String, required: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
});

module.exports = mongoose.model("Doctor", doctorModel);
