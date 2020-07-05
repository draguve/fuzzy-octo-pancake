
module.exports = function(agenda) {
	agenda.define('createViduSession', async job => {
		console.log("Job Test");
		// const user = await User.get(job.attrs.data.userId);
		// await email(user.email(), 'Thanks for registering', 'Thanks for registering ' + user.name());
	});

	// agenda.define('reset password', async job => {
	// 	// Etc
	// });
	//
	// // More email related jobs
};