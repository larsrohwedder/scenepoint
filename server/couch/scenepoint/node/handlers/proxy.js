function(req, resp, extra) {
	var http = require("http"),
	route = extra.route,
	request = route.request;

	extra.q.queue(function(q) {
		var headers = {};
		headers["x-forwarded-for"] = (req.headers["x-forwarded-for"] ?
			req.headers["x-forwarded-for"] + ", " : "") +
			req.connection.remoteAddress;
		headers["connection"] = req.headers["connection"];
		headers["user-agent"] = req.headers["user-agent"];
		headers["accept"] = req.headers["accept"];
		headers["accept-language"] = req.headers["accept-language"];
		headers["accept-encoding"] = req.headers["accept-encoding"];
		headers["cookie"] = req.headers["cookie"];
		headers["cache-control"] = req.headers["cache-control"];
		headers["authorization"] = req.headers["authorization"];
		headers["content-type"] = req.headers["content-type"];

		pReq = http.request({
			"method" : req.method,
			"path" : req.url.replace(new RegExp(route.path), request.path || "/"),
			"port" : request.port || config.couchPort,
			"host" : request.host || "127.0.0.1",
			"headers" : headers
		}, q.next).on("error", function(e) {
			resp.writeHead(500, http.STATUS_CODES[500]);
			resp.end();
		});
		req.on("data", function(chunk) {
			pReq.write(chunk);
		}).on("end", function() {
			pReq.end();
		});
		
	}).queue(function(q, pResp) {
		resp.writeHead(pResp.statusCode, http.STATUS_CODES[pResp.statusCode], pResp.headers);
		pResp.on("data", function(chunk) {
			resp.write(chunk);
		}).on("end", function() {
			resp.end();
//			if(route.timestamp) {
//				var a = http.request({
//					"method" : "PUT",
//					"path" : req.url.replace(new RegExp(route.path), route.timestamp || "/"),
//					"port" : request.port || config.couchPort,
//					"host" : request.host || "127.0.0.1",
//					"headers" : {
//						"authorization" : req.headers["authorization"],
//						"cookie" : req.headers["cookie"]
//					}
//				});
//				a.on("error", function(err) {});
//				a.end();
//			}
		})
	});
	
}