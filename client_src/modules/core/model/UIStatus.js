/**
 * @author Lars Rohwedder
 * 
 * Class for several model related attributes that are not saved. 
 * Those include camera position and user session.
 */
(function(Core) {
	
	var Misc = sp.module("misc");
	
	Core.Model.UIStatus = Backbone.Model.extend({
		
		"initialize" : function() {
			this.on("change:mode", function() {
				this.set("darken", false);
				
				var mode = this.get("mode");
				Misc.URL.setHash("mode", mode);
			}, this);
			this.set("progress", 0);
			var scope = this;
			$.getJSON("/session", function(data) {
				if(data && data.userCtx)
					scope.set("userCtx", data.userCtx);
			});
		},
		
		"defaults" : {
			"userCtx" : null,
			//mode can be "edit", "source" or "play"
			"mode" : "edit",
			"progress" : 0,
			"transform" : "translate",
			"darken" : false,
			"tooltips" : false
		},
		
		"validate" : function(attrs) {
			// before going into play mode, check:
			// 1. if at least two cameras exists,
			// 2. no camera loop exists
			if(attrs.mode == "play" && this.get("mode") != "play") {
				if(this.presentation.cameraSequence.get("list").length <= 1)
					return "Camera Path too small.";
			}
			
		}
			
	});
	
}(sp.module("core")));