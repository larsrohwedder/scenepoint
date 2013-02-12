/**
 * @author Lars Rohwedder
 * 
 * Abstract Class for all Presentation Object ViewGLs.
 * Similar concept to Backbone's View class but based
 * on an Object3D in THREE.js' Scene instead of
 * a DOM element in the document
 */

(function(Object) {
	
	Object.ViewGL.PresentationObject = Backbone.View.extend({
		"initialize" : function() {
			if(!this.obj) {
				this.obj = new THREE.Object3D();
				this.obj.eulerOrder = "YXZ";
			} if(!this.uiObj) {
				this.uiObj = new THREE.Object3D();
				this.uiObj.eulerOrder = "YXZ";
			}

			this.on("click", function() {
				if(this.model.collection && this.model.collection.select)
					this.model.collection.select(this.model);
			});
			
			this.model.on("destroy", function() {
				this.options.renderer.trigger("remove", this);
				this.options.renderer.trigger("destroy", this);
			}, this);
			
			this.model.on("select", function() {
				if(this.model.collection) {
					var controller = new Object.ViewGL.Controller(_.defaults({
						"delegate" : this
					}, this.options));
					controller.on("remove", function() {
						this.obj.remove(controller.obj);
						this.uiObj.remove(controller.uiObj);
					}, this);
					this.obj.add(controller.obj);
					this.uiObj.add(controller.uiObj);
					this.options.renderer.trigger("add", controller, false);
				}
			}, this).on("add", function() {
				this.trigger("add", this);
			}, this).on("remove", function() {
				this.trigger("remove", this);
			}, this);
			
			//attributes
			this.model.on("change:position", function() {
				this.obj.position.set(this.model.get("position/x"),
						this.model.get("position/y"),
						this.model.get("position/z"));
				this.uiObj.position.set(this.model.get("position/x"),
						this.model.get("position/y"),
						this.model.get("position/z"));
			}, this);
			this.model.on("change:scale", function() {
				this.obj.scale.set(this.model.get("scale/x") || 1,
						this.model.get("scale/y") || 1,
						this.model.get("scale/z") || 1);
				this.uiObj.scale.set(this.model.get("scale/x") || 1,
						this.model.get("scale/y") || 1,
						this.model.get("scale/z") || 1);
			}, this);
			this.model.on("change:rotation", function() {
				this.obj.rotation.set(this.model.get("rotation/x")*Math.PI/180,
						this.model.get("rotation/y")*Math.PI/180,
						this.model.get("rotation/z")*Math.PI/180);
				this.uiObj.rotation.set(this.model.get("rotation/x")*Math.PI/180,
						this.model.get("rotation/y")*Math.PI/180,
						this.model.get("rotation/z")*Math.PI/180);
			}, this);

			this.on("mousedown", this.down, this);
			this.on("mousemove", this.move, this);
			this.on("mouseout", this.moveCommit, this);
			this.on("mouseup", this.moveCommit, this);

			this.model.trigger("change:position");
			this.model.trigger("change:scale");
			this.model.trigger("change:rotation");
		},
		
		// control for drag and drop
		// if possible set the model's attribute after dropping
		// because of high overhead
		
		"down" : function(event) {
			var pos = this.obj.position.clone();
			var n = event.ray.direction.clone();
			pos.subSelf(event.ray.origin);
			var d = pos.dot(event.ray.direction);
			this._moveAnchor = event.ray.origin.clone().addSelf(n.multiplyScalar(d)).subSelf(this.obj.position);
		},
		
		"move" : function(event) {
			//intersect ray with XZ plane
			var intersection, factor, y = this.obj.position.y + this._moveAnchor.y;
			intersection = event.ray.direction.clone();
			factor = (y - event.ray.origin.y) / event.ray.direction.y;
			if(factor > 0) {
				intersection.multiplyScalar(factor);
				intersection.addSelf(event.ray.origin);
				
				this.obj.position.x = this.uiObj.position.x = intersection.x - this._moveAnchor.x;
				this.obj.position.z = this.uiObj.position.z = intersection.z - this._moveAnchor.z;
				if(this._updatePositionInstantly)
					this.moveCommit();
				
				if(this.snappable) {
					this.snap(this.obj.position);
				}
			}
		},
		
		"moveCommit" : function(event) {
			if(this.snappable) {
				this.snapCommit();
			}
			this.model.set({
				"position/x" : this.obj.position.x, 
				"position/y" : this.obj.position.y, 
				"position/z" : this.obj.position.z
			});
		},
		
		"snap" : function(position) {
			var snap = (function() {
				var inv = new THREE.Matrix4();
				for(var i in this.options.views) {
					var view = this.options.views[i],
					planes = view.planes || [];
					for(var j=0; j<planes.length; j++) {
						var plane = planes[j],
						localPos = position.clone();
						inv.getInverse(plane.matrixWorld);
						inv.multiplyVector3(localPos);
						if(localPos.y > 0 && localPos.y < 10
								&& localPos.x < 50 && localPos.x > -50
								&& localPos.z < 50 && localPos.z > -50) {
							return {
								"view" : view,
								"index": j,
								"offset" : localPos
							};
						}
					}
				}
			}.call(this));
			if(snap)
				snap.view.trigger("snap", snap.index);
			if(this.snapped && (!snap || (this.snapped.view != snap.view && this.snapped.index != snap.index)))
				this.snapped.view.trigger("unsnap", this.snapped.index);
			this.snapped = snap
		},

		"snapCommit" : function() {
			if(this.snapped) {
				this.snapped.view.trigger("unsnap", this.snapped.index);
				
				var pos = this.snapped.offset,
				look = this.snapped.offset.clone(),
				curXRot = this.model.get("rotation/x") * Math.PI / 180,
				curYRot = this.model.get("rotation/y") * Math.PI / 180,
				mat = this.snapped.view.planes[this.snapped.index].matrixWorld;
				
				// position
				// add random offset to fight the z-fighting
				pos.y = 0.1 + Math.random() * 0.1;
				mat.multiplyVector3(pos);
				this.model.set({
					"position/x" : pos.x,
					"position/y" : pos.y,
					"position/z" : pos.z
				});
				
				function mod(x) {
					return x < 0 ? x % (2 * Math.PI) + 2 * Math.PI : x % (2 * Math.PI);
				}

				// rotation
				look.y = 1;
				mat.multiplyVector3(look);
				look.subSelf(pos);
				var yDir = look.clone(),
				xDir = look.clone();
				yDir.y = 0;
				yDir.normalize();
				var yRot = Math.acos(yDir.z);
				if(yDir.x < 0)
					yRot = 2 * Math.PI - yRot;
				
				// turn 180 degrees, if object faces opposite direction
				if(mod(yRot - curYRot + Math.PI / 2) > Math.PI)
					yRot += Math.PI;

				new THREE.Matrix4().makeRotationY(-yRot).multiplyVector3(xDir);
				xDir.normalize();
				var xRot = Math.acos(xDir.y);
				if(xDir.z < 0)
					xRot = 2 * Math.PI - xRot;

				xRot -= Math.PI / 2;
				if(mod(xRot - curXRot + Math.PI / 2) > Math.PI)
					xRot += Math.PI;
				
				xRot = mod(xRot) * 180 / Math.PI;
				yRot = mod(yRot) * 180 / Math.PI;

				this.model.set({
					"rotation/x" : xRot,
					"rotation/y" : yRot
				});

				this.snapped = null;
				
			}
		}

	});
	
}(sp.module("object")));