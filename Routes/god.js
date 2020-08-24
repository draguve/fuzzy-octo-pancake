//Make a weird acronym for god
//Global Oversight Dev Account?
//Protect Agendash with custom urls
const express = require("express");
const router = express.Router();
var { addToast } = require("./toasts.js");
const { check } = require("express-validator");
const validateToast = require("./Utils/validator.js");

const Agenda = require("../Utils/agenda");
const Agendash = require("agendash");

const god = require("../Models/godmodel");
const USERTYPE = "GOD"


router.get("/login", function(req, res, next) {
	try {
		res.render("./God/login.html");
	} catch (err) {
		next(err);
	}
});

router.post(
	"/login",
	[
		check("email")
			.isEmail()
			.withMessage("Please put in a valid email")
			.trim()
			.escape()
			.not()
			.isEmpty(),
		check("password")
			.isLength({ min: 8 })
			.withMessage("Password needs be longer than 8 characters")
			.trim()
			.escape()
			.not()
			.isEmpty()
	],
	async (req, res, next) => {
		if (validateToast(req)) {
			return res.redirect(req.baseUrl + "/login");
		}
		try {
			var me = await god.findOne({ email: req.body.email });
			if (me) {
				if (me.validPassword(req.body.password)) {
					if (
						req.session.userType &&
						req.session.email == me.email
					) {
						req.session.userType.push(USERTYPE);
					} else {
						req.session.userType = [USERTYPE];
					}
					req.session.email = me.email;

					//redirect if the user wanted to go somewhere else
					if( req.session.postLoginRedirect && req.session.postLoginRedirect !== ""){
						let url = req.session.postLoginRedirect;
						req.session.postLoginRedirect = "";
						return res.redirect(url);
					}
					return res.redirect(req.baseUrl + "/");
				} else {
					addToast("Incorrect Password", req);
					return res.redirect(req.baseUrl + "/login");
				}
			} else {
				addToast("User with email id doesn't exist", req);
				return res.redirect(req.baseUrl + "/login");
			}
		} catch (err) {
			next(err);
		}
	}
);

router.get("/logout", function(req, res, next) {
	try {
		req.session.email = "";
		req.session.userType = [];
		res.redirect(req.baseUrl + "/login");
	} catch (err) {
		next(err);
	}
});

function checkLogin(req, res, next) {
	//check login here
	if (req.session.email && req.session.userType.includes(USERTYPE)) {
		next();
	} else {
		addToast("Please login first , you will be redirected to the page after login",req);
		req.session.postLoginRedirect = req.originalUrl;
		return res.redirect(req.baseUrl + "/login");
	}
}

router.use(checkLogin);

//protect all this with username and passwords, lots of exploits in agendash
router.use("/agendash",Agendash(Agenda));

router.get("/",async (req,res,next)=>{
	try{
		return res.render("./God/specialities.html")
	}catch(e){
		next(e);
	}
});

module.exports = router;