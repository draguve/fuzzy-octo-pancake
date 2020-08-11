let { i18next } = require("../Utils/i18n");

async function translate(locator,callback){
	try{
		let ctx = this.ctx;
		let storedTranslation = ctx.req.i18n.getResource(ctx.req.language,"translation",locator,{})
		if(storedTranslation){
			return callback(null,storedTranslation);
		}
		return callback(null,locator);
	}catch(e){
		return callback(e);
	}
}

function mount(env){
	env.addFilter('translate',translate,true);
}
module.exports = mount;
