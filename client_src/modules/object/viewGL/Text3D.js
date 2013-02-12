/**
 * @author Lars Rohwedder
 *
 * TODO: Different fonts
 */

(function(Object) {
	
	Object.ViewGL.Text3D = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function() {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);
			
			this.model.on("change:color", function() {
				this._updateMaterial();
			}, this).on("change:content", function() {
				this._updateMesh();
			}, this).on("destroy", function() {
				if(this._mesh)
					this.options.renderer.deallocateObject(this._mesh);
			}, this);
		},
		
		"render" : function() {
			this._material = new THREE.MeshLambertMaterial({"color" : this.model.get("color")});
			this._updateMesh();
			
			return this;
		},
		
		"_updateMaterial" : function() {
			this._material.color = new THREE.Color(this.model.get("color"));
			this._material.needsUpdate = true;
		},
		
		"_updateMesh" : function() {
			if(this._mesh) {
				this.options.renderer.deallocateObject(this._mesh);
				this.obj.remove(this._mesh);
			}
			
			var text = this.model.get("content");
			if(text) {
				this._geometry = new THREE.TextGeometry(text, {
					font: "helvetiker",
					height: 50,
					size: 100,
					bevelEnabled: true,
					bevelThickness: 2,
					bevelSize: 2
				});
				this._mesh = new THREE.Mesh(this._geometry, this._material);
				this._mesh.pickingId = this.id;
				this.obj.add(this._mesh);				
			}
		}
		
	});
	
}(sp.module("object")));