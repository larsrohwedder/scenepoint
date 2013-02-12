
(function(Object) {

	// dependencies
	var Resource = sp.module("resource");
		
	// use tex coord offset 0 for normal font
	// 1 for bold and 2 for italic
	
	// shader calculates opacity for 
	// normal font from red channel,
	// for bold from blue and italic form red.
	// fragments with opacity lower than threshold 0.01
	// are discarded

	// color is taken from vertex colors
		
	// TODO: fog not working
	var vShader = [
	        "varying vec2 vUv;",
	        "varying vec3 vColor;",
	        "",
			"void main() {",
			"  vUv = uv;",
			"  vColor = color;",
			"  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
			"}"
			].join("\n");
	var fShader = [
	        THREE.ShaderChunk["fog_pars_fragment"],
			"uniform sampler2D map;",
	        "varying vec3 vColor;",
			"varying vec2 vUv;",
			"",
			"void main() {",
			"  vec4 tex = texture2D(map, mod(vUv, 1.0));",
			"  float alpha;",
			"  if(vUv.y > 2.0) {",
			"    alpha = tex.b;",
			"  } else if(vUv.y > 1.0) {",
			"    alpha = tex.g;",
			"  } else {",
			"    alpha = tex.r;",
			"  }",
			"  if(alpha < 0.01) {",
			"    discard;",
			"  } else {",
			"    gl_FragColor = vec4(vColor, alpha);",
			"  }",
			THREE.ShaderChunk["fog_fragment"],
			"}"
			].join("\n");
	
	fontMaterial = new THREE.ShaderMaterial({
		  "uniforms" : _.defaults({
			  "map" : { "type": "t", "value": 1, "texture": Resource.BitmapFont.texture }
		  }, THREE.UniformsLib[ "fog" ]),
		  "vertexColors" : THREE.VertexColors,
		  "vertexShader": vShader,
		  "fragmentShader": fShader
		});
	fontMaterial.transparent = true;
	
	Object.ViewGL.TextPlane = Object.ViewGL.PresentationObject.extend({
		
		"initialize" : function(key, value) {
			Object.ViewGL.PresentationObject.prototype.initialize.call(this);

			this.model.on("change:content", function() {
				this._updateMesh();
			}, this).on("change:color", function() {
				this._material.uniforms.color.value = new THREE.Color(this.model.get("color"));
			}, this).on("destroy", function() {
				if(this._mesh)
					this.options.renderer.deallocateObject(this._mesh);
			}, this);
			
			this.snappable = true;
		},
	
		"render" : function() {			
			this._updateMesh();
			return this;
		},
		
		"_updateMesh" : function() {
			if(this._mesh) {
				this.options.renderer.deallocateObject(this._mesh);
				this.obj.remove(this._mesh);
			}

			var content = this.model.get("content");
			if(content) {
				// create dom element from content string
				// and generate Geometry from it
				
				var g = new THREE.Geometry(),
				STEP_SIZE_Y = 15,
				STEP_SIZE_X = 10,
				CHAR_WIDTH = 0.667,
				bold = false, italic = false, underscore = false,
				defaultColor = new THREE.Color(0x0),
				x = 0, y = 0, count = 0;
				
				function makeChar(char, x, y, count, off, color) {
					g.vertices.push(new THREE.Vector3(STEP_SIZE_X * x, -STEP_SIZE_Y * y, 0));
					g.vertices.push(new THREE.Vector3(STEP_SIZE_X * (x + 1), -STEP_SIZE_Y * y, 0));
					g.vertices.push(new THREE.Vector3(STEP_SIZE_X * (x + 1), -STEP_SIZE_Y * (y - 1), 0));
					g.vertices.push(new THREE.Vector3(STEP_SIZE_X * x, -STEP_SIZE_Y * (y - 1), 0));

					var face = new THREE.Face4(count*4, count*4+1, count*4+2, count*4+3);
					face.vertexColors[0] = face.vertexColors[1]
					= face.vertexColors[2] = face.vertexColors[3]
					= color || defaultColor;
					g.faces.push(face);
					  
					var position = Resource.BitmapFont.getCharPosition(char),
					texX = position % 32,
					texY = Math.floor(position / 32) + 1;
						
					g.faceVertexUvs[0].push([new THREE.UV(32/1024 * texX, off + 48/1024 * texY + 12/1024),
						new THREE.UV(32/1024 * (texX + 1), off + 48/1024 * texY + 12/1024),
						new THREE.UV(32/1024 * (texX + 1), off + 48/1024 * (texY - 1) + 12/1024),
						new THREE.UV(32/1024 * texX, off + 48/1024 * (texY - 1) + 12/1024)]);
				}
					
				function makeTextNode(el) {
					var text = el.text(),
					fontColor = el.parent().css("color"),
					color,
					italic = el.parent().css("font-style") == "italic",
					bold = el.parent().css("font-weight") > 500;
					
					if(fontColor) {
						var match = /rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/.exec(fontColor);
						if(match) {
							color = new THREE.Color(256*256*parseInt(match[1])
									+256*parseInt(match[2])
									+parseInt(match[3]));
						}
					}
					
					for(var i=0; i<text.length; i++) {
						var off = 0;
						if(bold)
							off = 1;
						else if(italic)
							off = 2;
						
						if(text[i] !== " ")
							makeChar(text[i], x, y, count++, off, color);
//						if(text[i] == "u"){
//	Zeilenumbruch //			y++;x=0;
//							}
						x += CHAR_WIDTH;
					}
				}
				var html = $("<div>"+content+"</div>");

				// depth-first search through all nodes
				(function f(el) {
					var c = el.contents();
					for(var i=0; i<c.length; i++) {
						if(c[i].nodeType == 3)
							// text node
							makeTextNode($(c[i]));
						else {
							if(c[i].nodeName == "OL"
								|| c[i].nodeName == "UL"
								|| c[i].nodeName == "P") {
								y += 1;
								x = 0;
							}
							if(c[i].nodeName == "LI") {
								makeChar(" ", x, y, count++, 0);
								x += CHAR_WIDTH;
								if(el[0].nodeName == "OL") {
									var s = (i+1).toString();
									for(var j=0; j<s.length; j++) {
										makeChar(s[j], x, y, count++, 0);
										x += CHAR_WIDTH;
									}
									makeChar(".", x, y, count++, 0);
									x += CHAR_WIDTH;
								} else {
									makeChar("\u2022", x, y, count++, 0);
									x += CHAR_WIDTH;
								}
								makeChar(" ", x, y, count++, 0);
								x += CHAR_WIDTH;
							}
							f($(c[i]));
							
							if(c[i].nodeName == "BR"
								|| c[i].nodeName == "LI"
								|| c[i].nodeName == "DIV"
								|| c[i].nodeName == "P") {
								y += 1;
								x = 0;
							}
						}
					}
				}(html));
				
				html.remove();
				
				this._mesh = new THREE.Mesh(g, fontMaterial);
				this._mesh.position.y = y * STEP_SIZE_Y;
				this._mesh.doubleSided = true;
				this._mesh.pickingId = this.id;
				this.obj.add(this._mesh);				
			}
		}
		
	}, {
		// workaround for go all white bug when removing all text planes
		"workaround" : function(scene) {
			var g = new THREE.Geometry();
			g.vertices.push(new THREE.Vector3(0, 0, 0));
			g.vertices.push(new THREE.Vector3(0, 0, 0));
			g.vertices.push(new THREE.Vector3(0, 0, 0));
			g.vertices.push(new THREE.Vector3(0, 0, 0));

			var face = new THREE.Face4(0, 1, 2, 3);
			face.vertexColors[0] = face.vertexColors[1]
			= face.vertexColors[2] = face.vertexColors[3]
			= new THREE.Color(0x0);
			g.faces.push(face);
							
			g.faceVertexUvs[0].push([new THREE.UV(0, 0), new THREE.UV(0, 0),
			                         new THREE.UV(0, 0), new THREE.UV(0, 0)]);
			scene.add(new THREE.Mesh(g, fontMaterial));
		}
	});
	
}(sp.module("object")));