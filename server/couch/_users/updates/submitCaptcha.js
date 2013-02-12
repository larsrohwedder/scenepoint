function (doc, req) {
    
	try {
		
		if(!doc) {
			throw({ "forbidden" : "Invalid document." });
		}
		
		if(req.userCtx.name !== doc.name) {
			throw({ "unauthorized" : "Users may only solve their own captchas." });
		}
		
		if(doc.captchaValidated) {
			throw({ "forbidden" : "User accound already validated." });
		}
		
		var ip;
		if(req.headers["X-Forwarded-For"]) {
			var match = /^\s*(\S*)\s*(,|$)/.exec(req.headers["X-Forwarded-For"]);
			if(match)
				ip = match[1];
		} else {
			ip = req.peer;
		}
	    doc.captcha = {
	    	"ip" : ip,
	    	"response" : req.form.response || req.query.response,
	    	"challenge" : req.form.challenge || req.query.challenge
	    }

	    return [doc, JSON.stringify({"ok" : true})];
		
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