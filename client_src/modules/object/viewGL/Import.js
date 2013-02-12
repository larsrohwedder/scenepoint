
(function(Object) {
		
	// dependencies
	var Resource = sp.module("resource");
	
	Object.ViewGL.Import = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function(key, value) {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);
			
			this.model.on("change:nolighting", function() {
				this.render();
			}, this).on("change:texture", function() {
				if(this._material.map) {
					this._material.map = this.options.resources.get(this.model.get("texture")).getTexture();
					this._material.needsUpdate = true;
				} else {
					this._material = new THREE.MeshLambertMaterial({
						"map" : this.model.get("texture") ? this.options.resources.get(this.model.get("texture")).getTexture() : Resource.CommonRes.placeholderTexture
					});
					this._createMesh();
				}
			}, this).on("change:mesh", function() {
				this._createMesh();
			}, this);
			
			this.on("drop", function(eventGL) {
	    		Resource.Model.Resource.fromFile(eventGL.originalEvent.originalEvent.dataTransfer.files[0], function(texture) {
	    			var id = this.options.resources.createID();
	    			texture.set("id", id);
	    			this.options.resources.add(texture);
	    			this.model.set("texture", id);
	    		}, this);
			}, this);
		},
	
		"render" : function() {
			var constructor = this.model.get("nolighting") ? THREE.MeshBasicMaterial : THREE.MeshPhongMaterial;
			if(this.model.get("texture")) {
				var res = this.options.resources.get(this.model.get("texture"));
				var tex = res.getTexture();
				this._material = new constructor({
					"map" : tex
				});
			} else {
				this._material = new constructor({
					"map" : Resource.CommonRes.placeholderTexture
				});
			}
			
			this._createMesh();
			
			return this;
		},
		
		"_createMesh" : function() {
			if(this._mesh) {
				this.obj.remove(this._mesh);
			}
			if(this.model.get("geometry")) {
				var res = this.options.resources.get(this.model.get("geometry"));
				var geometry = res.getGeometry();
				this._mesh = new THREE.Mesh(geometry, this._material);
				this._mesh.pickingId = this.id;
				this.obj.add(this._mesh);
			}
		}
		
	});
	
}(sp.module("object")));