(function(Object) {
	
	Object.Model.VideoPlane = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		}
			
	},{

		"type" : "VideoPlane",
		
		"attributes" : _.defaults({
			"video" : {
				"type" : "string",
				"name" : "Video URL",
				"_default" : ""
			},
			"poster" : {
				"type" : "res-texture",
				"name" : "Poster",
				"_default" : null
			},
			"starttime" : {
				"type" : "float",
				"name" : "Start Time",
				"_default" : 0
			},
			"stoptime" : {
				"type" : "float",
				"name" : "Stop Time",
				"_default" : 9999
			},
			"name" : {
				"type" : "string",
				"_default" : "new Video Plane",
				"name" : "name"
			}
		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));