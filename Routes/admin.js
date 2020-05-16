var express = require("express");
var router = express.Router();
let EmailModel = require("../Models/email.js");
let Admin = require("../Models/adminModel.js");

router.get("/login", function (req, res) {
	res.render("./Admin/login.html");
});

router.get("/signup", function (req, res) {
	res.render("./Admin/signup.html");
});

router.post("/signup", function (req, res) {
	Admin.find({ email: req.body.email })
		.then((doc) => {
			if (doc.length > 0) {
				var errorMessage = {
					toasts: ["Email ID Already In Use"],
					hospitalName: req.body.hospitalName,
				};
				return res.render("./Admin/signup.html", errorMessage);
			}
			let admin = new Admin({
				email: req.body.email,
				hospName: req.body.hospitalName,
			});
			admin.setPassword(req.body.password);
			admin
				.save()
				.then(() => {
					return res.render("./Admin/login.html", {
						toasts: ["New Hospital Added"],
					});
				})
				.catch((err) => {
					console.error(err);
				});
		})
		.catch((err) => {
			console.error(err);
		});
});

function checkLogin(req, res, next) {
	//check login here
	if (true) {
		res.redirect("/login");
	}
	next();
}

module.exports = router;
