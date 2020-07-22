let gravatar = require("gravatar");

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

function mount(env){
	env.addFilter('emailToImg',function(email) {
		return imageFromEmail(email);
	})
}

module.exports = mount;
