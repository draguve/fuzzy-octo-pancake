express = require("express");
//use .env file to load settings
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

//import and setup nunjucks
const nunjucks = require("nunjucks");

const PATH_TO_TEMPLATES = "./Templates";
let env = nunjucks.configure(PATH_TO_TEMPLATES, {
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

let db = require("./Utils/mongoose")

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
			mongooseConnection: db.mongoose.connection,
		}),
	})
);

//added the rotate and findAttr
require("./Utils/prototypes");

//mount filter
require("./Utils/gravatar")(env);

// const i18nextMiddleware = require('i18next-http-middleware');
let {i18nMiddleware,i18nExitHandler} = require("./Utils/i18n");

//enable language
app.use( i18nMiddleware );

function exitHandler(options, exitCode) {
	if (options.cleanup){
		i18nExitHandler();
	}
	if (exitCode || exitCode === 0) console.log(exitCode);
	if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

app.use("/static", express.static("static"));
require("./Routes/Utils/openvidu.js");
const adminRouter = require("./Routes/admin");
const { toastsRouter } = require("./Routes/toasts");
const doctorRouter = require("./Routes/doctor");
const customerRouter = require("./Routes/customer");
const godRouter = require("./Routes/god");

app.get("/", function (req, res) {
	return res.send("Server up and running");
});

app.use("/admin", adminRouter);
app.use("/toasts", toastsRouter);
app.use("/doctor", doctorRouter);
app.use("/customer", customerRouter);
app.use("/god",godRouter);

//error page
app.use(function (err, req, res, next) {
	if(err){
		console.log(err);
		res.status(500).render("./Defaults/error.html");
	}else{
		next();
	}
});

https
	.createServer(options, app)
	.listen(port, () => console.log(`Server started at at ${port}`));
