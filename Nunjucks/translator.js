const translate = require('@k3rn31p4nic/google-translate-api');

async function transfilter(locator,callback){
	try{
		let ctx = this.ctx;
		let storedTranslation = ctx.req.i18n.getResource(ctx.req.language,"translation",locator,{})
		if(storedTranslation){
			return callback(null,storedTranslation);
		}

		//fallback to english and convert
		let english = ctx.req.i18n.getResource('en',"translation",locator,{});
		if(english){
			try{
				let translated = await translate(english,{from:"en",to:ctx.req.language});
				if(translated.text) {
					ctx.req.i18n.addResource(ctx.req.language, "translation", locator, translated.text);
					return callback(null, translated.text);
				}
			}catch(e){
				return callback(null,locator);
			}
		}
		return callback(null,locator);
	}catch(e){
		console.log(e);
		return callback(e);
	}
}

function mount(env){
	env.addFilter('translate',transfilter,true);
}
module.exports = mount;
