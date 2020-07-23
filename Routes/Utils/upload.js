const multer = require("multer")

const upload = multer({
	dest: `Uploads/`,
	limits: {
		files: 10, // allow up to 5 files per request,
		fieldSize: 5 * 1024 * 1024 // 2 MB (max file size)
	},
});

module.exports = upload;