const elasticsearch = require("elasticsearch");

const host = process.env.ELASTIC_HOST || "localhost";
const port = process.env.ELASTIC_PORT || 9200;

let esClient = new elasticsearch.Client({
	host: host + ":" + port
});

esClient.ping(
	{
		requestTimeout: 30000,
	},
	function (error) {
		if (error) {
			console.error("elasticsearch cluster is down! Search will not work");
		} else {
			console.log("Elasticsearch connected");
		}
	}
);

module.exports = esClient;
