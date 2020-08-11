function render(res,filename,ctx) {
	return new Promise((resolve, reject) => {
		res.render(filename,ctx,function(err,result) {
			if(err) return reject(err);
			res.send(result)
			return resolve(result);
		})
	})
}

module.exports = render;