let mongoose = require("mongoose");
const god = require("../Models/godmodel");

const mongoServer = process.env.MONGO || "localhost:27017"; // REPLACE WITH YOUR DB SERVER
const mongoDatabase = "Telemeds"; // REPLACE WITH YOUR DB NAME


let email = "draguve@gmail.com"
let pass = "pioneer123"


mongoose
	.connect(`mongodb://${mongoServer}/${mongoDatabase}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
	.then(async () => {
		let me = new god({
			email:email
		})
		me.setPassword(pass)
		await me.save();
		console.log("added");
	});