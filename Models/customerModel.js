let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let crypto = require("crypto");

let customerModel = new mongoose.Schema({
	email: { type: String, unique: true, required: true },
	name: { type: String, required: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
	history:[{
		originalName: {type:String},//required
		mimetype: {type:String},//required
		uploadedOn:{type:Date},//required
		uploadedBy:{ type: Schema.Types.ObjectId, ref: "Doctor" },//required for doctors
		path:{type:String},//img,pdf only
		size:{type:Number},//img,pdf only
		text:{type:String}//markdown only
	}]
});

customerModel.methods.setPassword = function (password) {
	// Creating a unique salt for a particular user
	this.salt = crypto.randomBytes(16).toString("hex");

	this.hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
};

customerModel.methods.validPassword = function (password) {
	let hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
	return this.hash === hash;
};

module.exports = mongoose.model("Customer", customerModel);
