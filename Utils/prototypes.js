//rotates the array
Array.prototype.rotateRight = function (n) {
	this.unshift.apply(this, this.splice(n, this.length));
	return this;
};

Array.prototype.findWithAttr = function(attr,val){
	for(let i=0;i<this.length;i++){
		if(this[i][attr] === val){
			return i;
		}
	}
	return -1;
}