function(doc) {
	var keys = ["name", "email", "role"], vals = {};
	for(var i=0; i<keys.length; i++) {
		vals[keys[i]] = doc[keys[i]];
	}
	for(var i=0; i<keys.length; i++) {
		emit([keys[i], doc[keys[i]]], vals);
	}
}