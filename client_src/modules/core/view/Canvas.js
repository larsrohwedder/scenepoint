(function(Core) {
	
	//dependencies
	var Resource = sp.module("resource");
	var Object = sp.module("object");
	var Misc = sp.module("misc");
	
	var near = 1.0, far = 10000.0;

	Core.View.Canvas = Backbone.View.extend({

		"initialize" : function() {
									
			//initialize THREE.js
			this.clock = new THREE.Clock(true);
			this.renderer = this.options.renderer || new THREE.WebGLRenderer({"canvas":this.el, "antialias":true});
			this.el.addEventListener("webglcontextlost", function(event) {
				console.log("context lost");
			}, false);
			this.el.addEventListener("webglcontextrestored", function(event) {
				console.log("context restored");
			});
			
			_.extend(this.renderer, Backbone.Events);
			this.renderer.setSize(this.$el.width(), this.$el.height());
			this.camera = this.options.camera || new THREE.PerspectiveCamera(45, 16/9, near, far);
			this.model.uiStatus.set("camera", this.camera);
			this.scene = this.options.scene || new THREE.Scene();
			this.sceneUI = this.options.sceneUI || new THREE.Scene();
			this._fpsCounter = 0;
			this._fpsTimer = 0;
			this.mouseX = 0, mouseY = 0;

			var controlObject = this._controlObject = new THREE.Object3D();
			this._prsntControls = new THREE.PrsntControls(controlObject);
			this._prsntControls.listen();
			controlObject.position.z = 200;
			controlObject.position.y = 500;
			controlObject.rotation.x = - Math.PI / 6;
			this._prsntControls.movementSpeed = 100.0;
			this._prsntControls.rollSpeed = 1.0;
			this.scene.add(controlObject);
			controlObject.add(this.camera);
			
			var light = new THREE.PointLight(0xffffff);
			controlObject.add(light);

			var grid = (function() {
				var floorMaterial = new THREE.MeshBasicMaterial({"color": 0xcccccc});
				var floorGeometry = new THREE.PlaneGeometry(100000, 100000);
				var lineMaterial = new THREE.LineBasicMaterial({"color": 0xffffff});
				var lineGeometry = new THREE.Geometry();
				lineGeometry.type = THREE.LinePieces;
				for(var i=-100; i<100; i++) {
					lineGeometry.vertices.push(new THREE.Vector3(i*500, 1, 10000));
					lineGeometry.vertices.push(new THREE.Vector3(i*500, 1, -10000));
					lineGeometry.vertices.push(new THREE.Vector3(10000, 1, i*500));
					lineGeometry.vertices.push(new THREE.Vector3(-10000, 1, i*500));
				}
				var line = new THREE.Line(lineGeometry, lineMaterial);
				var obj = new THREE.Mesh(floorGeometry, floorMaterial);
				obj.add(line);
				return obj;
			}());
			this.scene.add(grid);

			this.model.uiStatus.on("change:mode", function() {
				var mode = this.model.uiStatus.get("mode");
				if(mode == "play") {
					THREE.SceneUtils.showHierarchy(grid, false);
					this.scene.remove(this._displayedPath.obj);
					this.sceneUI.remove(this._displayedPath.uiObj);
				} else {
					THREE.SceneUtils.showHierarchy(grid, true);
					this.scene.add(this._displayedPath.obj);
					this.sceneUI.add(this._displayedPath.uiObj);
				}
			}, this);
			
			this.scene.fog = new THREE.Fog(0xffffff, 1, 10000);
			
			// initiate resources
			this.model.resources.renderer = this.renderer;
			// hash for refering views
			this._views = {};
			this.renderer.on("add", function(viewGL, addToScene) {
				//get id for new object
				var id;
				do {
					// IDs 0x0 to 0xFFF are reserved
					id = 0x100 * (Math.round(Math.random() * 0xFFEF) + 0x0010);
				} while(this._views[id]);
				
				viewGL.id = id;
				viewGL.render();
				
				this._views[id] = viewGL;

				if(addToScene) {
					this.scene.add(viewGL.obj);
					this.sceneUI.add(viewGL.uiObj);
				}
			}, this);
			this.renderer.on("remove", function(viewGL) {
				this.scene.remove(viewGL.obj);
				this.sceneUI.remove(viewGL.uiObj);
				delete this._views[viewGL.id];
			}, this);

			function handleAdd(model) {
				var options = {
					"model" : model,
					"resources" : this.model.resources,
					"views" : this._views,
					"renderer" : this.renderer,
					"uiStatus" : this.model.uiStatus,
					"camera" : this.camera
				};
				if(model.constructor.type === "ImagePlane") {
					this.renderer.trigger("add", new Object.ViewGL.ImagePlane(options), true);
				} else if(model.constructor.type === "Geometry") {
					this.renderer.trigger("add", new Object.ViewGL.Geometry(options), true);
				} else if(model.constructor.type === "Text3D") {
					this.renderer.trigger("add", new Object.ViewGL.Text3D(options), true);
				} else if(model.constructor.type === "TextPlane") {
					this.renderer.trigger("add", new Object.ViewGL.TextPlane(options), true);
				} else if(model.constructor.type === "Import") {
					this.renderer.trigger("add", new Object.ViewGL.Import(options), true);
				} else if(model.constructor.type === "VideoPlane") {
					this.renderer.trigger("add", new Object.ViewGL.VideoPlane(options), true);
				} else if(model.constructor.type === "CameraPoint") {
					this.renderer.trigger("add", new Object.ViewGL.CameraPoint(options), true);
				} else if(model.constructor.type === "Background") {
					this.renderer.trigger("add", new Object.ViewGL.Background(options), true);
				}
			}
			this.model.objectList.on("add", handleAdd, this);
			this.model.objectList.each(handleAdd, this);
			
			this.model.uiStatus.on("change:mode", function() {
				var prev = this.model.uiStatus.previous("mode"),
				mode = this.model.uiStatus.get("mode");
				if(mode == "play" && prev != "play") {
					this._prsntControls.unlisten();
					this.model.uiStatus.set("pathTime", 0);
					this.createPath();
				} else if(mode != "play" && prev == "play") {
					this._prsntControls.listen();
				}
			}, this);
			
			var scope = this;
			this._cameraPointViewModel = null;
			this._cameraPointView = new THREE.PerspectiveCamera(45, 16/9, 1, 10000);
			this._cameraPointView.eulerOrder = "YXZ";
			this.scene.add(this._cameraPointView);

			this._displayedPath = new Object.ViewGL.CameraPath({
				"cameraSequence" : this.model.cameraSequence,
				"objectList" : this.model.objectList
			});
			this.sceneUI.add(this._displayedPath.uiObj);
			this.scene.add(this._displayedPath.obj);
			
			function updateCameraPointView() {
				var cam = scope._cameraPointView,
				model = scope._cameraPointViewModel;
				cam.position.set(model.get("position/x"),
						model.get("position/y"),
						model.get("position/z"));
				cam.rotation.set( - model.get("rotation/x") * Math.PI / 180,
						Math.PI + model.get("rotation/y") * Math.PI / 180, 0);
			};
			this.model.objectList.on("unselect", function(model) {
				if(model.constructor.type == "CameraPoint") {
					model.off("change", updateCameraPointView, this);
					this._cameraPointViewModel = null;
				}
			}, this).on("select", function(model) {
				if(model && model.constructor.type == "CameraPoint") {
					this._cameraPointViewModel = model;
					model.on("change", updateCameraPointView, this);
					updateCameraPointView.call(this);
				}
			}, this).on("focus", function(model) {
				var pos = new THREE.Vector3(model.get("position/x"),
						model.get("position/y"),
						model.get("position/z"));
				this._prsntControls.animateTo(pos, 1);
			}, this);
			
			Object.ViewGL.TextPlane.workaround(this.scene);
			
			this.renderLoop();
		},
		
		"renderLoop" : function() {
			var delta = this.clock.getDelta();

			this._fpsTimer += delta;
			this._fpsCounter ++;
			if(this._fpsTimer > 1.0) {
				$("#sp-framerate").text((this._fpsCounter / this._fpsTimer).toFixed(2) + " FPS");
				this._fpsCounter = 0;
				this._fpsTimer = 0;
			}

			this.renderer.trigger("tick");
			
			if(this.model.uiStatus.get("mode") == "play")
				this._pathControls.update(this.model.uiStatus.get("pathTime"));
			else
				this._prsntControls.update(delta);

			var width = this.$el.width(),
			height = this.$el.height();
			
			if(this.model.uiStatus.get("darken")) { 
				this.renderer.setClearColorHex(0x000000, 1);
				this.renderer.clear(true, false, false);
			} else {				
				this.renderer.setClearColorHex(0xffffff, 1);
				this.renderer.autoClearColor = true;
				this.renderer.render(this.scene, this.camera);

				this.renderer.autoClearColor = false;
				this.renderer.render(this.sceneUI, this.camera);
				
				if(this._cameraPointViewModel && this.model.uiStatus.get("mode") == "edit") {
					this.renderer.enableScissorTest(true);
					this.renderer.setScissor(
							Math.floor(width * 2 / 3) - 1, 0, 
							Math.ceil(width * 1 / 3) + 1, Math.floor(height * 1 / 3) + 1);
					this.renderer.setViewport(
							Math.floor(width * 2 / 3), 0, 
							Math.ceil(width * 1 / 3), Math.floor(height * 1 / 3));

					this.renderer.autoClearColor = true;
					this.renderer.render(this.scene, this._cameraPointView);

					this.renderer.enableScissorTest(false);
					this.renderer.setViewport(0, 0, width, height);
				}
			}

			if(this._fpsCounter % 10 === 0
				&& this.model.uiStatus.get("mode") != "play"
				&& this.$el.css("cursor") != "move") { //check for object hovering only every 10 frames
				var id = this.getObjectAtPosition(this.mouseX, this.mouseY);
				if(id > 0) {
					this.$el.css("cursor", "pointer");
				} else {
					this.$el.css("cursor", "default");
				}
		 	}

			this._requestID = requestAnimationFrame($.proxy(this.renderLoop, this));
		},
		
		"cancelLoop" : function() {
			if(this._requestID)
				cancelAnimationFrame(this._requestID);
		},
		
		"events" : {
			
			// delegate mouse events to ViewGLs
			"mousedown" : function($e) {
				if(this.model.uiStatus.get("mode") == "play")
					return;
				
		    	var x = $e.pageX - $e.target.offsetLeft;
		    	var y = $e.pageY - $e.target.offsetTop;
		    	var id = this.getObjectAtPosition(x, y);
		    	this._mouseDelegate = id;
		    	var masked = id & 0xFFFFFF00;
		    	if(masked > 0 && this._views[masked]) {
	    			this._views[masked].trigger("mousedown", 
	    				Misc.EventGL.fromDOMEvent($e, this.camera, {"target" : id}));
		    	}
				this._lastEvent = "mousedown";
		    	
			},
			
			"mousemove" : function($e) {
				if(this.model.uiStatus.get("mode") == "play")
					return;
				
				this.mouseX = $e.pageX - $e.target.offsetLeft;
				this.mouseY = $e.pageY - $e.target.offsetTop;
		    	var masked = this._mouseDelegate & 0xFFFFFF00;
	    		if(masked > 0 && this._views[masked]) {
		    		this.$el.css("cursor", "move");
	    			this._views[masked].trigger("mousemove", 
		    			Misc.EventGL.fromDOMEvent($e, this.camera, {"target" : this._mouseDelegate}));
	    		}
				this._lastEvent = "mousemove";
			},
			
			"mouseup" : function($e) {
				if(this.model.uiStatus.get("mode") == "play")
					return;

				this.mouseX = $e.pageX - $e.target.offsetLeft;
				this.mouseY = $e.pageY - $e.target.offsetTop;
		    	var masked = this._mouseDelegate & 0xFFFFFF00;
	    		if(masked > 0 && this._views[masked]) {
	    			var eventGL = Misc.EventGL.fromDOMEvent($e, this.camera, {"target" : this._mouseDelegate});
	    			this._views[masked].trigger("mouseup", eventGL);
	    			if(this._lastEvent == "mousedown")
		    			this._views[masked].trigger("click", eventGL);
	    		} else if(this._lastEvent == "mousedown") {
	    			// click to empty area
	    			this.model.objectList.select(null);
	    		}
	    		this.$el.css("cursor", "default");
		    	this._mouseDelegate = 0;
				this._lastEvent = "mouseup";
			},

			"mouseout" : function($e) {
				if(this.model.uiStatus.get("mode") == "play")
					return;
				
		    	var masked = this._mouseDelegate & 0xFFFFFF00;
	    		if(masked > 0 && this._views[masked]) {
    				var event = Misc.EventGL.fromDOMEvent($e, this.camera, {"target" : this._mouseDelegate});
	    			this._views[masked].trigger("mouseout", event);
	    		}
	    		this.$el.css("cursor", "default");
		    	this._mouseDelegate = 0;
				this._lastEvent = "mouseout";
		    	
		    	return false;
			},
			
			"dragover" : function() {return false;},
			"dragenter" : function() {return false;},
			"drop" : function($e) {
				if(this.model.uiStatus.get("mode") == "play")
					return;
				
				$e.preventDefault();
				$e.stopPropagation();
		    	var x = $e.originalEvent.clientX - $e.target.offsetLeft;
		    	var y = $e.originalEvent.clientY - $e.target.offsetTop;
		    	var id = this.getObjectAtPosition(x, y);
		    	var masked = id & 0xFFFFFF00;
		    	if(masked > 0 && this._views[masked]) {
		    		this._views[masked].trigger("drop", Misc.EventGL.fromDOMEvent($e, this.camera, {"target" : this._mouseDelegate}));
		    	} else {
		    		var file = $e.originalEvent.dataTransfer.files[0];
		    		console.debug("file type: " + file.type);
		    		if(file.type.match(/image.*/)) {
			    		Resource.Model.Resource.fromFile(file, function(texture) {
			    			var id = this.model.resources.createID();
			    			texture.set("id", id);
			    			this.model.resources.add(texture);
			    			this.model.addObject("ImagePlane", {"image":id });
			    		}, this);
		    		} else if(file.type.match(/video.*/)) {
			    		Resource.Model.Resource.fromFile(file, function(texture) {
			    			var id = this.model.resources.createID();
			    			texture.set("id", id);
			    			this.model.resources.add(texture);
			    			this.model.addObject("VideoPlane", {"video":id });
			    		}, this);
		    		} else if(true || file.type == "text/plain") {
			    		Resource.Model.Resource.fromFile(file, function(mesh) {
			    			var id = this.model.resources.createID();
			    			mesh.set("id", id);
			    			this.model.resources.add(mesh);
			    			this.model.addObject("Import", {"geometry":id });
			    		}, this);
		    		} else /*if(file.type == "application/json")*/ {
		    			var reader = new FileReader(),
		    			_this = this;
		    			reader.onload = function(e) {
			    			var obj = JSON.parse(e.target.result);
			    			if(obj._attachments && obj.objects) {
			    				_this.model.clear();
			    				_this.model.inflate(obj);
			    			}
		    			};
		    			reader.readAsText(file, "utf-8");
		    		}
		    	}
		    	return false;
			}
		},
				
		"getObjectAtPosition" : (function() {
			var renderTarget = new THREE.WebGLRenderTarget(1, 1),
			pickingMaterial = new THREE.PickingMaterial();
			renderTarget.generateMipmaps = false;
			
			return function(x, y) {
				var width = this.$el.width(),
					height = this.$el.height();
				
				//draw use object ids as colors and draw them
				this.scene.overrideMaterial = pickingMaterial;
				this.sceneUI.overrideMaterial = pickingMaterial;
				//use a 1x1 pixel framebuffer to save resources
				this.camera.setViewOffset(width, height, x, y, 1, 1);

				this.renderer.setClearColorHex(0x000000, 1);

				this.renderer.autoClearColor = true;
				this.renderer.render(this.scene, this.camera, renderTarget);

				this.renderer.autoClearColor = false;
				this.renderer.render(this.sceneUI, this.camera, renderTarget);
				
				//reset
				this.camera.setViewOffset(width, height, 0, 0, width, height);
				this.scene.overrideMaterial = null;
				this.sceneUI.overrideMaterial = null;
				
				var pixels = new Uint8Array(4);
				var gl = this.renderer.getContext();
				gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
				var id = (pixels[0] << 16) | (pixels[1] << 8) | (pixels[2]);
				return id;
			}	
		}()),
		
		"createPath" : function() {
			var seq = this.model.cameraSequence.get("list"),
			points = new Array(3 * seq.length - 2),
			xRotations = new Array(seq.length),
			yRotations = new Array(seq.length);
			
			this.model.objectList.each(function(model) {
				if(model.constructor.type == "CameraPoint") {
					var index = seq.indexOf(model.get("id"));
					if(index >= 0) {
						// 3 Points for Bezier Curve
						var v1 = new THREE.Vector3(model.get("position/x"),
								model.get("position/y"),
								model.get("position/z"));
						weight = model.get("weight"),
						rot = model.get("rotation/y");
						
						points[3 * index] = v1;
						xRotations[index] = model.get("rotation/x");
						yRotations[index] = rot;
						
						if(index > 0) {
							var v0 = v1.clone();
							v0.addSelf(new THREE.Vector3(100 * weight * Math.cos(rot * Math.PI / 180), 0, 100 * (-weight) * Math.sin(rot * Math.PI / 180)));
							points[3 * index - 1] = v0;
						}
						if(index < seq.length - 1) {
							var v2 = v1.clone();
							v2.subSelf(new THREE.Vector3(100 * weight * Math.cos(rot * Math.PI / 180), 0, 100 * (-weight) * Math.sin(rot * Math.PI / 180)));
							points[3 * index + 1] = v2;
						}
					}
				}
			});
			this._pathControls = new THREE.CameraPathControls(this._controlObject, points, xRotations, yRotations);

//			curModel, first = true;
//			this.model.objectList.each(function(model) {
//				if(model.constructor.type == "CameraPoint"
//					&& model.get("first") == true) {
//					curModel = model;
//				}
//			});
//			while(curModel) {
//				var weight = curModel.get("weight") * 100, 
//				x = curModel.get("position/x"), 
//				y = curModel.get("position/y"), 
//				z = curModel.get("position/z"), 
//				rot = curModel.get("rotation/y"), 
//				next = curModel.get("next"),
//				nextModel = this.model.objectList.get(next);
//				
//				var v1 = new THREE.Vector3(x, y, z);
//				if(!first) {
//					var v0 = v1.clone();
//					v0.addSelf(new THREE.Vector3(weight * Math.cos(rot * Math.PI / 180), 0, -weight * Math.sin(rot * Math.PI / 180)));
//					points.push(v0);
//				}
//				points.push(v1);
//				if(nextModel) {
//					var v2 = v1.clone();
//					v2.subSelf(new THREE.Vector3(weight * Math.cos(rot * Math.PI / 180), 0, -weight * Math.sin(rot * Math.PI / 180))); 
//					points.push(v2);
//				}
//				
//				xRotations.push(curModel.get("rotation/x"));
//				yRotations.push(curModel.get("rotation/y"));
//
//				first = false;
//				curModel = nextModel;
//			}
//			this._pathControls = new THREE.CameraPathControls(this._controlObject, points, xRotations, yRotations);
		},
		
		"resize" : function() {
			this.renderer.setSize(this.$el.width(), this.$el.height());
		}
		
	});
	
}(sp.module("core")));