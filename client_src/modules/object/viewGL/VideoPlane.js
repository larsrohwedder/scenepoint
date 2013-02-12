/**
 * @author Lars Rohwedder
 * 
 * Object for displaying HTMLVideoDomElements on planes.
 * Implementation is experimental, loading videos from
 * other domains may cause cross-origin problems
 */

(function(Object) {
	
	// dependencies
	var Resource = sp.module("resource");
	
	Object.ViewGL.VideoPlane = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function(key, value) {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);
			
			this.options.renderer.on("tick", function() {
				// texture has to be reloaded each frame
				// check if the video buffer is not empty
				// otherwise loading would cause a crash
				if(this._material && this._material.map) {
					var buffered = this._$video[0] && 
									this._$video[0].buffered.length > 0;
					this._material.map.needsUpdate = this.playing && buffered;
				}
			}, this);
			
			function checkplay() {
				var t = this.options.uiStatus.get("pathTime"),
				mode = this.options.uiStatus.get("mode"),
				startTime = this.model.get("starttime"),
				stopTime = this.model.get("stoptime"),
				newPlaying = t >= startTime && t < stopTime && mode == "play";
				if(newPlaying && !this.playing) {
					this.refresh();
					if(this._$video[0]) {
						this._$video[0].play();
					}
				} else if(!newPlaying && this.playing) {
					if(this._$video[0]) {
						this._$video[0].pause();
					}
				}
				this.playing = newPlaying;
			};
			
			this.options.uiStatus.on("change:pathTime", checkplay, this);
			this.options.uiStatus.on("change:mode", checkplay, this);
			
			this.model.on("change:video", this.refresh, this);
			
			this.playing = false;
			this.snappable = true;
		},
		
		"refresh" : function() {
			if(this._$video) {
				if(this._$video[0])
					this._$video[0].volume = 0;
				this._$video.remove();
			}
			
			if(this._mesh) {
				this.obj.remove(this._mesh);
			}
			this.render();
		},
	
		"render" : function() {
			if(this.model.get("video")) {
				this._$video = $("<video>");
				this._$video.attr("crossorigin", "anonymous");
				this._$video.attr("src", this.model.get("video"));
//				if(this.model.get("poster")) {
//					var res = this.options.resources.get(this.model.get("poster"));
//					this._$video.attr("poster", );
//				}
				var texture = new THREE.Texture(this._$video[0]);
				texture.needsUpdate = false;
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.format = THREE.RGBFormat;
				texture.generateMipmaps = false;
				this._material = new THREE.MeshBasicMaterial({
					"map" : texture
				});
			} else {
				this._material = new THREE.MeshBasicMaterial({
					"map" : null
				});
			}
			var geometry = new THREE.PlaneGeometry(100, 100);
			this._mesh = new THREE.Mesh(geometry, this._material);
			this._mesh.doubleSided = true;
			this._mesh.pickingId = this.id;
			this._mesh.rotation.x = Math.PI / 2;
			this.obj.add(this._mesh);
			return this;
		},
		
		"remove" : function() {
			if(this._$video) {
				if(this._$video[0])
					this._$video[0].volume = 0;
				this._$video.remove();
			}
			Object.ViewGL.PresentationObject.prototype.remove.call(this);
			if(this._material && this._material.map) {
				this.options.renderer.deallocateTexture(this._material.map);
			}
		}
		
	});
	
}(sp.module("object")));