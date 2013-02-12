function(req, resp, extra) {
	
	var querystring = require("querystring"),
	form;
	
	function badReq(msg) {
		return function() {
			resp.writeHead(400);
			resp.end(JSON.stringify({
				"error" : true,
				"reason" :msg
			}));
		};
	};
	function serverFail(msg) {
		return function() {
			resp.writeHead(500);
			resp.end(JSON.stringify({
				"error" : true,
				"reason" :msg
			}));
		};
	};
	
	extra.q.queue(function(q) {
		var data = "";
		req.on("data", function(chunk) {
			data += chunk;
		}).on("end", function() {
			q.next(data);
		})
		
	}).queue(function(q, data) {
		
		try {
			form = JSON.parse(data);
		} catch(e) {
			badReq("Invalid JSON.")();
			return;
		}

		if(!form.challenge || !form.response) {
			badReq("Captcha challenge or response not provided")();
			return;
		}
		
		// verify captcha from google server
		http.request({
			"host" : "www.google.com",
			"path" : "/recaptcha/api/verify",
			"method" : "POST",
			"headers" : {
				"Content-Type" : "application/x-www-form-urlencoded"
			}
				
		}, function(res) {
			
			var data = "";
			res.on("data", function(chunk) {
				data += chunk;
			}).on("end", function() {
				q.next(/^true($|\n|\r\n)/.test(data));
			}).on("close", serverFail("Captcha couldn't be validated."));
			
		}).on("error", serverFail("Captcha couldn't be validated.")).end(querystring.stringify({
			// TODO: Move somewhere save
			"privatekey" : "6Lee6dYSAAAAAA-tOz-Csu1pVs337CdcxY5uYng0",
			"remoteip" : "127.0.0.1",
		    "challenge" : form.challenge,
		    "response" : form.response
		}));
	}).queue(function(q, verified) {
		
		if(!verified) {
			badReq("Wrong Captcha Response.")();
		} else {
			http.request({
				"port" : config.couchPort,
				"path" : "/_users/org.couchdb.user:" + form.name,
				"method" : "PUT",
				"headers" : {
					"content-type" : "application/json"
				}
			}, function(pResp) {
				resp.writeHead(pResp.statusCode, http.STATUS_CODES[pResp.statusCode], pResp.headers);
				pResp.on("data", function(chunk) {
					resp.write(chunk);
				}).on("end", function() {
					resp.end();
				});
			}).on("error", function(e) {
				resp.writeHead(500, http.STATUS_CODES[500]);
				resp.end();
			}).end(JSON.stringify({
				"_id" : "org.couchdb.user:" + form.name,
				"name" : form.name,
				"email" : form.email,
				"password" : form.password,
				"roles" : [],
				"type" : "user"
			}));
		}
	});
	
}