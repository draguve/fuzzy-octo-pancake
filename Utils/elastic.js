const elasticsearch = require("elasticsearch");

var esClient = new elasticsearch.Client({
	host: process.env.ELASTIC_HOST + ":" + process.env.ELASTIC_PORT,
});

esClient.ping(
	{
		requestTimeout: 30000,
	},
	function (error) {
		if (error) {
			console.error("elasticsearch cluster is down!");
		} else {
			console.log("Elasticsearch connected");
		}
	}
);

module.exports = esClient;
