(function(Object) {
	
	Object.Model.Import = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "Import",
		
		"attributes" : _.defaults({
			"texture" : {
				"type" : "res-texture",
				"name" : "texture",
				"_default" : ""
			},
			"geometry" : {
				"type" : "res-geometry",
				"name" : "geometry",
				"_default" : ""
			},
			"nolighting" : {
				"type" : "bool",
				"name" : "no lighting",
				"_default" : false
			},
			"name" : {
				"type" : "string",
				"_default" : "new Import",
				"name" : "name"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));