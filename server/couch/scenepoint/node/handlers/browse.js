function(req, resp, options) {
	
	var url = require("url").parse(req.url, true),
	querystring = require("querystring"),
	http = require("http"),
	target = url.query["target"];
	
	if(["my", "team", "open"].indexOf(target) == -1) {
		resp.writeHead(400);
		resp.end();		
		return;
	}

	options.q.queue(function(q) {
		couch.getUserCtx(req, q.next);
		
	}).queue(function(q, userCtx) {
		var query,
		user = userCtx ? userCtx.name : null;
		if(target == "open") {
			query = querystring.stringify({
				"limit" : url.query.limit,
				"skip" : url.query.skip,
				"descending" : true
			});
		} else {
			query = querystring.stringify({
				"startkey" : JSON.stringify([user, ""]),
				"endkey" : JSON.stringify([user]),
				"limit" : url.query.limit,
				"skip" : url.query.skip,
				"descending" : true
			});
		}
		
		http.request({
			"path" : "/scenepoint/_design/app/_view/" + target + "_presentations" + (query ? "?" + query : ""),
			"host" : "127.0.0.1",
			"port" : config.couchPort
		}, q.next).on("error", function(e) {
			resp.writeHead(500);
			resp.end(JSON.stringify(e));
		}).end();
	}).queue(function(q, pResp) {
		
		resp.writeHead(200, http.STATUS_CODES[200], {
			"content-type" : "application/json"
		});
		pResp.on("data", function(chunk) {
			resp.write(chunk);
		}).on("end", function() {
			resp.end();
		});
	})
	
}