//where to get the zipcodes http://download.geonames.org/export/zip/
//provide a file --- node ziptool.js filelocation
//adds the zipcodes to the mongo server
require("dotenv").config();
var arguments = process.argv;
const mongoServer = process.env.MONGO || "localhost:27017"; // REPLACE WITH YOUR DB SERVER
const mongoDatabase = "Telemeds"; // REPLACE WITH YOUR DB NAME

var readlines = require("n-readlines");
var liner = new readlines(arguments[2]);

var ZipCode = require("../Models/zipcodeModel.js");

let mongoose = require("mongoose");
mongoose
	.connect(`mongodb://${mongoServer}/${mongoDatabase}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
	.then(async () => {
		console.log("Database connection successful");
		var next, data;
		while ((next = liner.next())) {
			try {
				data = next.toString("ascii").split("\t");
				var zip = await ZipCode.find({
					country: data[0],
					zip: data[1],
				});
				//console.log(zip);
				if (zip.length == 0) {
					let toAdd = new ZipCode({
						zip: data[1],
						country: data[0],
						location: {
							type: "Point",
							coordinates: [data[9], data[10]],
						},
					});
					console.log(data[0], data[1], data[9], data[10]);
					await toAdd.save();
				} else {
					// maybe average the location on the duplicates ???
					// console.log(
					// 	"Duplicate Location -- ",
					// 	data[0],
					// 	data[1],
					// 	data[data.length - 3],
					// 	data[data.length - 2]
					// );
				}
			} catch (err) {
				console.error(err);
			}
		}
	})
	.catch((err) => {
		console.error(err);
		console.error("Database connection error");
	});

//maybe make this better
