
(function(Object) {
	var camera = new THREE.CubeGeometry(15, 15, 30),
	cylinder = new THREE.Mesh(new THREE.CylinderGeometry(9, 3, 15, 32)),
	lineColorMaterial = new THREE.LineBasicMaterial({"vertexColors" : THREE.VertexColors}),
	lineMaterial = new THREE.LineBasicMaterial({"color" : 0xff00ff}),
	line = new THREE.Geometry();
	line.vertices.push(new THREE.Vector3(-50, 0, 0));
	line.vertices.push(new THREE.Vector3(50, 0, 0));
		
	cylinder.position.z = 20;
	cylinder.rotation.x = Math.PI/2;
	THREE.GeometryUtils.merge(camera, cylinder);
	
	Object.ViewGL.CameraPoint = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function() {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);
			this._updatePositionInstantly = true;
						
			this.options.uiStatus.on("change:mode", function() {
				var mode = this.options.uiStatus.get("mode");
				THREE.SceneUtils.showHierarchy(this.obj, mode != "play");
				THREE.SceneUtils.showHierarchy(this.uiObj, mode != "play");
			}, this);
			
			this.model.off("change:rotation", null, this);
			this.model.on("change:rotation", function() {
				this.obj.rotation.set(this.model.get("rotation/x") * Math.PI / 180,
						   this.model.get("rotation/y") * Math.PI / 180, 0);
				this.uiObj.rotation.set(this.model.get("rotation/x") * Math.PI / 180,
						   this.model.get("rotation/y") * Math.PI / 180, 0);
			}, this);
			
			this.model.off("change:scale", null, this);
			this.obj.scale.set(1, 1, 1);
			this.model.on("change:weight", function() {
				this._lineObj.scale.set(this.model.get("weight"), 1, 1);
			}, this);
			
			this.model.trigger("change:rotation");
			this.model.trigger("change:scale");
			
//			function updateNext() {
//				if(this.model.collection) {
//					if(this._next)
//						this._next.off(null, null, this);
//					this._next = this.model.collection.get(this.model.get("next"));
//					if(this._next) {
//						this._next.on("change", function() {
//							this._updateSpline();
//						}, this);
//						this._next.on("remove", function() {
//							this.model.set("next", 0);
//						}, this);
//					}
//					this._updateSpline();
//				}
//			}
//			this.model.on("change:next", updateNext, this);
			
//			this.model.on("change", function() {
//				this._updateSpline();
//			}, this);
			
			// make sure object list is completely inflated before searching for next
//			if(this.model.collection)
//				this.model.collection.on("inflateComplete", updateNext, this);
		},
		
		"render" : function() {
			var mesh = new THREE.Mesh(camera, new THREE.MeshLambertMaterial({"color":0x808080}));
			mesh.position.z = -20;
			this._lineObj = new THREE.Line(line, lineMaterial);
			mesh.pickingId = this.id | 0x1;
			this.obj.add(mesh);
			this.obj.add(this._lineObj);
//			this._updateSpline();
			return this;
		},
		
//		"_updateSpline" : function() {
//
//			if(this._next) {
//				if(!this._curveGeometry) {
//					this._curveGeometry = new THREE.Geometry();
//					this._curveGeometry.vertices = new Array(25);
//					this._curveGeometry.colors = new Array(25);
//				}
//				
//				var matrixWorldInverse = new THREE.Matrix4();
//				this.obj.updateMatrixWorld();
//				matrixWorldInverse.getInverse(this.obj.matrixWorld);
//				
//				var v1 = new THREE.Vector3(this._next.get("position/x"),
//						this._next.get("position/y"),
//						this._next.get("position/z")),
//				v2 = v1.clone(),
//				v4 = new THREE.Vector3(this.model.get("position/x"),
//						this.model.get("position/y"),
//						this.model.get("position/z")),
//				v3 = v4.clone(),
//				rot = this.model.get("rotation/y"),
//				scale = this.model.get("weight") * 100,
//				nrot = this._next.get("rotation/y"),
//				nscale = this._next.get("weight") * 100,
//				startSpeed = this.model.get("speed"),
//				endSpeed = this._next.get("speed");
//				v2.addSelf(new THREE.Vector3(nscale * Math.cos(nrot * Math.PI / 180), 0, -nscale * Math.sin(nrot * Math.PI / 180))); 
//				v3.subSelf(new THREE.Vector3(scale * Math.cos(rot * Math.PI / 180), 0, -scale * Math.sin(rot * Math.PI / 180)));
//				
//				matrixWorldInverse.multiplyVector3(v1);
//				matrixWorldInverse.multiplyVector3(v2);
//				matrixWorldInverse.multiplyVector3(v3);
//				matrixWorldInverse.multiplyVector3(v4);
//				
//				var colors = {
//					"Very Slow" : 0x00ff00,
//					"Slow" : 0x00ffff,
//					"Medium" : 0x0000ff,
//					"Fast" : 0xffff00,
//					"Very Fast" : 0xff0000
//				}
//				
//				var curve = new THREE.CubicBezierCurve3(v1, v2, v3, v4);
//				
//				this._curveGeometry.vertices[0] = v1;
//				this._curveGeometry.colors[0] = new THREE.Color(colors[startSpeed]);
//				this._curveGeometry.vertices[24] = v4;
//				this._curveGeometry.colors[24] = new THREE.Color(colors[endSpeed]);
//				for(var i=1; i<24; i++) {
//					this._curveGeometry.vertices[i] = curve.getPoint(i/25);
//					// interpolate each channel
//					this._curveGeometry.colors[i] = new THREE.Color();
//					this._curveGeometry.colors[i].r = i/25 * this._curveGeometry.colors[0].r + (1 - i/25) * this._curveGeometry.colors[24].r;
//					this._curveGeometry.colors[i].g = i/25 * this._curveGeometry.colors[0].g + (1 - i/25) * this._curveGeometry.colors[24].g;
//					this._curveGeometry.colors[i].b = i/25 * this._curveGeometry.colors[0].b + (1 - i/25) * this._curveGeometry.colors[24].b;
//				}
//				
//				this._curveGeometry.verticesNeedUpdate = true;
//				this._curveGeometry.colorsNeedUpdate = true;
//				
//				if(!this._curve) {
//					this._curve = new THREE.Line(this._curveGeometry, lineColorMaterial);
//					this.obj.add(this._curve);
//				}
//				
//			} else if(this._curve) {
//				
//				this.obj.remove(this._curve);
//				this._curve = null;
//				
//			}
//		},
		
		"remove" : function() {
			Object.ViewGL.PresentationObject.prototype.remove.call(this);
			this.options.uiStatus.off(null, null, this);
			if(this.model.collection)
				this.model.collection.off(null, null, this);
//			if(this._curve)
//				this.options.renderer.deallocateObject(this._curve);
		}
		
	});
	
}(sp.module("object")));