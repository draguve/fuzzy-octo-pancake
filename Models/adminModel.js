let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let crypto = require("crypto");

let adminSchema = new mongoose.Schema({
	email: { type: String, unique: true, required: true },
	hospName: { type: String, required: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
	doctors: [{ type: Schema.ObjectId }],
	unverified: [{ type: Schema.ObjectId }],
	defaultPricePerSession: { type: Number },
});

// Method to set salt and hash the password for a user
// setPassword method first creates a salt unique for every user
// then it hashes the salt with user password and creates a hash
// this hash is stored in the database as user password
adminSchema.methods.setPassword = function (password) {
	// Creating a unique salt for a particular user
	this.salt = crypto.randomBytes(16).toString("hex");

	this.hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
};

// Method to check the entered password is correct or not
// valid password method checks whether the user
// password is correct or not
// It takes the user password from the request
// and salt from user database entry
// It then hashes user password and salt
// then checks if this generated hash is equal
// to user's hash in the database or not
// If the user's hash is equal to generated hash
// then the password is correct otherwise not
adminSchema.methods.validPassword = function (password) {
	let hash = crypto
		.pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
		.toString(`hex`);
	return this.hash === hash;
};

module.exports = mongoose.model("Admin", adminSchema);
