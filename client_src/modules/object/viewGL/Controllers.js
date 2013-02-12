/**
 * @author Lars Rohwedder
 * 
 * Object class for elements that are used to manipulate
 * the objects position, rotation and scale.
 * Displayed when another object is selected.
 * 
 * the object that uses the controller should add the controller obj
 * to its Object3D and pass itself to the constructor as "delegate"
 */

(function(Object) {
	
	// initialisation of geometries and materials
	var lines = [];
	for(var i=0; i<5; i++)
		lines[i] = new THREE.Geometry();

	var red = new THREE.Color(0xff0000),
	green = new THREE.Color(0x00ff00),
	blue = new THREE.Color(0x0000ff),
	purple = new THREE.Color(0xff00ff),
	white = new THREE.Color(0xffffff);

	lines[0].vertices.push(new THREE.Vector3(0, 0, 0));
	lines[0].vertices.push(new THREE.Vector3(40, 0, 0));
	lines[0].colors = [red, red];
	lines[1].vertices.push(new THREE.Vector3(0, 0, 0));
	lines[1].vertices.push(new THREE.Vector3(0, 40, 0));
	lines[1].colors = [green, green];
	lines[2].vertices.push(new THREE.Vector3(0, 0, 0));
	lines[2].vertices.push(new THREE.Vector3(0, 0, 40));
	lines[2].colors = [blue, blue];
	lines[3].vertices.push(new THREE.Vector3(0, 0, 0));
	lines[3].vertices.push(new THREE.Vector3(0, -1, 0));
	lines[3].colors = [purple, purple];
	lines[4].vertices.push(new THREE.Vector3(0, 0, 0));
	lines[4].vertices.push(new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(40));
	lines[4].colors = [white, white];
	
	var circles = [new THREE.Geometry(), new THREE.Geometry(), new THREE.Geometry()];
	for(var i=0; i<100; i++) {
		var rad = 2 * Math.PI * i / 99;
		circles[0].vertices.push(new THREE.Vector3(0, 40 * Math.sin(rad), 40 * Math.cos(rad)));
		circles[0].colors.push(red);
		circles[1].vertices.push(new THREE.Vector3(40 * Math.sin(rad), 0, 40 * Math.cos(rad)));
		circles[1].colors.push(green);
		circles[2].vertices.push(new THREE.Vector3(40 * Math.sin(rad), 40 * Math.cos(rad), 0));
		circles[2].colors.push(blue);
	}
	
	var pointers = [],
	dots = [],
	spheres = [new THREE.Geometry()];
	for(var i=0; i<3; i++) {
		pointers[i] = new THREE.Geometry();
		dots[i] = new THREE.Geometry();
	}
	dots[3] = new THREE.Geometry();
	
	(function() {
		function colorize(g, c) {
			for(var i=0; i<g.faces.length; i++) {
				g.faces[i].color = c;
			}
		}
		
		spheres[0] = new THREE.SphereGeometry(5);
		colorize(spheres[0], white);
		
		var pointer = new THREE.CylinderGeometry(0, 5, 20, 16, 1);
		var dot = new THREE.SphereGeometry(5, 16, 12);
		
		colorize(pointer, red);
		colorize(dot, red);
		var tmp = new THREE.Mesh(pointer);
		tmp.position.set(50, 0, 0);
		tmp.rotation.set(0, 0, -Math.PI/2);
		THREE.GeometryUtils.merge(pointers[0], tmp);
		tmp.geometry = dot;
		tmp.position.set(45, 0, 0);
		THREE.GeometryUtils.merge(dots[0], tmp);
		
		colorize(pointer, green);
		colorize(dot, green);
		tmp.geometry = pointer;
		tmp.position.set(0, 50, 0);
		tmp.rotation.set(0, 0, 0);		
		THREE.GeometryUtils.merge(pointers[1], tmp);
		tmp.geometry = dot;
		tmp.position.set(0, 45, 0);
		THREE.GeometryUtils.merge(dots[1], tmp);
		
		colorize(pointer, blue);
		colorize(dot, blue);
		tmp.geometry = pointer;
		tmp.position.set(0, 0, 50);
		tmp.rotation.set(Math.PI/2, 0, 0);		
		THREE.GeometryUtils.merge(pointers[2], tmp);
		tmp.geometry = dot;
		tmp.position.set(0, 0, 45);
		THREE.GeometryUtils.merge(dots[2], tmp);
		
		colorize(dot, white);
		tmp.geometry = dot;
		tmp.rotation.set(0, 0, 0);
		tmp.position = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(45);
		THREE.GeometryUtils.merge(dots[3], tmp);
		
	}());
	
	var pointerMat = new THREE.MeshBasicMaterial({"vertexColors" : THREE.FaceColors});
	var lineMat = new THREE.LineBasicMaterial({"vertexColors" : THREE.VertexColors});

	var tPointerMat = new THREE.MeshBasicMaterial({"vertexColors" : THREE.FaceColors, "transparent" : true, "opacity" : 0.5});
	var tLineMat = new THREE.LineBasicMaterial({"vertexColors" : THREE.VertexColors, "transparent" : true, "opacity" : 0.5});
		
	Object.ViewGL.Controller = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function() {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);
			
			// container objects revert their parent transformations.
			// it would be unnecessary hard to compute inverse position, rotation, scale
			// just to let the renderer recalculate the matrix afterwards
			this.obj.matrixAutoUpdate = false;
			this.uiObj.matrixAutoUpdate = false;
			
			this.off("click", null, this);
			this.model.off("select", null, this);
			this.model.off("unselect", null, this);
			this.model.off("change:position", null, this);
			this.model.off("change:rotation", null, this);
			this.model.off("change:scale", null, this);

			this.model.on("unselect", function() {
				this.remove();
				this.options.renderer.trigger("remove", this);
				this.options.renderer.trigger("destroy", this);
				this.trigger("remove", this);
				this.trigger("destroy", this);
			}, this);

			this.options.uiStatus.on("change:mode", function() {
				var mode = this.options.uiStatus.get("mode");
				THREE.SceneUtils.showHierarchy(this.obj, mode != "play");
				THREE.SceneUtils.showHierarchy(this.uiObj, mode != "play");
			}, this);

			this.options.uiStatus.on("change:transform", function() {
				this.render();
			}, this);
			
			this.options.renderer.on("tick", function() {
				var t = this.options.uiStatus.get("transform"),
				scale = new THREE.Vector3(1, 1, 1),
				parent = this.options.delegate.obj,
				parentScale = parent.scale;
				
				// revert rotation and scale of parent
				var mat = new THREE.Matrix4();
				parent.updateMatrixWorld();
				mat.getInverse(parent.matrixWorld);

				this.obj.matrix = mat;
				this.uiObj.matrix = mat;
				
				mat.setPosition(new THREE.Vector3());
				
				var cam = this.options.camera,
				
				camPos = new THREE.Vector3();
				cam.matrixWorld.multiplyVector3(camPos);
				var dist = camPos.subSelf(parent.position).length();
				this._scalar = Math.sqrt(dist) * 0.05;
				mat.scale(new THREE.Vector3(this._scalar, this._scalar, this._scalar));

				if(this._gMesh && this._tgMesh) {
					var y = parent.position.y || 0.001;
					this._gMesh.scale.y = y / this._scalar;
					this._tgMesh.scale.y = y / this._scalar;
				}

				if(this._axis) {
					if(t == "rotate") {
						if(this._axis) {
							this._axis[0][0].rotation.set(parent.rotation.x, parent.rotation.y, 0);
							this._axis[1][0].rotation.set(parent.rotation.x, parent.rotation.y, 0);

							this._axis[0][1].rotation.set(0, parent.rotation.y, 0);
							this._axis[1][1].rotation.set(0, parent.rotation.y, 0);
							
							this._axis[0][2].rotation.set(parent.rotation.x, parent.rotation.y, parent.rotation.z);
							this._axis[1][2].rotation.set(parent.rotation.x, parent.rotation.y, parent.rotation.z);
						}
					} else if(t == "translate") {
						for(var i=0; i<3; i++) {
							this._axis[0][i].rotation.set(0, 0, 0);
							this._axis[1][i].rotation.set(0, 0, 0);
						}
					} else {
						for(var i=0; i<3; i++) {
							this._axis[0][i].rotation = parent.rotation.clone();
							this._axis[1][i].rotation = parent.rotation.clone();
						}
					}
				}
				
			}, this);
		},
		
		"render" : function() {
			// clear
			var i = this.obj.children.length - 1;
			var j = this.uiObj.children.length - 1;
			while(i >= 0) {
				this.obj.remove(this.obj.children[i]);
				i--;
			}
			while(j >= 0) {
				this.uiObj.remove(this.uiObj.children[j]);
				j--;
			}
			
			var t = this.options.uiStatus.get("transform"),
			icons, idOffset;
			if(t == "translate") {
				idOffset = 0x0;
				icons = pointers;
			}
			else if(t == "rotate") {
				idOffset = 0x3;
				icons = dots;
			}
			if(t == "scale") {
				idOffset = 0x6;
				icons = dots;
			}
			
			this._axis || (this._axis = [[], []]);
			
			for(var i=0; i<3; i++) {
				
				this._axis[0][i] = new THREE.Object3D();
				this._axis[0][i].eulerOrder = "YXZ";
				this._axis[1][i] = new THREE.Object3D();
				this._axis[1][i].eulerOrder = "YXZ";
				this.obj.add(this._axis[0][i]);
				this.uiObj.add(this._axis[1][i]);

				if(t == "rotate"
					&& _.isUndefined(this.model.constructor.attributes.rotation.items[["x", "y", "z"][i]]))
					continue;

				if(t == "scale" && i > 0
					&& this.model.constructor.type == "CameraPoint")
					continue;
				
				var line = new THREE.Line(lines[i], lineMat),
				tLine = new THREE.Line(lines[i], tLineMat);
				tLine.pickingId = this.id | 0x0;
				
				this._axis[0][i].add(line);
				this._axis[1][i].add(tLine);
				
				var icon = new THREE.Mesh(icons[i], pointerMat),
				tIcon = new THREE.Mesh(icons[i], tPointerMat);
				tIcon.pickingId = this.id | (0x1 + i + idOffset);

				this._axis[0][i].add(icon);
				this._axis[1][i].add(tIcon);
				
				if(t == "rotate") {
					line.rotation = tLine.rotation =
					icon.rotation = tIcon.rotation = 
						i == 0 ? new THREE.Vector3(0, 0, Math.PI / 2) :
						i == 1 ? new THREE.Vector3(Math.PI / 2, 0, 0) :
						new THREE.Vector3(0, Math.PI / 2, 0);
					
					var circle = new THREE.Line(circles[i], lineMat),
					tCircle = new THREE.Line(circles[i], tLineMat);
					tCircle.pickingId = this.id | (0x1 + i + idOffset);
					this._axis[0][i].add(circle);
					this._axis[1][i].add(tCircle);					
				}
			}
			
			if(t == "scale" && this.model.constructor.type != "CameraPoint") {
				var line = new THREE.Line(lines[4], lineMat),
				tLine = new THREE.Line(lines[4], tLineMat);
				tLine.pickingId = this.id | 0x0;				
				var icon = new THREE.Mesh(dots[3], pointerMat),
				tIcon = new THREE.Mesh(dots[3], tPointerMat);
				tIcon.pickingId = this.id | (0x1 + 3 + idOffset);
				this._axis[0][0].add(icon);
				this._axis[0][0].add(line);
				this._axis[1][0].add(tIcon);
				this._axis[1][0].add(tLine);
			}
			
			var sphere = new THREE.Mesh(spheres[0], pointerMat),
			tSphere = new THREE.Mesh(spheres[0], tPointerMat);
			tSphere.pickingId = this.id | 0x0;
			this.obj.add(sphere);
			this.uiObj.add(tSphere);

			this._gMesh = new THREE.Line(lines[3], lineMat);
			this._tgMesh = new THREE.Line(lines[3], tLineMat);
			this.obj.add(this._gMesh);
			this.uiObj.add(this._tgMesh);

			this.obj.position.set(0, 0, 0);
			this.uiObj.position.set(0, 0, 0);
			
			return this;
		},

		"down" : function(event) {
			var pos = this.options.delegate.obj.position.clone();
			var n = event.ray.direction.clone();
			pos.subSelf(event.ray.origin);
			var d = pos.dot(event.ray.direction);
			this._moveAnchor = event.ray.origin.clone().addSelf(n.multiplyScalar(d)).subSelf(this.options.delegate.obj.position);
			if(this.model.constructor.type == "CameraPoint") {
				this._initialWeight = this.model.get("weight");
			} else {
				this._initialScale = new THREE.Vector3(this.model.get("scale/x"),
						this.model.get("scale/y"),
						this.model.get("scale/z"));
			}
		},
		
		"move" : function(event) {
			var masked = event.target & 0xFF;

			if(masked === 0x1
					|| masked === 0x2
					|| masked === 0x3){
				// Translate
				
				// get point on ray with closest distance to object's X,Y or Z axis
				var axis = new THREE.Vector3(),
				n = new THREE.Vector3(),
				dir = event.ray.direction,
				diff = this.options.delegate.obj.position.clone(),
				pos = this.options.delegate.obj.position;
				
				if(masked === 0x1)
					axis.x = 1;
				else if(masked === 0x2)
					axis.y = 1;
				else
					axis.z = 1;
				
				n.cross(axis, dir);
				n.crossSelf(dir);
				
				diff.subSelf(event.ray.origin);
				
				if(masked === 0x1)
					this.options.delegate.obj.position.x = this.options.delegate.uiObj.position.x =
						- diff.dot(n)/n.x + pos.x - 45 * this._scalar;
				else if(masked === 0x2)
					this.options.delegate.obj.position.y = this.options.delegate.uiObj.position.y =
						- diff.dot(n)/n.y + pos.y - 45 * this._scalar;
				else
					this.options.delegate.obj.position.z = this.options.delegate.uiObj.position.z =
						- diff.dot(n)/n.z + pos.z - 45 * this._scalar;


				if(this.options.delegate.snappable)
					this.snap(this.options.delegate.obj.position);
				
				if(this.options.delegate._updatePositionInstantly)
					this.moveCommit();
				
			} else if(masked === 0x4
						|| masked === 0x5
						|| masked === 0x6) {
				// Rotate
				var axis = new THREE.Vector3(),
				parent = this.options.delegate.obj,
				pos = parent.position,
				dir = event.ray.direction.clone(),
				org = event.ray.origin.clone(),
				rotation = this.options.delegate.obj.rotation;

				org.subSelf(this.options.delegate.obj.position);
				
				var c;
				// normalize to y problem
				if(masked === 0x4) { 
					var m = new THREE.Matrix4().rotateZ(Math.PI / 2).rotateX(Math.PI / 2).rotateY(- parent.rotation.y);
					m.multiplyVector3(org);
					m.multiplyVector3(dir);
					c = "x";
				} else if(masked === 0x5) {
					c = "y";
				} else if(masked === 0x6) {
					var m = new THREE.Matrix4().rotateY(- Math.PI / 2).rotateX(- Math.PI / 2).rotateX(- parent.rotation.x).rotateY(- parent.rotation.y);
					m.multiplyVector3(org);
					m.multiplyVector3(dir);
					c = "z";
				}

				// intersect ray with XZ plane
				if(Math.abs(dir.y) > 0.0001) {
					var intersection, factor;
					factor = - org.y / dir.y;
					dir.multiplyScalar(factor);
					dir.addSelf(org);
					dir.normalize();

					var rot = Math.acos(dir.z);
					if(dir.x < 0)
						rot = 2 * Math.PI - rot;
					this.options.delegate.obj.rotation[c] = this.options.delegate.uiObj.rotation[c] = rot;
					if(this.options.delegate._updatePositionInstantly)
						this.moveCommit();
				}

			} else if(masked === 0x7
						|| masked === 0x8
						|| masked === 0x9
						|| masked === 0xa) {
				// Scale
				
				// get point on ray with closest distance to object's X,Y or Z axis
				var axis = new THREE.Vector3(),
				n = new THREE.Vector3(),
				dir = event.ray.direction,
				mat = new THREE.Matrix4(),
				diff = this.options.delegate.obj.position.clone(),
				pos = this.options.delegate.obj.position,
				rot = this.options.delegate.obj.rotation;
				
				if(masked === 0x7)
					axis.x = 1;
				else if(masked === 0x8)
					axis.y = 1;
				else if(masked === 0x9)
					axis.z = 1;
				else
					axis.x = axis.y = axis.z = 1;
				
				mat.makeRotationY(rot.y).rotateX(rot.x).rotateZ(rot.z).multiplyVector3(axis);
				
				n.cross(axis, dir);
				n.crossSelf(dir);
				n.normalize();
				
				diff.subSelf(event.ray.origin);
			
				// camera points have only weight attribute, no scale
				var scale = diff.dot(n) / 45 / this._scalar;
				if(this.model.constructor.type == "CameraPoint") {
					this.model.set("weight", - this._initialWeight * scale);
				} else {
					if(masked === 0x7)
						this.options.delegate.obj.scale.x = this.options.delegate.uiObj.scale.x =
							scale * this._initialScale.x;
					else if(masked === 0x8)
						this.options.delegate.obj.scale.y = this.options.delegate.uiObj.scale.y =
							scale * this._initialScale.y;
					else if(masked === 0x9)
						this.options.delegate.obj.scale.z = this.options.delegate.uiObj.scale.z =
							scale * this._initialScale.z;
					else {
						this.options.delegate.obj.scale.x = this.options.delegate.uiObj.scale.x =
							this._initialScale.x * scale;
						this.options.delegate.obj.scale.y = this.options.delegate.uiObj.scale.y =
							this._initialScale.y * scale;	
						this.options.delegate.obj.scale.z = this.options.delegate.uiObj.scale.z =
							this._initialScale.z * scale;	
					}
				}
				
				if(this.options.delegate._updatePositionInstantly)
					this.moveCommit();

			} else {
				// intersect ray with XZ plane
				var intersection, factor, y = this.options.delegate.obj.position.y + this._moveAnchor.y;
				intersection = event.ray.direction.clone();
				factor = (y - event.ray.origin.y) / event.ray.direction.y;
				if(factor > 0) {
					intersection.multiplyScalar(factor);
					intersection.addSelf(event.ray.origin);
					
					this.options.delegate.obj.position.x = this.options.delegate.uiObj.position.x = intersection.x - this._moveAnchor.x;
					this.options.delegate.obj.position.z = this.options.delegate.uiObj.position.z = intersection.z - this._moveAnchor.z;
					if(this.options.delegate._updatePositionInstantly)
						this.moveCommit();
				}
			}
			
		},
		
		"moveCommit" : function(event) {
			if(this.options.delegate.snappable) {
				this.snapCommit();
			}
			this.model.set({
				"position/x" : this.options.delegate.obj.position.x, 
				"position/y" : this.options.delegate.obj.position.y, 
				"position/z" : this.options.delegate.obj.position.z,

				"rotation/x" : this.options.delegate.obj.rotation.x / Math.PI * 180, 
				"rotation/y" : this.options.delegate.obj.rotation.y / Math.PI * 180, 
				"rotation/z" : this.options.delegate.obj.rotation.z / Math.PI * 180,
			});
			if(this.model.constructor.type != "CameraPoint") {
				this.model.set({
					"scale/x" : this.options.delegate.obj.scale.x, 
					"scale/y" : this.options.delegate.obj.scale.y, 
					"scale/z" : this.options.delegate.obj.scale.z
				});
			}
		},
		
		"remove" : function() {
			Object.ViewGL.PresentationObject.prototype.remove.call(this);
			this.options.renderer.off(null, null, this);
			this.options.uiStatus.off(null, null, this);
		}
	});

}(sp.module("object")));