//for more details see:
//http://weblog.bocoup.com/organizing-your-backbone-js-application-with-modules/

var sp = {
 // Create this closure to contain the cached modules
 module: (function() {
    // Internal module cache.
    var modules = {};
  
    // Create a new module reference scaffold or load an
    // existing module.
    return function(name) {
      // If this module has already been created, return it.
      if (modules[name]) {
        return modules[name];
      }

      // Create a module and save it under this name
      if(name == "core") {
    	  return modules[name] = {
    			  "Model":{}, 
    			  "View":{} 
    	  };
      } else if(name == "object") {
    	  return modules[name] = {
    			  "Model":{}, 
    			  "ViewGL":{}, 
    	  };
      } else if(name == "resource") {
    	  return modules[name] = {
    			  "Model":{}
    	  };
      } else {
	      return modules[name] = {};
      }
    };
  }())
};

$(function() {
	
	var Core = sp.module("core"),
	Misc = sp.module("misc");
	
	// load some dependencies, then start the application

	new Misc.Queue().queue(function(q) {
		// setup language

		// get url query attributes
		var i=1, query = window.location.search, lang;
		while(0 < i) {
			var j = query.indexOf("=", i);
			var nexti = query.indexOf("&", i)+1;
			if(query.substring(i, j) === "lang") {
				lang = query.substring(j+1, nexti == 0 ? query.length : nexti-1);
			}
			i = nexti;
		}
		lang = (lang && ["en", "de"].indexOf(lang) >= 0) ? lang : "en";
		
		$.getJSON("assets/json/lang/"+lang+".json", function(data) {
			
			window.lang = data;
			q.next();
			
		}).error(function() {

			$("body").html(Mustache.render($("#sp-tpl-error-fullpage").html(), {
				"shortErr" : "Language Error.",
				"longErr" : "The page failed to load the language files."
			}));
			
		});
	}).queue(function() {
		new Core.View.Window({"model":new Core.Model.Presentation()});
	});
		
});
