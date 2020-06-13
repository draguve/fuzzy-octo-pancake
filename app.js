express = require("express");
//use .env file to load settings
require("dotenv").config();

var app = express();
var port = process.env.PORT || 3000;

//import and setup nunjucks
var nunjucks = require("nunjucks");

var PATH_TO_TEMPLATES = "./Templates";
nunjucks.configure(PATH_TO_TEMPLATES, {
	autoescape: true,
	express: app,
	watch: true,
});

//for now
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Parse application/json
app.use(
	bodyParser.json({
		type: "application/vnd.api+json",
	})
);

var fs = require("fs");
var https = require("https");

var options = {
	key: fs.readFileSync("openvidukey.pem"),
	cert: fs.readFileSync("openviducert.pem"),
};

var morgan = require("morgan");
app.use(morgan("dev"));

const mongoServer = process.env.MONGO || "localhost:27017"; // REPLACE WITH YOUR DB SERVER
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

const session_secret = process.env.SESSION_SECRET || "pioneer123";
app.use(
	session({
		secret: session_secret,
		saveUninitialized: false, // don't create session until something stored
		resave: false, //don't save session if unmodified
		store: new MongoStore({
			mongooseConnection: mongoose.connection,
		}),
	})
);

app.use("/static", express.static("static"));
require("./Routes/Utils/openvidu.js");
var adminRouter = require("./Routes/admin.js");
var { toastsRouter } = require("./Routes/toasts.js");
var doctorRouter = require("./Routes/doctor.js");
var customerRouter = require("./Routes/customer.js");

app.get("/", function (req, res) {
	return res.send("Server up and running");
});

app.use("/admin", adminRouter);
app.use("/toasts", toastsRouter);
app.use("/doctor", doctorRouter);
app.use("/customer", customerRouter);

//error page
app.use(function (err, req, res, next) {
	console.log(err);
	res.status(500).render("./Defaults/error.html");
});

//listen(port, () => console.log(`Example app listening at ${port}`));
https
	.createServer(options, app)
	.listen(port, () => console.log(`Server started at at ${port}`));
