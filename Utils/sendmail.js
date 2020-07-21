const nodemailer = require("nodemailer");
const mg = require("nodemailer-mailgun-transport");

const domain = process.env.MAILGUN_DOMAIN;
const server = process.env.PULBIC_IP;

const mailgunAuth = {
	auth: {
		api_key: process.env.MAILGUN_ACTIVE_API_KEY,
		domain: domain
	}
};
const smtpTransport = nodemailer.createTransport(mg(mailgunAuth));


module.exports = async function sendMail(mailOptions){
	return new Promise((resolve,reject)=>{
			smtpTransport.sendMail(mailOptions, function(error, info){
				if (error) {
					console.error(error);
					reject(error);
				}
				else {
					console.log('Email sent: ' + mailOptions.to);
					resolve(true);
				}
			});
		});
	}