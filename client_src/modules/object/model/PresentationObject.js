/**
 * Base class for all Presentation object models
 * Also defines their attributes
 */

(function(Object) {
	
	// utility function for vector attributes
	function vector3(name, def) {
		return {
			"type" : "group",
			"name" : name,
			"items" : {
				"x" : {
					"type" : "float",
					"name" : "x",
					"_default" : def
				},
				"y" : {
					"type" : "float",
					"name" : "y",
					"_default" : def
				},
				"z" : {
					"type" : "float",
					"name" : "z",
					"_default" : def
				}
			}
		}
	};
	
	Object.Model.PresentationObject = Backbone.Model.extend({
		
		"initialize" : function() {
			// propagate changes to groups
			// e.g. change events from 'position/x' also trigger event 'position'
			this.on("change", function(model, options) {
				var changes = options.changes;
				var called = {};
				
				for(var i in changes) {
					var parts = i.split("/");
					
					while(parts.pop()) {
						var name = parts.join("/");
						if(!called[name]) {
							called[name] = true;
							this.trigger("change:"+name);
						}
					}
				}
			}, this);
			
			//apply defaults from class attributes
			var defaults = (function f(attrs) {
				var result = {};
				for(var i in attrs) {
					var attr = attrs[i];
					if(attr.type === "group") {
						children = f(attr.items);
						for(var j in children) {
							result[attr.name+"/"+j] = children[j];
						}
					} else {
						result[i] = attr._default;
					}
				}
				return result;
			}(this.constructor.attributes));

			for(var i in defaults) {
				if(this.get(i) === undefined) {
					this.set(i, defaults[i]);
				}
			}
			
		},
		
		// remove Backbone's built in destroy synchronization with server
		// by overriding the function
		"destroy" : function() {
			this.trigger("destroy", this, this.collection);
		},
		
		// function called when object is serialized
		"toJSON" : function() {
			var json = Backbone.Model.prototype.toJSON.call(this);
			// add constructor type (each subclass defines its own type)
			json.type = this.constructor.type;
			
			return json;
		}
		
	}, {
		
		"type" : "PresentationObject",
		
		"attributes" : {
			"position" : vector3("position", 0),
			"rotation" : vector3("rotation", 0),
			"scale" : vector3("scale", 1),
			"name" : {
				"type" : "string",
				"name" : "name",
				"_default" : "new Object"
			}
		},
		
		// helper to get attribute object as defined above from path 
		// e.g. position/x -> { "type": "float", "_def...
		"getAttribute" : function(fullname) {
			var parts = fullname.split("/"), 
			attr = this.attributes;
			for(var i=0; i<parts.length; i++) {
				attr = attr[parts[i]];
				if(!attr)
					return null;
			}
			return attr;
		}
		
	});
	
}(sp.module("object")));