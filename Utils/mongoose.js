let mongoose = require("mongoose");

const mongoServer = process.env.MONGO || "localhost:27017"; // REPLACE WITH YOUR DB SERVER
const mongoDatabase = "Telemeds"; // REPLACE WITH YOUR DB NAME

module.exports = {
	mongoose: mongoose,
	dbConnect: mongoose
		.connect(`mongodb://${mongoServer}/${mongoDatabase}`, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			useCreateIndex: true
		})
		.then(() => {
			console.log("Database connection successful");
		})
		.catch((err) => {
			console.error("Database connection error");
			console.error(err);
		})
};