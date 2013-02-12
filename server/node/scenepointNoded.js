#!/usr/bin/env node

var http = require("http"),
https = require("https"),
fs = require("fs"),
url = require("url");

// log independent from CouchDB (using a log file, found in CouchDB/bin folder)
function file_log(msg) {
	fs.appendFile("log.txt", new Date() + ": " + msg + "\r\n");
}
	
/*
 * Queue utils for chaining asynchronous tasks
 */
var Queue = (function() {
	var Queue = function(f, options) {
		options || (options = {});
		var finished = false,
		nextEl;
		
		this.queue = function(h) {
			nextEl = new Queue(h, options);
			if(finished)
				nextEl.run();
			return nextEl;
		};
		this.run = function() {			
			var args = new Array(arguments.length + 1),
			len = arguments.length || 0;
			args[0] = this;
			for(var i=0; i<len; i++)
				args[i + 1] = arguments[i];
			
			if(typeof options.onException == "function") {
				try {
					f.apply(this, args);
				} catch(e) {
					options.onException.call(this, e, this);
				}
			} else {
				f.apply(this, args);
			}
			return this;
		};
		this.next = function() {
			finished = true;
			if(nextEl)
				nextEl.run.apply(nextEl, arguments);
			return this;
		};
	}

	return function(options) {
		Queue.call(this, null, options);
		this.next();
	};
}());

/*
 * Couch Utils
 */
	
process.stdin.resume();

var couch = {
	"log" : function(msg) {
		process.stdout.write(JSON.stringify(["log", msg]) + "\r\n");	
	},
	"get" : function(section, id) {
		process.stdout.write(JSON.stringify(["get", section, id]) + "\r\n");
	},
	"input" : process.stdin,
	"require" : (function() {
		cache = {};
		return function(id) {
			if(typeof cache[id] != "undefined")
				return cache[id];
			else {
				var parts = id.split("/"), cur = designDoc;
				for(var i=0; i<parts.length; i++) {
					if(typeof cur == "object")
						cur = cur[parts[i]];
					else
						break;
				}
				if(typeof cur == "string") {
					var js;
					try {
						js = eval("(" + cur + ")");
					} catch(e) {
						couch.log(e.stack);
					}
					if(typeof js == "function") {
						return cache[id] = js;
					} else {
						return cache[id] = null;
					}
				}
				return cache[id] = null;
			}
		}
	}()),
	"getUserCtx" : function(req, callback) {
		http.get({
			"port" : config.couchPort,
			"path" : "/_session",
			"headers" : {
				"authorization" : req.headers["authorization"],
				"cookie" : req.headers["cookie"]
			}
		}, function(res) {
			var data = "";
			res.on("data", function(chunk) {
				data += chunk;
			}).on("end", function() {
				try {
					callback(JSON.parse(data).userCtx);
				} catch(e) {
					callback(null);
				}
			});
		}).on("error", function() {
			callback(null);
		});
	}
};

/*
 * stdio end indicates CouchDB has stopped
 */
couch.input.on("end", function () {
    process.exit(0);
});
process.on("uncaughtException", function(e) {
	file_log(e.stack);
	couch.log(e.stack);
	process.exit(1);
})

/*
 * read config values and design doc from database
 */
var config = {
	"nodePort" : ["noded", "port"],
	"key" : ["noded", "key"],
	"cert" : ["noded", "cert"],
	"designPath" : ["noded", "designPath"],
	"auth" : ["noded", "auth"],
	"couchPort" : ["httpd", "port"]
}, designDoc;

(function() {
	var q = new Queue();
	
	// take config either from couchdb or from a file
	if(process.argv[0] == "node")
		process.argv.splice(0, 1);
	if(process.argv.length > 1) {
		q = q.queue(function(q) {
			fs.readFile(process.argv[1], function(err, data) {
				var parseErr = false;
				try {
					var json = JSON.parse(data);
				} catch(e) {
					parseErr = true;
				}
				if(err) {
					console.log(err);
				} else if(parseErr) {
					console.log("Error parsing config file.");
				} else {
					config = json;
					console.log(json);
					q.next();
				}
			});
		});
	} else {
		for(var j in config) {
			(function() {
				// local copy of j (otherwise overwritten by loop)
				var i = j;
				q = q.queue(function(q) {
					couch.get.apply(this, config[i]);
					couch.input.once("data", function(data) {
						try {
							config[i] = JSON.parse(data);
						} catch(e) {
							couch.log("Warning: Could not fetch config value " + config[i] + "\n"
									+ "reason: " + e.stack);
						}
						q.next();
					});
				});
			}());
		}
	}
	return q;
}()).queue(function(q) {
	http.get({
		"path" : config.designPath,
		"port" : config.couchPort
	}, function(resp) {
		var data = "";
		resp.on("data", function(chunk) {
			data += chunk;
		}).on("end", function() {
			q.next(data);
		});
	}).on("error", function() {
		couch.log("No design document received.");
		q.next();
	});
}).queue(function(q, data) {
	try {
		designDoc = JSON.parse(data);
	} catch(e) {
		couch.log("Warning: could not fetch design doc.");
	}

	onload();
});

function onload() {
	
	// 8080h indicates standard http, plain 8080 means https
	var server, port;
	if(config.nodePort[config.nodePort.length-1] == "h") {
		server = http.createServer();
		port = parseInt(config.nodePort.substring(0, config.nodePort.length-1));
	} else {
		server = https.createServer({
			"key" : fs.readFileSync(config.key),
			"cert" : fs.readFileSync(config.cert)
		});
		port = parseInt(config.nodePort);
	}

	server.on("request", function (req, resp) {

		var path = url.parse(req.url).path;
		try {
			var routes = designDoc.node.routes || [];
		} catch(e) {
			var routes = [];
		}
		var f, route;
		
		/*
		 * _admin API:
		 * check if user has admin rights and if so, let him pass
		 * directly to CouchDB.
		 * Usefull for uploading documents manually (especially new design docs)
		 */
		if(/^\/_admin(\/.*|$)/i.test(path)) {

			f = function(req, resp, options) {
				// we might receive data before userCtx is received
				var pReq, data = "", ended = false;
				req.on("data", function(chunk) {
					if(pReq)
						pReq.write(chunk);
					else
						data += chunk;
				}).on("end", function() {
					if(pReq)
						pReq.end();
					else
						ended = true;
				});
				
				options.q.queue(function(q) {
					couch.getUserCtx(req, q.next);
					
				}).queue(function(q, userCtx) {
					// check for admin rights
					if(!userCtx || !userCtx.roles 
							|| userCtx.roles.indexOf("_admin") == -1) {
						resp.writeHead(401, http.STATUS_CODES[401], {
							"WWW-Authenticate" : "Basic realm=\"CouchDB\""
						});
						resp.end();
						return;
					}
					
					pReq = http.request({
						"host" : "127.0.0.1",
						"method" : req.method,
						"path" : req.url.replace(/^\/_admin(\/.*|$)/i, "$1"),
						"port" : config.couchPort,
						"headers" : {
							"x-forwarded-for" : (req.headers["x-forwarded-for"] ?
									req.headers["x-forwarded-for"] + ", " : "") +
									req.connection.remoteAddress,
							"authorization" : req.headers["authorization"]
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
					});
					
					pReq.write(data);
					if(ended)
						pReq.end();
				});
			}
		} else {
			/*
			 * Design API:
			 * Check routes defined in the design doc
			 */
			for(var i=0; i<routes.length; i++) {
				var methodMatched = false;
				if(typeof routes[i].method == "undefined")
					methodMatched = true;
				else if(typeof routes[i].method == "string")
					methodMatched = routes[i].method == "*" || routes[i].method == req.method;
				else if(typeof routes[i].method == "object")
					methodMatched = routes[i].method.indexOf(req.method) != -1;
				if(methodMatched && new RegExp(routes[i].path, "i").test(path)) {
					f = couch.require("node/handlers/" + routes[i].handler);
					route = routes[i];
					break;
				}
			}
		}
		
		/*
		 * if a valid handler is found, execute it.
		 */
		if(f) {
			new Queue({
				"onException" : function(e) {
					resp.writeHead(500, http.STATUS_CODES[500]);
					resp.end(JSON.stringify(e.stack));
				}
			}).queue(function(q) {
				f.call(this, req, resp, {
					"route" : route,
					"q" : q
				});
			}).next();
		} else {
			resp.writeHead(404, http.STATUS_CODES[404]);
			resp.end();
		}
		
	}).listen(port);
}