express = require("express");
//use .env file to load settings
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

//import and setup nunjucks
const nunjucks = require("nunjucks");

const PATH_TO_TEMPLATES = "./Templates";
nunjucks.configure(PATH_TO_TEMPLATES, {
	autoescape: true,
	express: app,
	watch: true,
});

//for now
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Parse application/json
app.use(
	bodyParser.json({
		type: "application/vnd.api+json",
	})
);

const fs = require("fs");
const https = require("https");

const options = {
	key: fs.readFileSync("openvidukey.pem"),
	cert: fs.readFileSync("openviducert.pem")
};

const morgan = require("morgan");
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
		console.error(err);
	});

//set up the session , to store login information
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

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
const adminRouter = require("./Routes/admin.js");
const { toastsRouter } = require("./Routes/toasts.js");
const doctorRouter = require("./Routes/doctor.js");
const customerRouter = require("./Routes/customer.js");

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
