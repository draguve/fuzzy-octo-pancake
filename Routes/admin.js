var express = require("express");
var router = express.Router();
let Admin = require("../Models/adminModel.js");

const adminType = "ADMIN";

router.get("/login", function (req, res) {
	res.render("./Admin/login.html");
});

router.get("/signup", function (req, res) {
	res.render("./Admin/signup.html");
});

router.post("/login", function (req, res) {
	Admin.findOne({ email: req.body.email })
		.then((doc) => {
			if (doc) {
				if (doc.validPassword(req.body.password)) {
					if (
						req.session.userType &&
						req.session.email == doc.email
					) {
						req.session.userType.push(adminType);
					} else {
						req.session.userType = [adminType];
					}
					req.session.email = doc.email;

					res.redirect(req.baseUrl + "/");
				} else {
					res.render("./Admin/login.html", {
						toasts: ["Incorrect password"],
					});
				}
			} else {
				res.render("./Admin/login.html", {
					toasts: ["User with email id doesn't exist"],
				});
			}
		})
		.catch((err) => {
			console.error(err);
		});
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

router.get("/logout", function (req, res) {
	req.session.email = "";
	req.session.userType = [];
	res.redirect(req.baseUrl + "/login");
});

function checkLogin(req, res, next) {
	//check login here
	if (req.session.email && req.session.userType.includes(adminType)) {
		next();
	} else {
		return res.redirect(req.baseUrl + "/login");
	}
}

router.use(checkLogin);

router.get("/", function (req, res) {
	res.render("./Defaults/admin-template.html");
});

module.exports = router;
