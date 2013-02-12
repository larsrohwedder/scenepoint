/**
 * @author Lars Rohwedder
 * helper for changing url params (hash, querystring)
 */

(function(Misc) {

	Misc.URL = (function() {
		
		var hash = {}, query = {};

		function decode(str) {
			var urlParams = {};
		    var match,
		        pl     = /\+/g,  // Regex for replacing addition symbol with a space
		        search = /([^&=]+)=?([^&]*)/g,
		        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
		        query  = str.substring(1);

		    while (match = search.exec(query))
		       urlParams[decode(match[1])] = decode(match[2]);
		    return urlParams;
		}
		
		function refresh() {
			hash = decode(window.location.hash);
			query = decode(window.location.search);
		}
		refresh();
		
		function setHash(key, val) {
			hash[key] = val;

			var s = [];
			for(var i in hash) {
				if(hash[i])
					s.push(i + "=" + hash[i]);
			}
			window.location.hash = "#" + s.join("&");
		}

		function setQuery(key, val) {
			query[key] = val;

			var s = [];
			for(var i in query) {
				if(query[i])
					s.push(i + "=" + query[i]);
			}
			window.history.pushState(null, null, "?" + s.join("&"));
		}
		
		return {
			"refresh" : refresh,
			"setHash" : setHash,
			"setQuery" : setQuery,
			"hash" : hash,
			"query" : query
		}
	}());

}(sp.module("misc")));
