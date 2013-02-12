/**
 * @author Lars Rohwedder
 * 
 * Classes for managing any large data object in presentation files (like imported Images).
 * Those are transmitted from/to server in Base64 encoding.
 * Includes retain/release functions for finding unused objects.
 */
(function(Resource) {
	
	// dependencies
	var Misc = sp.module("misc");
	
	Resource.Model.Resource = Backbone.Model.extend({
		"initialize" : function() {
			this._retainCount = 0;
			if(!this.get("_data"))
				this.set("_data", 0);
			
			this.on("destroy", function() {
				if(this._texture) {
					this.collection.renderer.deallocateTexture(this._texture);
				}
			}, this);
		},
		
		"retain" : function() {
			this.trigger("retain");
			this._retainCount++;
		},
		
		"release" : function() {
			this.trigger("release");
			if(--this._retainCount <= 0) {
				this.destroy();
			}
		},
		
		"destroy" : function() {
			this.trigger("destroy", this, this.collection);
		},
		
		"getText" : function() {
			if(this._text)
				return this._text;
			return this._text = decodeURIComponent(escape(window.atob(this.get("_data"))));
		},

		"getImage" : function() {
			if(this._image)
				return this._image;
						
			var im = this._image = new Image();
			im.src = "data:"+(this.get("content_type") || "application/octet-stream")+";base64,"+this.get("_data");
			return im;
		},
		
		"getTexture" : function() {
			if(this._texture)
				return this._texture;
			
			//don't use THREE.ImageUtils.loadTexture,
			//it doesn't work with data urls
			var scope = this,
			im = this.getImage(),
			texture = this._texture = new THREE.Texture(im);
			texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
			if(im.width && im.height) {
				// no mipmaps only allowed for sizes 2, 4, 8, 16...
				if((Math.log(im.width) / Math.log(2)) % 1 > 0
						|| (Math.log(im.height) / Math.log(2)) % 1 > 0) {
					texture.generateMipmaps = false;
				}
			}
			im.onload = function() {
				if((Math.log(im.width) / Math.log(2)) % 1 > 0
						|| (Math.log(im.height) / Math.log(2)) % 1 > 0) {
					texture.generateMipmaps = false;
				}
				scope.trigger("load");
				texture.needsUpdate = true;
			};
			return texture;
		},

		"getGeometry" : function() {
			if(this._geometry)
				return this._geometry;
			
			this._geometry = new THREE.Geometry();
			var group = new THREE.OBJLoader().parse(this.getText());
			for(var i=0; i<group.children.length; i++)
				THREE.GeometryUtils.merge(this._geometry, group.children[i]);
			return this._geometry;
		},
		
		"toJSON" : function(stubs) {
			if(stubs && !this._dirty) {
				return {
					"content_type" : this.get("content_type") || "application/octet-stream",
					"stub" : true,
					"length" : this.get("_data").length
				}
			} else {
				return {
					"content_type" : this.get("content_type") || "application/octet-stream",
					"stub" : false,
					"length" : this.get("_data").length,
					"data" : this.get("_data")
				}
			}
		}
		
	}, {
		"fromFile" : function(file, callback, context) {
			var reader = new FileReader();
			reader.onload = function(e) {
				var dataUrl = e.target.result;
				//trim to actual data
				var i=4;
				while(dataUrl[i] !== ",")
					i++;

				var result = new Resource.Model.Resource({"_data":dataUrl.substring(i+1), "name":file.name, "content_type" : file.type});
				if(context)
					callback.call(context, result);
				else
					callback(result);
			};
			reader.readAsDataURL(file);
		},
	
		"fromPlainText" : function(text) {
			return new Resource.Model.Resource({
				"_data" : window.btoa(unescape(encodeURIComponent(text))),
				"_text" : text
			});
		},
	
		"fromJSON" : function(json, id) {
			return new Resource.Model.Resource({
				"content_type" : json.content_type,
				"_data" : json.data,
				"id" : id
			});
		}
	});
	
	Resource.Model.ResourceCollection = Backbone.Collection.extend({	
		"createID" : function() {
			var id;
			do {
				// IDs 0x0 to 0xFFF are reserved
				id = 0x100 * (Math.round(Math.random() * 0xFFEF) + 0x0010);
			} while(this.get(id));
			return id;
		},
		
		"toJSON" : function(stubs) {
			var result = {};
			for(var i=0; i<this.models.length; i++) {
				result[this.models[i].id] = this.models[i].toJSON(stubs);
			}
			return result;
		}
	});
	
}(sp.module("resource")));