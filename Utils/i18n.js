//translation
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');
const fs = require("fs");
const path = require("path");

i18next
	.use(i18nextBackend)
	.use(i18nextMiddleware.LanguageDetector)
	.init({
		//saveMissing:true,
		//updateMissing:true,
		//saveMissingTo:"current",
		backend: {
			loadPath: __dirname + '/Locales/{{lng}}.json',
		},
		detection: {
			order: ['querystring', 'cookie'],
			caches: ['cookie']
		},
		//fallbackLng: 'en',
		preload: ['en',"ru","fr"]
	});

function exitHandler(){
	for (const [key, value] of Object.entries(i18next.services.resourceStore.data)) {
		let location = path.resolve(__dirname + "/../" + `/Locales/${key}.json`)
		let rawdata = fs.readFileSync(location);
		let toSave = Object.assign(JSON.parse(rawdata),value["translation"])
		let output = JSON.stringify(toSave, null, 2);
		fs.writeFileSync(location, output);
	}
}

module.exports = {
	i18nMiddleware: i18nextMiddleware.handle(i18next),
	i18nExitHandler: exitHandler,
};
