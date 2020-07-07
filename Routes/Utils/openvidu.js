let OpenVidu = require("openvidu-node-client").OpenVidu;
let OpenViduRole = require("openvidu-node-client").OpenViduRole;
const request = require('request');

// Environment variable: URL where our OpenVidu server is listening
let OPENVIDU_URL = process.env.OPENVIDU_URL || "https://localhost:4443";
// Environment variable: secret shared with our OpenVidu server
let OPENVIDU_SECRET = process.env.OPENVIDU_SECRET || "pioneer123";

request(OPENVIDU_URL, { json: false }, (err, res, body) => {
	if (err) { return console.log("OpenVidu server OFFLINE , calls will not work"); }
	console.log(`OpenVidu server online`)
});

// Entrypoint to OpenVidu Node Client SDK
let OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

// Collection to pair session names with OpenVidu Session objects
let mapSessions = {};
// Collection to pair session names with tokens
let mapSessionNamesTokens = {};

async function joinSession(sessionName, email) {
	// Optional data to be passed to other users when this user connects to the video-call
	// In this case, a JSON with the value we stored in the req.session object on login
	try {
		var serverData = JSON.stringify({ serverData: email });

		// Build tokenOptions object with the serverData and the role
		var tokenOptions = {
			data: serverData,
			role: OpenViduRole.PUBLISHER,
		};
		if (mapSessions[sessionName]) {
			// Session already exists
			//console.log("Existing session " + sessionName);

			// Get the existing Session from the collection
			var mySession = mapSessions[sessionName];

			let token = await mySession.generateToken(tokenOptions);
			mapSessionNamesTokens[sessionName].push(token);
			return token;
		} else {
			// New session
			//console.log("New session " + sessionName);
			let session = await OV.createSession();
			mapSessions[sessionName] = session;
			// Store a new empty array in the collection of tokens
			mapSessionNamesTokens[sessionName] = [];
			// Generate a new token asynchronously with the recently created tokenOptions
			let token = await session.generateToken(tokenOptions);
			mapSessionNamesTokens[sessionName].push(token);
			return token;
		}
	} catch (error) {
		console.log(error);
		throw new Error(error);
	}
}

async function removeFromSession(sessionName, token) {
	if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
		var tokens = mapSessionNamesTokens[sessionName];
		var index = tokens.indexOf(token);

		// If the token exists
		if (index !== -1) {
			// Token removed
			tokens.splice(index, 1);
		} else {
			var msg = "Problems in the app server: the TOKEN wasn't valid";
			console.log(msg);
			throw new Error(msg);
		}
		if (tokens.length == 0) {
			// Last user left: session must be removed
			delete mapSessions[sessionName];
		}
	} else {
		var msg = "Problems in the app server: the SESSION does not exist";
		console.log(msg);
		throw new Error(msg);
	}
}

module.exports = {
	joinSession: joinSession,
	removeFromSession: removeFromSession,
};
