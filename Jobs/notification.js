require("dotenv").config();

const domain = process.env.MAILGUN_DOMAIN;
const server = process.env.PULBIC_IP;

const sendMail = require("../Utils/sendmail");
const Booking = require("../Models/bookingModel");


module.exports = function(agenda) {
	agenda.define("callNotification", async (job,done) => {
		//console.log("Job Test");
		// const user = await User.get(job.attrs.data.userId);
		// await email(user.email(), 'Thanks for registering', 'Thanks for registering ' + user.name());
		try{
			let booking = await Booking.findOne({ _id: job.attrs.data._id }).populate("doctor").populate("customer");

			//doctor email
			let mailOptions = {
				from: "noreply@"+domain,
				to: booking.doctor.email,
				subject: "Your Booking with " + booking.customer.name,
				html: `Your call can be joined at https://${server}/doctor/call/${booking._id}`
			}
			await sendMail(mailOptions);

			//customer email
			mailOptions = {
				from: "noreply@"+domain,
				to: booking.customer.email,
				subject: "Your Booking with " + booking.doctor.name,
				html: `Your call can be joined at https://${server}/customer/call/${booking._id}`
			}
			await sendMail(mailOptions);
		}catch(e){
			console.error(e);
			done(e);
		}
	});
	agenda.define("bookingTimeChanged",async (job,done) => {
		//write this 
	});
	// agenda.define('reset password', async job => {
	// 	// Etc
	// });
	//
	// // More email related jobs
};