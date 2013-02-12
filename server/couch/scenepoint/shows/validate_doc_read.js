function(doc, req) {

	function validate_doc_read(doc, userCtx) {
		if(doc.worldReadable)
			return;
		
		if(userCtx == null || (!doc.users[userCtx.name] && doc.author != userCtx.name && userCtx.roles.indexOf("_admin") < 0))
			throw({"forbidden":"Access denied."});
	}
	
	try {
		validate_doc_read(doc, req.userCtx);
		
		return {
    		"body" : JSON.stringify({ "ok" : true }),
      		"headers" : {
        		"Content-Type" : "application/json"
      		}
      	};
      	
	} catch(e) {
	
		return {
			"code" : 403,
    		"body" : JSON.stringify(e),
      		"headers" : {
        		"Content-Type" : "application/json"
      		}
      	};
      	
	}

}
