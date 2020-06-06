var OpenVidu = require("openvidu-node-client").OpenVidu;
var OpenViduRole = require("openvidu-node-client").OpenViduRole;

// Environment variable: URL where our OpenVidu server is listening
var OPENVIDU_URL =
	process.env.OPENVIDU_URL || process.argv[2] || "https://localhost:4443";
// Environment variable: secret shared with our OpenVidu server
var OPENVIDU_SECRET = process.env.OPENVIDU_SECRET || "pioneer123";

// Entrypoint to OpenVidu Node Client SDK
var OV = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);

// Collection to pair session names with OpenVidu Session objects
var mapSessions = {};
// Collection to pair session names with tokens
var mapSessionNamesTokens = {};

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
			console.log("Existing session " + sessionName);

			// Get the existing Session from the collection
			var mySession = mapSessions[sessionName];

			// Generate a new token asynchronously with the recently created tokenOptions
			mySession
				.generateToken(tokenOptions)
				.then((token) => {
					// Store the new token in the collection of tokens
					mapSessionNamesTokens[sessionName].push(token);

					// Return session template with all the needed attributes
					return token;
				})
				.catch((error) => {
					console.error(error);
				});
		} else {
			// New session
			console.log("New session " + sessionName);

			// Create a new OpenVidu Session asynchronously
			OV.createSession()
				.then((session) => {
					// Store the new Session in the collection of Sessions
					mapSessions[sessionName] = session;
					// Store a new empty array in the collection of tokens
					mapSessionNamesTokens[sessionName] = [];

					// Generate a new token asynchronously with the recently created tokenOptions
					session
						.generateToken(tokenOptions)
						.then((token) => {
							// Store the new token in the collection of tokens
							mapSessionNamesTokens[sessionName].push(token);
							return token;
						})
						.catch((error) => {
							console.error(error);
						});
				})
				.catch((error) => {
					console.error(error);
				});
		}
	} catch (error) {
		throw new Error(error);
	}
}

async function removeFromSession(sessionName, token) {
	try {
		if (mapSessions[sessionName] && mapSessionNamesTokens[sessionName]) {
			var tokens = mapSessionNamesTokens[sessionName];
			var index = tokens.indexOf(token);

			// If the token exists
			if (index !== -1) {
				// Token removed
				tokens.splice(index, 1);
				console.log(sessionName + ": " + tokens.toString());
			} else {
				var msg = "Problems in the app server: the TOKEN wasn't valid";
				console.log(msg);
				return;
			}
			if (tokens.length == 0) {
				// Last user left: session must be removed
				delete mapSessions[sessionName];
			}
			return;
		} else {
			var msg = "Problems in the app server: the SESSION does not exist";
			console.log(msg);
			throw new Error(
				"roblems in the app server: the SESSION does not exist"
			);
		}
	} catch (Error) {
		throw error;
	}
}

module.exports = {
	joinSession: joinSession,
	removeFromSession: removeFromSession,
};
