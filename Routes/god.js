//Make a weird acronym for god
//Global Oversight Dev Account?
//Protect Agendash with custom urls
const express = require("express");
const router = express.Router();
const Agenda = require("../Utils/agenda");
const Agendash = require("agendash");

//protect all this with username and passwords, lots of exploits in agendash
router.use("/agendash",Agendash(Agenda));

module.exports = router;