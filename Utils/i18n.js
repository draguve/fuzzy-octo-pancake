//translation
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');
const fs = require("fs");
const path = require("path");

let location = path.resolve(__dirname + "/../")

i18next
	.use(i18nextBackend)
	.use(i18nextMiddleware.LanguageDetector)
	.init({
		//saveMissing:true,
		//updateMissing:true,
		//saveMissingTo:"current",
		backend: {
			loadPath:  location + '/Locales/{{lng}}.json',
		},
		detection: {
			order: ['querystring', 'cookie'],
			caches: ['cookie']
		},
		fallbackLng: 'en',
		preload: ['en',"ru","fr"],
		debug:true
	});

function exitHandler(){
	for (const [key, value] of Object.entries(i18next.services.resourceStore.data)) {
		let location = path.resolve(__dirname + "/../" + `/Locales/${key}.json`)
		let old = {};
		if (fs.existsSync(location)) {
			let rawdata = fs.readFileSync(location);
			old = JSON.parse(rawdata);
		}
		let toSave = Object.assign(old,value["translation"]);
		let output = JSON.stringify(toSave, null, 2);
		fs.writeFileSync(location, output);
	}
}

module.exports = {
	i18nMiddleware: i18nextMiddleware.handle(i18next),
	i18nExitHandler: exitHandler,
};
