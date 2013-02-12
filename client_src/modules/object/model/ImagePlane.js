(function(Object) {
	
	Object.Model.ImagePlane = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "ImagePlane",
		
		"attributes" : _.defaults({
			"image" : {
				"type" : "res-texture",
				"name" : "image",
				"_default" : ""
			},
			"name" : {
				"type" : "string",
				"_default" : "new Image Plane",
				"name" : "name"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));