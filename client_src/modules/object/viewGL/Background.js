
(function(Object) {
	
	// dependencies
	var Resource = sp.module("resource");
	
	function loadCubeMap(image) {
		var t = new THREE.Texture;
		t.image = [];
		t.flipY = false;
		var coords = [0, 1/3, 1/4, 0, 1/4, 1/3, 1/4, 2/3, 2/4, 1/3, 3/4, 1/3];
		
		for(var i=0; i<6; i++) {
			var c = $("<canvas>")[0],
			ctx = c.getContext("2d");
			c.width = 128;//image.width / 4;
			c.height = 128;//image.height / 3;
			ctx.fillStyle = "#f00";
			ctx.fillRect(0, 0, 128, 128);
//			var sx = coords[2*i] * image.width,
//			sy = coords[2*i+1] * image.height,
//			sw = image.width / 4,
//			sh = image.height / 3,
//			dx = 0, dy = 0,
//			dw = sw, dh = sh;
//			
//			ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
			t.image[i] = c;
		}
		return t;
	}
	
	var geometry = new THREE.CubeGeometry(1000, 1000, 1000);
	
	var shader = THREE.ShaderUtils.lib["cube"];
   	
	Object.ViewGL.Background = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function(key, value) {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);

			this.model.on("change:skybox", function() {
//				if(material.uniforms.tCube.texture) {
//					material.uniforms.tCube.texture = loadCubeMap(this.options.resources.get(this.model.get("skybox")).getImage());
//					material.needsUpdate = true;
//				} else {
					this.obj.remove(this._mesh);
					this.render();
//				}
			}, this);
			
		},
	
		"render" : function() {
			var m;
			if(this.model.get("skybox")) {
				var tex = this.options.resources.get(this.model.get("skybox")).getTexture();
				shader.uniforms.tCube.texture = loadCubeMap(this.options.resources.get(this.model.get("skybox")).getImage());
			   	m = new THREE.ShaderMaterial({
			   		  "uniforms" : shader.uniforms,
			   		  "vertexShader": shader.vertexShader,
			   		  "fragmentShader": shader.fragmentShader
			   	});
			   	m.depthWrite = false;
			}
			else {
				m = new THREE.MeshLambertMaterial({"color":0x0008ff, "fog":false});
			}

			this._mesh = new THREE.Mesh(geometry, m);
			this._mesh.doubleSided = true;
			this.obj.add(this._mesh);
			return this;
		}
		
	});
	
}(sp.module("object")));