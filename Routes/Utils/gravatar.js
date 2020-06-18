var gravatar = require("gravatar");

function imageFromEmail(email) {
	return gravatar.url(
		email,
		{
			s: "200",
			r: "g",
			d: "identicon",
		},
		true
	);
}

module.exports = imageFromEmail;
