(function(Object) {

	Object.Model.Background = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "Background",
		
		"attributes" : _.defaults({
			"skybox" : {
				"type" : "res-texture",
				"name" : "skybox",
				"_default" : ""
			},
			"name" : {
				"type" : "string",
				"_default" : "new Background",
				"name" : "name"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));