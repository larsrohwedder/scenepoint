
(function(Core) {
	
	// dependencies
	var Object = sp.module("object");
	
	Core.View.PlayBar = Backbone.View.extend({
		
		"template" : $("#sp-tpl-playBar").html(),
		
		"initialize" : function() {
			/**
			 * calculate some static information from the camera points
			 * when mode changes to 'play'
			 */
			this.model.uiStatus.on("change:mode", function() {
				if(this.model.uiStatus.get("mode") == "play") {

					var seq = this.model.cameraSequence.get("list");
					this._numCameraPoints = seq.length;
					this._cameraBreaks = new Array(this._numCameraPoints);
					this._cameraSpeeds = new Array(this._numCameraPoints);
					
					var scope = this;
					this.model.objectList.each(function(model) {
						if(model.constructor.type == "CameraPoint") {
							var index = seq.indexOf(model.get("id"));
							if(index >= 0) {
								scope._cameraBreaks[index] = model.get("breakpoint");
								scope._cameraSpeeds[index] = 6 - Object.Model.CameraPoint.attributes.speed.options.indexOf(model.get("speed"));
							}
						}
					});
					
//					// count path waypoints and check for breaks
//					var cur, breaks = [], speeds = [];
//					this.model.objectList.each(function(model) {
//						if(model.constructor.type == "CameraPoint"
//							&& model.get("first") == true) {
//							cur = model;
//						}
//					});
//					
//					var count = 0;
//					while(cur) {
//						count ++;
//						breaks.push(cur.get("breakpoint"));
//						speeds.push(6 - Object.Model.CameraPoint.attributes.speed.options.indexOf(cur.get("speed")));
//						cur = this.model.objectList.get(cur.get("next"));
//					}
//					
//					this._numCameraPoints = count;
//					this._cameraBreaks = breaks;
//					this._cameraSpeeds = speeds;
				}
			}, this);
		},
		
		"events" : {
			"click a" : function() {
				// return to editor
				this.model.uiStatus.set("mode", "edit");
			},
			"click #play-next" : function() {
				this.next();
			},
			"click #play-prev" : function() {
				this.previous();
			}
		},
		
		"render" : function() {
			var view = {
				"lang" : window.lang
			}
			this.$el.html(Mustache.render(this.template, view));
			
			// bar disappears when mouse leaves it
			this.$el.hover(
				function() {
					$(this).find("div").show();
				},
				function() {
					$(this).find("div").hide("slide", {
						"direction": "down"
					});
				}
			);

			this.$("div").position({
				"of" : this.$el,
				"my" : "center bottom",
				"at" : "center bottom",
			});
			
			return this;
		},
		
		"resize" : function() {	
		},
		
		/**
		 * Causes interpolation from to target
		 * initial and start can be omitted
		 */
		"animate" : function(target, initial, start) {
			this._animationTarget = target;
			initial || (initial = this.model.uiStatus.get("pathTime"));
			start || (start = new Date().getTime());
			
			var s1 = this._cameraSpeeds[initial < target ? Math.floor(initial) : Math.ceil(initial) - 1],
			s2 = this._cameraSpeeds[initial < target ? Math.floor(initial) + 1 : Math.ceil(initial)],
			duration = 500 * (s1 + s2);
			
			var delta = new Date().getTime() - start;

			var t = (initial < target ? 1 : -1) * delta/duration + initial,
			// don't go beyond target
			f = initial < target ? Math.min : Math.max;
			this.model.uiStatus.set("pathTime", f(t, target));

			scope = this;
			if((target > t && initial < target)
				|| (target < t && initial > target)){
				this._animationFrame = requestAnimationFrame(function() {
					scope.animate(target, t, start + delta);
				});
			} else {
				this._animationFrame = 0;
			}
		},
		
		/**
		 * event handler for when 'next' button is pressed
		 */
		"next" : function() {
			if(this._animationFrame) {
				cancelAnimationFrame(this._animationFrame);
				this._animationFrame = 0;
				this.model.uiStatus.set("pathTime", Math.ceil(this.model.uiStatus.get("pathTime")));
			} else {
				var t = Math.floor(this.model.uiStatus.get("pathTime"));
				while(t + 1 < this._numCameraPoints - 1 && !this._cameraBreaks[t+1]) {
					t ++;
				}
				if(t + 1 < this._numCameraPoints)
					this.animate(t+1);
			}
		},

		/**
		 * event handler for when 'previous' button is pressed
		 */
		"previous" : function() {
			if(this._animationFrame) {
				cancelAnimationFrame(this._animationFrame);
				this._animationFrame = 0;
				this.model.uiStatus.set("pathTime", Math.floor(this.model.uiStatus.get("pathTime")));
			} else {
				var t = Math.ceil(this.model.uiStatus.get("pathTime"));
				while(t-1 > 0 && !this._cameraBreaks[t-1])
					t --;
				if(t - 1 >= 0)
					this.animate(t-1);
			}
		}
		
	});
	
	
}(sp.module("core")));