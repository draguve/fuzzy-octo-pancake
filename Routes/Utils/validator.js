var { addToast } = require("../toasts.js");
const { validationResult } = require("express-validator");

function validateToast(req) {
	const errors = validationResult(req).array();
	if (errors.length > 0) {
		for (var i = 0; i < errors.length; i++) {
			if (errors[i].msg) {
				addToast(errors[i].msg, req);
			}
		}
		return true;
	}
	return false;
}

module.exports = validateToast;
