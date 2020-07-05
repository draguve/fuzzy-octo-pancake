const Agenda = require("agenda");

const mongoServer = process.env.MONGO || "localhost:27017"; // REPLACE WITH YOUR DB SERVER
const mongoDatabase = "Telemeds"; // REPLACE WITH YOUR DB NAME

const connectionOpts = {db: {address: `${mongoServer}/${mongoDatabase}`, collection: 'agendaJobs'}};

const agenda = new Agenda(connectionOpts);

//later on load with a command line arguments
const jobTypes = ["autovidu"]

jobTypes.forEach(type => {
	require('../Jobs/' + type)(agenda);
});

if (jobTypes.length) {
	agenda.start(); // Returns a promise, which should be handled appropriately
}

module.exports = agenda;