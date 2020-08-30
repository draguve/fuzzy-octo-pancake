
function mount(env){
	env.addFilter('limit', function(arr, limit) {
		return arr.slice(0, limit);
	});
}

module.exports = mount;