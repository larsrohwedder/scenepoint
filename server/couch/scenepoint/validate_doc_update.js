function(newDoc, oldDoc, userCtx) {
	
	if(!newDoc._deleted) {

		// schema	
		var JSV = require("lib/jsv.min").JSV,
		schema = require("schemes/presentation").schema;
		
		var report = JSV.createEnvironment().validate(newDoc, schema);
		if(report.errors.length > 0 &&
				(!userCtx || userCtx.roles.indexOf("_admin") == -1))
			throw({ "forbidden" : "Schema not fullfied: " + JSON.stringify(report.errors)});
		
		// doc size
		var size = JSON.stringify(newDoc).length;
		if(newDoc._attachments) {
			for(var i in newDoc._attachments) {
				size += newDoc._attachments[i].length;
			}
		}
		if(size > 25 * 1024 * 1024)
			throw({"forbidden" : "Doc size limited to 25Mb."});

		// misc
		if(oldDoc && newDoc.author !== oldDoc.author)
			throw({"forbidden" : "Author may not be changed."});
	}
	
	// authorization
	
	var auth = false;
	if(userCtx && userCtx.roles.indexOf("_admin") != -1)
		auth = true;
	else if(userCtx && !oldDoc && newDoc.author == userCtx.name)
		auth = true;
	else if(userCtx && oldDoc && userCtx.name == oldDoc.author)
		auth = true;
	else if(userCtx && oldDoc && (userCtx.name in oldDoc.users)) {
		if(oldDoc.users[userCtx.name].roles.indexOf("write") != -1)
			auth = true;
	}
	
	if(!auth)
		throw({"unauthorized" : "You don't have the permission to change the document."});
}