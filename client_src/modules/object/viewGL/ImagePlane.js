/**
 * @author Lars Rohwedder
 * 
 * Object for displaying Images on planes.
 */

(function(Object) {
	
	// dependencies
	var Resource = sp.module("resource");

	var geometry = new THREE.PlaneGeometry(100, 100);
	
	Object.ViewGL.ImagePlane = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function(key, value) {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);

			this.model.on("change:image", function() {
				var res;
				if(this.model.get("image")) {
					res = this.options.resources.get(this.model.get("image"));
				}
				if(this.model.previous("image")) {
					var prevRes = this.options.resources.get(this.model.previous("image"));
					prevRes.off(null, null, this);
				}

				this._material.map = res ? res.getTexture() : Resource.CommonRes.placeholderTexture;
				this._material.needsUpdate = true;
					
				var im = res ? res.getImage() : null,
				tex = res ? res.getTexture() : null;
				
				if(im && im.height && im.width)
					this._mesh.scale.z = 1 * im.height / im.width;
				else if(!im)
					this._mesh.scale.z = 1;
				if(res) {
					res.on("load", function() {
						this._mesh.scale.z = res.getImage().height / res.getImage().width;
					}, this);
				}
			}, this).on("destroy", function() {
				var res = this.options.resources.get(this.model.get("image"));
				if(res) {
					res.off(null, null, this);
				}
			}, this);
			
			this.on("drop", function(eventGL) {
	    		Resource.Model.Resource.fromFile(eventGL.originalEvent.originalEvent.dataTransfer.files[0], function(texture) {
	    			var id = this.options.resources.createID();
	    			texture.set("id", id);
	    			this.options.resources.add(texture);
	    			this.model.set("image", id);
	    		}, this);
			}, this);
			
			this.snappable = true;
		},
	
		"render" : function() {
			var w = h = 1;
			if(this.model.get("image")) {
				
				var res = this.options.resources.get(this.model.get("image")),
				im = res ? res.getImage() : null,
				tex = res ? res.getTexture() : Resource.CommonRes.placeholderTexture;

				
				if(im && im.height && im.width)
					h = 1 * im.height / im.width;
				res.on("load", function() {
					this._mesh.scale.z = res.getImage().height / res.getImage().width;
				}, this);
			}
			this._material = new THREE.MeshPhongMaterial({
				"map" : tex || Resource.CommonRes.placeholderTexture
			});
			this._material.transparent = true;
			this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), this._material);
			this._mesh.scale.set(w, 1, h);
			this._mesh.doubleSided = true;
			this._mesh.pickingId = this.id;
			this._mesh.rotation.x = Math.PI/2;
			this.obj.add(this._mesh);
			return this;
		}
		
	});
	
}(sp.module("object")));