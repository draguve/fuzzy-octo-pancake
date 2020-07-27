let mongoose = require("mongoose");
let Schema = mongoose.Schema;

let bookingSchema = new mongoose.Schema({
	start: { type: Date, required: true },
	end: { type: Date, required: true },
	doctor: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
	customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
	originalStart: { type: Date, required: true },
	originalEnd: { type: Date, required: true },
	started: { type: Boolean },
	//this field is not present on creation and is added when the booking is canceled
	canceled:{
		status:{type:Boolean},
		reason:{type:String},
		date:{type:Date},
		canceledBy:{type:String,enum:["customer","doctor"]}
	}
});
const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
