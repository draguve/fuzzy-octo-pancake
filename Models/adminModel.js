let mongoose = require("mongoose");
let Schema = mongoose.Schema;
let crypto = require("crypto");
let mongoosastic = require("mongoosastic");
const Promise = require("bluebird");

let adminSchema = new mongoose.Schema({
	email: { type: String, unique: true, required: true, es_indexed: true },
	hospName: { type: String, required: true, es_indexed: true },
	hash: { type: String, required: true },
	salt: { type: String, required: true },
	doctors: [{ type: Schema.ObjectId }],
	unverified: [{ type: Schema.ObjectId }],
	address: {
		address1: { type: String, required: true, es_indexed: true },
		address2: { type: String, es_indexed: true },
		city: { type: String, required: true, es_indexed: true },
		state: { type: String, required: true, es_indexed: true },
		zip: { type: String, required: true, es_indexed: true },
		country: { type: String, required: true, es_indexed: true },
	},
	location: {
		type: {
			type: String, // Don't do `{ location: { type: String } }`
			enum: ["Point"], // 'location.type' must be 'Point'
			required: true,
		},
		coordinates: {
			type: [Number],
			required: true,
		},
	},
	defaultPricePerSession: { type: Number },
});

adminSchema.plugin(mongoosastic, {
	host: process.env.ELASTIC_HOST,
	port: process.env.ELASTIC_PORT,
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

adminSchema.index({ location: "2dsphere" });

//Create model to send
const Admin = mongoose.model("Admin", adminSchema);

//Convert the callback search function to a promise to use async await
Admin.search = Promise.promisify(Admin.search, {
	context: Admin,
});

module.exports = Admin;
