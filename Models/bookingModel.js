let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let bookingSchema = new mongoose.Schema({
	start: { type: Date, required: true },
	end: { type: Date, required: true },
	doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
	customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
});
const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
