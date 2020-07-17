// Environment variable: URL where our OpenVidu server is listening
let API_KEY = process.env.GMAPS_API || "TEST";

function mapsLink(lat,long) {
	return `https://www.google.com/maps/embed/v1/view?key=${API_KEY}&center=${lat},${long}`
}

module.exports = mapsLink;