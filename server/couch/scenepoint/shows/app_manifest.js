function(doc, req) {
	// cache manifest is only intended 
	// for the design document.
	if(!doc || !doc._id == "_design/app") 
		return { "code" : 400 };
	
	var data = ["CACHE MANIFEST"];
	// include document's revision number 
	// to ensure browser cache is up to date.
	data.push("# revision " + doc._rev, "");
	// add each attachment's path
	for(var i in doc._attachments)
		data.push(i);
    // force other resources (mostly cloud related) to be fetched from server
	data.push("", "NETWORK:", "*");
	
	return {
    	"body" : data.join("\r\n"),
     	"headers" : { "Content-Type" : "text/cache-manifest" }
    };
}
