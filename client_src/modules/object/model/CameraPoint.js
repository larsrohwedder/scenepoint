(function(Object) {
	
	Object.Model.CameraPoint = Object.Model.PresentationObject.extend({
		
		"initialize" : function() {
			Object.Model.PresentationObject.prototype.initialize.call(this);
		},
		
		"validate" : function(attrs) {
			if(this.collection) {
				var next = this.collection.get(attrs.next);
				if(next && next.constructor.type != "CameraPoint")
					return "Next must be a Camera Point Object";
			}
		}
			
	},{

		"type" : "CameraPoint",
		
		"attributes" : _.defaults({
			"name" : {
				"type" : "string",
				"_default" : "new Camera Point",
				"name" : "name"
			},
//			"first" : {
//				"type" : "bool-unique",
//				"_default" : false,
//				"name" : "mark as first"
//			},
			"breakpoint" : {
				"type" : "bool",
				"_default" : true,
				"name" : "breakpoint"
			},
			"speed" : {
				"type" : "enum",
				"_default" : "Medium",
				"options" : ["Very Slow", "Slow", "Medium", "Fast", "Very Fast"],
				"name" : "speed"
			},
//			"next" : {
//				"type" : "object",
//				"_default" : 0,
//				"name" : "next"
//			},
			"weight" : {
				"type" : "float",
				"name" : "weight",
				"_default" : 1
			},
			"rotation" : {
				"type" : "group",
				"name" : "rotation",
				"items" : {
					"x" : {
						"type" : "float",
						"name" : "x",
						"_default" : 0
					},
					"y" : {
						"type" : "float",
						"name" : "y",
						"_default" : 0
					}
				}
			},
			"scale" : {
			}

		}, Object.Model.PresentationObject.attributes)
	});
	
}(sp.module("object")));