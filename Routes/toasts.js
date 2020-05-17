var express = require("express");
var router = express.Router();

router.get("/", function (req, res) {
	var toSend = { toasts: [] };
	if (req.session.toasts) {
		toSend.toasts = req.session.toasts;
		toSend = JSON.stringify(toSend);
		req.session.toasts = [];
	}
	return res.send(toSend);
});

function addToast(toast, req) {
	if (req.session.toasts) {
		req.session.toasts.push(toast);
	} else {
		req.session.toasts = [toast];
	}
}

module.exports = { toastsRouter: router, addToast: addToast };
