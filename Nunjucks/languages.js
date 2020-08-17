const translate = require('@k3rn31p4nic/google-translate-api');
let languages = JSON.parse(JSON.stringify(translate.languages));
delete languages.auto;

function mount(env){
	env.addFilter('isoToLang',function(code) {
		return languages[code];
	})
}

module.exports = mount;