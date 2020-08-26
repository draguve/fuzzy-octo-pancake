const translate = require('@k3rn31p4nic/google-translate-api');
let languages = JSON.parse(JSON.stringify(translate.languages));
delete languages.auto;


module.exports = function (req, res, next) {
	res.locals.req = req;

	//also injecting languages
	res.locals.allLangs=languages;
	next();
};