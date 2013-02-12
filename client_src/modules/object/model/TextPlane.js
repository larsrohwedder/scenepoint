(function(Object) {
	
	Object.Model.TextPlane = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "TextPlane",
		
		"attributes" : _.defaults({
			"name" : {
				"type" : "string",
				"_default" : "new Text Plane",
				"name" : "name"
			},
			"content" : {
				"type" : "bigString",
				"_default" : "Text",
				"name" : "content"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));