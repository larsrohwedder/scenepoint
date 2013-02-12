
(function(Object) {
	var lineColorMaterial = new THREE.LineBasicMaterial({"vertexColors" : THREE.VertexColors});

	Object.ViewGL.CameraPath = Backbone.View.extend({
		
		"initialize" : function() {
			this.obj = new THREE.Object3D();
			this.uiObj = new THREE.Object3D();
			
			this.options.cameraSequence.on("change", function() {
				// update 
				this.renderAll();
			}, this);
			this.options.objectList.on("change", function(model) {
				if(model.constructor.type == "CameraPoint") {
					// update spline before and after camera
					var list = this.options.cameraSequence.get("list"),
					index = list.indexOf(model.get("id"));
					if(index > 0)
						this.renderPart(index - 1);
					if(index < list.length - 1)
						this.renderPart(index);
				}
			}, this);
			
			this._geometries = [];
			this._curves = [];
			
			this.renderAll();
		},
	
		"renderAll" : function() {
			var list = this.options.cameraSequence.get("list"),
			scope = this;
			// cache for speed boost
			this._modelCache = [];
			this.options.objectList.each(function(model) {
				if(model.constructor.type == "CameraPoint") {
					var index = list.indexOf(model.get("id"));
					if(index >= 0) 
						scope._modelCache[index] = model;
				}
			});
			
			for(var i=0; i<this.obj.children.length; i++)
				this.obj.remove(this.obj.children[i]);
			
			this._curves = [];
			
			for(var i=0; i<list.length - 1; i++)
				this.renderPart(i);
			
		},
		
		"renderPart" : function(i) {
			var cur = this._modelCache[i],
			next = this._modelCache[i+1],
			geometry = this._geometries[i];
			
			if(!geometry) {
				geometry = this._geometries[i] = new THREE.Geometry();
				geometry.vertices = new Array(25);
				geometry.colors = new Array(25);
			}
			
			var matrixWorldInverse = new THREE.Matrix4();
			this.obj.updateMatrixWorld();
			matrixWorldInverse.getInverse(this.obj.matrixWorld);
			
			var v1 = new THREE.Vector3(next.get("position/x"),
					next.get("position/y"),
					next.get("position/z")),
			v2 = v1.clone(),
			v4 = new THREE.Vector3(cur.get("position/x"),
					cur.get("position/y"),
					cur.get("position/z")),
			v3 = v4.clone(),
			rot = cur.get("rotation/y"),
			scale = cur.get("weight") * 100,
			nrot = next.get("rotation/y"),
			nscale = next.get("weight") * 100,
			startSpeed = cur.get("speed"),
			endSpeed = next.get("speed");
			v2.addSelf(new THREE.Vector3(nscale * Math.cos(nrot * Math.PI / 180), 0, -nscale * Math.sin(nrot * Math.PI / 180))); 
			v3.subSelf(new THREE.Vector3(scale * Math.cos(rot * Math.PI / 180), 0, -scale * Math.sin(rot * Math.PI / 180)));
			
			matrixWorldInverse.multiplyVector3(v1);
			matrixWorldInverse.multiplyVector3(v2);
			matrixWorldInverse.multiplyVector3(v3);
			matrixWorldInverse.multiplyVector3(v4);
			
			var colors = {
				"Very Slow" : 0x00ff00,
				"Slow" : 0x00ffff,
				"Medium" : 0x0000ff,
				"Fast" : 0xffff00,
				"Very Fast" : 0xff0000
			}
			
			var curve = new THREE.CubicBezierCurve3(v1, v2, v3, v4);
			
			geometry.vertices[0] = v1;
			geometry.colors[0] = new THREE.Color(colors[startSpeed]);
			geometry.vertices[24] = v4;
			geometry.colors[24] = new THREE.Color(colors[endSpeed]);
			for(var j=1; j<24; j++) {
				geometry.vertices[j] = curve.getPoint(j/25);
				// interpolate each channel
				geometry.colors[j] = new THREE.Color();
				geometry.colors[j].r = j/25 * geometry.colors[0].r + (1 - j/25) * geometry.colors[24].r;
				geometry.colors[j].g = j/25 * geometry.colors[0].g + (1 - j/25) * geometry.colors[24].g;
				geometry.colors[j].b = j/25 * geometry.colors[0].b + (1 - j/25) * geometry.colors[24].b;
			}
			
			geometry.verticesNeedUpdate = true;
			geometry.colorsNeedUpdate = true;
			
			if(this._curves.indexOf(i) == -1) {
				this._curves.push(i);
				this.obj.add(new THREE.Line(geometry, lineColorMaterial));
			}
			return this;
		}
		
	});
	
}(sp.module("object")));