express = require("express");

var app = express();
var port = process.env.PORT || 3000;

//import and setup nunjucks
var nunjucks = require("nunjucks");

var PATH_TO_TEMPLATES = "./Templates";
nunjucks.configure(PATH_TO_TEMPLATES, {
	autoescape: true,
	express: app,
});

var bodyParser = require("body-parser");

const mongoServer = "localhost:27017"; // REPLACE WITH YOUR DB SERVER
const mongoDatabase = "Telemeds"; // REPLACE WITH YOUR DB NAME

let mongoose = require("mongoose");
mongoose
	.connect(`mongodb://${mongoServer}/${mongoDatabase}`, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
		useCreateIndex: true,
	})
	.then(() => {
		console.log("Database connection successful");
	})
	.catch((err) => {
		console.error("Database connection error");
	});
//set up the session , to store login information
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);

//app.use(session({ secret: "pioneer123" }));

app.use(
	session({
		secret: "pioneer123",
		saveUninitialized: false, // don't create session until something stored
		resave: false, //don't save session if unmodified
		store: new MongoStore({
			mongooseConnection: mongoose.connection,
		}),
	})
);

var adminRouter = require("./Routes/admin.js");
var { toastsRouter, addToast } = require("./Routes/toasts.js");
var doctorRouter = require("./Routes/doctor.js");

app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", function (req, res) {
	return res.send("Server up and running");
});

app.use("/admin", adminRouter);
app.use("/toasts", toastsRouter);
app.use("/doctor", doctorRouter);

app.listen(port, () => console.log(`Example app listening at ${port}`));
