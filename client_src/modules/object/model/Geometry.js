(function(Object) {
	
	Object.Model.Geometry = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "Geometry",
		
		"attributes" : _.defaults({
			"geometry" : {
				"type" : "enum",
				"options" : ["Cube", "Cylinder", "Sphere", "Torus"],
				"name" : "geometry",
				"_default" : "Cube"
			},
			"color" : {
				"type" : "color",
				"name" : "color",
				"_default" : 0xffffff
			},
			"opacity" : {
				"type" : "float",
				"name" : "opacity",
				"_default" : 1.0
			},
			"name" : {
				"type" : "string",
				"_default" : "new Geometry",
				"name" : "name"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));