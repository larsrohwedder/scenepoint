/**
 * @author Lars Rohwedder
 * 
 * Object class for displaying some standard geometries
 * with colors.
 */

(function(Object) {
	
	// dependencies
	var Resource = sp.module("resource");
	
	var cube = new THREE.CubeGeometry(100, 100, 100),
	cylinder = new THREE.CylinderGeometry(100, 100, 100, 32),
	sphere = new THREE.SphereGeometry(100, 32, 24),
	plane = new THREE.PlaneGeometry(100, 100),
	torus = new THREE.TorusGeometry(100, 40, 32, 24),
	planeMat = new THREE.MeshBasicMaterial({"map" : Resource.CommonRes.snappingTexture, "transparent" : true});
	
	Object.ViewGL.Geometry = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function() {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);
			
			this.planes = [];
			
			this.on("snap", function(index) {
				this.planes[index].visible = true;
			}, this).on("unsnap", function(index) {
				this.planes[index].visible = false;
			}, this);
			
			this.model.on("change:color", function() {
				this._updateMaterial();
			}, this).on("change:opacity", function() {
				this._updateMaterial();
			}, this).on("change:geometry", function() {
				this._updateMesh();
			}, this);
		},
		
		"render" : function() {
			this._material = new THREE.MeshPhongMaterial({"color" : this.model.get("color")});
			this._updateMesh();
			
			return this;
		},
		
		"_updateMaterial" : function() {
			this._material.color = new THREE.Color(this.model.get("color"));
			if(this.model.get("opacity") < .99) {
				this._material.opacity = Math.max(0.0, this.model.get("opacity"));
				this._material.transparent = true;				
			}
			this._material.needsUpdate = true;
		},
		
		"_updateMesh" : function() {
			if(this._mesh)
				this.obj.remove(this._mesh);
			geometryName = this.model.get("geometry");
			if(geometryName === "Cylinder") {
				this._geometry = cylinder;
			} else if(geometryName === "Sphere") {
				this._geometry = sphere;
			} else if(geometryName === "Torus") {
				this._geometry = torus;
			} else {
				this._geometry = cube;
			}
			this._mesh = new THREE.Mesh(this._geometry, this._material);
			this._mesh.pickingId = this.id;
			this.obj.add(this._mesh);
			
			// planes
			var p;
			while(p = this.planes.pop())
				this.obj.remove(p);
	
			if(geometryName == "Cube") {
				function newPlane(scope) {
					var p = new THREE.Mesh(plane, planeMat);
					p.visible = false;
					scope.obj.add(p);
					scope.planes.push(p);
					return p;
				}
				
				p = newPlane(this);
				p.position.set(0, 51, 0);
				p = newPlane(this);
				p.position.set(0, -51, 0);
				p.rotation.set(Math.PI, 0, 0);
				p = newPlane(this);
				p.position.set(51, 0, 0);
				p.rotation.set(0, 0, -Math.PI / 2);
				p = newPlane(this);
				p.position.set(-51, 0, 0);
				p.rotation.set(0, 0, Math.PI / 2);
				p = newPlane(this);
				p.position.set(0, 0, 51);
				p.rotation.set(Math.PI / 2, 0, 0);
				p = newPlane(this);
				p.position.set(0, 0, -51);
				p.rotation.set(-Math.PI / 2, 0, 0);

			}
		}
		
	});
	
}(sp.module("object")));