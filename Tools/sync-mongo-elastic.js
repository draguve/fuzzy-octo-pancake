let mongoose = require("mongoose");
const elastic = require("../Utils/elastic.js");

let Admin = require("../Models/adminModel.js");
let Doctor = require("../Models/doctorModel.js");

const mongoServer = process.env.MONGO || "localhost:27017"; // REPLACE WITH YOUR DB SERVER
const mongoDatabase = "Telemeds"; // REPLACE WITH YOUR DB NAME

mongoose
	.connect(`mongodb://${mongoServer}/${mongoDatabase}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
	.then(async () => {
		var adminStream = Admin.synchronize();
		var doctStream = Doctor.synchronize();
		adminStream.on("close", function () {
			console.log("indexed all admins !");
		});
		doctStream.on("close", function () {
			console.log("indexed all doctor !");
		});
	});
