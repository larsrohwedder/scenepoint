/**
 * @author Lars Rohwedder
 * 
 * The single top-level presentation object in the application.
 * On opening a new presentation, the instance is not replaced, but
 * instead updated with the new values.
 * This keeps existing event listeners correctly.
 * 
 * Has members 
 * objectList, resources, uiStatus, history
 * and also meta attributes like
 * _id, _rev,...
 */

(function(Core) {
	
	// dependencies
	var Resource = sp.module("resource"),
	Misc = sp.module("misc"),
	Object = sp.module("object");
	
	Core.Model.Presentation = Backbone.Model.extend({
		
		"initialize" : function() {
			this.cameraSequence = new Core.Model.CameraSequence();
			this.objectList = new Core.Model.ObjectList();
			this.resources = new Resource.Model.ResourceCollection();
			this.uiStatus = new Core.Model.UIStatus();
			this.uiStatus.presentation = this;
			this.history = new Misc.ChangeHistory(this);
			this.copiedObjects = [];
			this.createNew();		
			
			
			this.objectList.on("add", function(model) {
				if(model.constructor.type == "CameraPoint") 
					this.cameraSequence.push(model.get("id"));
			}, this).on("remove", function(model) {
				if(model.constructor.type == "CameraPoint") 
					this.cameraSequence.remove(model.get("id"));
			}, this);
			
			this.set("mode", Misc.URL.hash["mode"] || "edit");
			
		},

		"addObject" : function(type, attrs, silent) {
			attrs || (attrs = {});
			attrs.id || (attrs.id = this.objectList.createId());
			var cam = this.uiStatus.get("camera");
			
			// position new objects in front of camera
			// rotate y for all objects
			// rotate x for camera points
			
			// when adding camera points, put them to current view
			if(cam) {
				cam.updateMatrixWorld();
				var offset = type == "CameraPoint" ? 0 : -500,
				pos = new THREE.Vector3(0, 0, offset),
				dir = new THREE.Vector3(0, 0, offset - 10);
				
				cam.matrixWorld.multiplyVector3(pos);
				cam.matrixWorld.multiplyVector3(dir);
				dir.subSelf(pos);
				dir2 = dir.clone();
				dir.y = 0;
				dir.normalize();
				
				if(attrs["position/x"] == undefined
				  && attrs["position/y"] == undefined
				  && attrs["position/z"] == undefined) {
					attrs["position/x"] = pos.x;
					attrs["position/y"] = Math.max(pos.y, 0);
					attrs["position/z"] = pos.z;
				}
				if(attrs["rotation/y"] == undefined) {
					var rotY = Math.acos(dir.z);
					if(dir.x < 0)
						rotY = 2 * Math.PI - rotY;
					attrs["rotation/y"] = rotY * 180 / Math.PI + (type == "CameraPoint" ? 0 : 180);
					
					if(!attrs["rotation/x"] && type == "CameraPoint") {
						new THREE.Matrix4().makeRotationY(-rotY).multiplyVector3(dir2);
						dir2.normalize();
						var rotX = Math.acos(dir2.y);
						if(dir2.z < 0)
							rotX = 2 * Math.PI - rotX;
						attrs["rotation/x"] = rotX * 180 / Math.PI - 90;
					}
				}
				
			}
			var model = new Object.Model[type](attrs);
			this.objectList.add(model, {
				"silent" : silent
			});
			//select model after adding
			this.objectList.select(model);
			return model;
		},
		

		//copy selected objects into temp list
		"copySelected" : function() {
			this.copiedObjects = [];
			for(var i=0; i < this.objectList.selectedObjects.length; i++){
				this.copiedObjects.push(this.objectList.selectedObjects[i]);
			}		
		},
		
		//add all objects from the copiedObjects list
		"pasteSelected" : function() {
			var attrs;
			for(var i=0; i < this.copiedObjects.length; i++){
				attrs = this.copiedObjects[i].toJSON();
				//create ne ID
				attrs.id = this.objectList.createId();	
				
				//delete rotation y-coord so it can be rearanged in the center of screen
				attrs["rotation/y"] = undefined;
				//delete x,y,z coordinates
				attrs["position/x"] = undefined;
				attrs["position/y"] = undefined;
				attrs["position/z"] = undefined;
				this.addObject(attrs.type, attrs);	
			}
		},
		
		//ende experiment		
		
		
		"clear" : function(q) {
			var inc = typeof q != "undefined",
			i = this.objectList.length-1;
			q || (q = new Misc.Queue({
				"ctx" : this
			}));
			while(i >= 0) {
				// local scope for copy of i
				(function() {
					var j = i;
					q = q.queue(function(q) {
						this.objectList.at(j).destroy();
						q.next();
					});
				}());
				i--;
			}
			this.history.clearUndo().clearRedo();
		},
		
		"createNew" : function() {
			this.set("_id", undefined);
			this.set("_rev", undefined);
			this.set("author", undefined);
			this.set("name", "Unnamed Project");
			this.set("users", {});
			this.set("worldReadable", false);
			this.clear(new Misc.Queue({"ctx" : this, "forcebreak" : false }));
			this.addObject("Geometry", {
				"rotation/y" : 45,
				"position/x" : 0,
				"position/y" : 100,
				"position/z" : -500
			});
			this.objectList.select(null);
		},
		
		// TODO: Move other cloud functions from View.NavigationBar to here
		"openCloud" : function(id) {
			this.uiStatus.set("progress", this.uiStatus.set("progress") + 1);
			var scope = this;
			$.getJSON("/db/" + id + "?attachments=true", 
				function(obj) {
					scope.uiStatus.set("progress", scope.uiStatus.set("progress") - 1);
					if(obj) {
						var error = obj.forbidden || obj.reason || obj.error;
						if(error) {
							this.uiStatus.trigger("error", scope, "opening failed: " + error);
							return;
						}
					}
			   		obj._attachments || (obj._attachments = []);
			   		obj.objects || (obj.objects = []);
			   		if(obj._revisions)
			   			delete obj._revisions;
		    		scope.inflate(obj, new Misc.Queue({"ctx" : scope, "forcebreak" : false }));
				}
			).error(function(e) {
				scope.uiStatus.set("progress", scope.uiStatus.set("progress") - 1);
				scope.uiStatus.trigger("error", scope, "opening failed: " + e.statusText);
		    });

		},
		
		// called for deserialisation
		"inflate" : function(obj, q) {
			this.history.setEnabled(false);
			
			this.uiStatus.set("progress", this.uiStatus.set("progress") + 1);
			
			q || (q = new Misc.Queue({
				"ctx" : this
			}));
			
			this.cameraSequence.startTransaction();
			this.clear(q);
			for(var id in obj._attachments) {
				(function() {
					var local = id;
					q = q.queue(function(q) {
						this.resources.add(Resource.Model.Resource.fromJSON(obj._attachments[local], local));
						q.next();
					});
				}());
			}
			for(var i in obj.objects) {
				(function() {
					var local = i;
					q = q.queue(function(q) {
						this.addObject(obj.objects[local].type, obj.objects[local], true);
						q.next();
					});
				}());
			}			
			q.queue(function() {
				delete obj.objects;
				delete obj._attachments;
				this.set(obj);
				
				this.objectList.each(function(model) {
					this.objectList.trigger("add", model);
				}, this);
				this.objectList.trigger("inflateComplete");

				if(obj.cameraSequence)
					this.cameraSequence.set("list", obj.cameraSequence);
				this.cameraSequence.finishTransaction();
				
				this.uiStatus.set("progress", this.uiStatus.set("progress") - 1);
				this.history.setEnabled(true);
				this.history.clearUndo();
				this.history.clearRedo();
			});
		},
	
		// called for serialisation
		"toJSON" : function() {
			this.history.clearUndo().clearRedo();
			
			return _.defaults({
				"objects" : this.objectList,
				"cameraSequence" : this.cameraSequence.toJSON(),
				"_attachments" : this.resources.toJSON(false),
			}, this.attributes);
		}
		
	});
	
}(sp.module("core")));