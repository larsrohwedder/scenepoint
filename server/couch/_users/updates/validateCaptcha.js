function (doc, req) {
    
	try {
		
		if(req.userCtx.roles.indexOf("daemon") == -1
			&& req.userCtx.roles.indexOf("_admin") == -1) {
			throw({ "unauthorized" : "Only admins and daemons may validate captchas." });
		}

		if(!doc) {
			throw({ "forbidden" : "Invalid Document." });
		}
		
		if(doc.roles.indexOf("validated") == -1)
			doc.roles.push("validated");

	    return [doc, {
			"body" : JSON.stringify({"ok" : true}),
	  		"headers" : {
	    		"Content-Type" : "application/json"
	  		}
	    }];
		
	} catch(e) {
		
		return [null, {
			"code" : 403,
			"body" : JSON.stringify(e),
      		"headers" : {
        		"Content-Type" : "application/json"
      		}
		}];
		
	}
}