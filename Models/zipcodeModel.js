let mongoose = require("mongoose");

let zipSchema = new mongoose.Schema({
	zip: { type: String, required: true },
	country: { type: String, required: true },
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
});

module.exports = mongoose.model("ZipCode", zipSchema);
