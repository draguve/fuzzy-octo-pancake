const Agenda = require("agenda");

const db = require("./mongoose")

const agenda = new Agenda();

db.dbConnect.then(function () {
	agenda.mongo(db.mongoose.connection.db, 'agendaJobs')
})

//later on load with a command line arguments
const jobTypes = ["notification"];

jobTypes.forEach(type => {
	require("../Jobs/" + type)(agenda);
});

if (jobTypes.length) {
	agenda.start(); // Returns a promise, which should be handled appropriately
}

module.exports = agenda;