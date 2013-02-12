(function(Object) {
	
	Object.Model.Text3D = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "Text3D",
		
		"attributes" : _.defaults({
			"color" : {
				"type" : "color",
				"name" : "color",
				"_default" : 0x808080
			},
			"name" : {
				"type" : "string",
				"_default" : "new Text",
				"name" : "name"
			},
			"content" : {
				"type" : "string",
				"_default" : "Text",
				"name" : "content"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));