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
var db = require("./database.js");

//set up the session , to store login information
var session = require("express-session");
app.use(session({ secret: "pioneer123" }));

var adminRouter = require("./Routes/admin.js");

app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", function (req, res) {
	return res.send("Server up and running");
});

app.use("/admin", adminRouter);

app.listen(port, () => console.log(`Example app listening at ${port}`));
