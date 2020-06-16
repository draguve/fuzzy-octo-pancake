const elasticsearch = require("elasticsearch");

var host = process.env.ELASTIC_HOST || "localhost";
var port = process.env.ELASTIC_PORT || 9200;

var esClient = new elasticsearch.Client({
	host: host + ":" + port,
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
