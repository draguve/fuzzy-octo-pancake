let { i18next } = require("../Utils/i18n");

function translate(ctx,locator) {
	let storedTranslation = ctx.req.i18n.getResource(ctx.req.language,"translation",locator,{})
	if(storedTranslation){
		return storedTranslation;
	}
	return locator;
	//req.i18n.addResource("fr","translation","thing","test");
	// console.log(req.i18n.exists("test"));
	// console.log(req.t("test"));
	// console.log(JSON.stringify(req.i18n.services.resourceStore.data));

	// let x = req.i18n.getResource("fr","translation","does.not.exist",{});
	// console.log(x);
	// return ctx.req.language;
}

function mount(env){

	env.addFilter('translate',function(locator) {
		return translate(this.ctx,locator);
	});

}
module.exports = mount;
