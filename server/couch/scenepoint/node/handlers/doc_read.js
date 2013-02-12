function(req, resp, extra) {
	var http = require("http"),
	id = /\/db\/([^\?]*)/i.exec(req.url)[1];
	
	extra.q.queue(function(q) {
		
		http.request({
			"path" : "/scenepoint/_design/app/_show/validate_doc_read/" + id,
			"port" : config.couchPort,
			"headers" : {
				"authorization" : req.headers["authorization"],
				"cookie" : req.headers["cookie"]
			}
		}, function(pResp) {
			var data = "";
			pResp.on("data", function(chunk) {
				data += chunk;
			}).on("end", function() {
				if(pResp.statusCode == 200) {
					q.next();
				} else {
					resp.writeHead(pResp.statusCode, http.STATUS_CODES[pResp.statusCode], {
						"content-type" : "application/json"
					});
					resp.end(data);
				}
			});
		}).on("error", function(e) {
			resp.writeHead(500);
			resp.end();
		}).end();
		
	}).queue(function(q) {

		// on success pass document
		http.get({
			"path" : "/scenepoint/" + id + "?attachments=true",
			"port" : config.couchPort,
			"headers" : {
				// omitting would cause multipart responses for attachments
				"accept" : "application/json"
			}
		}, function(pResp) {
			resp.writeHead(200, http.STATUS_CODES[200], {
				"content-type" : "application/json"
			});
			pResp.on("data", function(chunk) {
				resp.write(chunk);
			}).on("end", function() {
				resp.end();
			});
		}).on("error", function(e) {
			resp.writeHead(500);
			resp.end();
		});
	});
}