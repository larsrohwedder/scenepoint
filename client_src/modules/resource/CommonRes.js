/**
 * @author Lars Rohwedder
 * 
 * Common global resources, used in different Objects
 */
(function(Resource) {
		
	Resource.CommonRes = {
		// dummy texture seen when ImagePlanes have no Image set.
		"placeholderTexture" : (function() {
			var canvas = $("<canvas>")[0],
			ctx = canvas.getContext("2d");
			canvas.width = canvas.height = 32;
			ctx.fillStyle = "#fff";
			ctx.fillRect(0, 0, 16, 16);
			ctx.fillRect(16, 16, 16, 16);
			ctx.fillStyle = "#f88";
			ctx.fillRect(16, 0, 16, 16);
			ctx.fillRect(0, 16, 16, 16);
			var tex = new THREE.Texture(canvas);
			tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
			tex.repeat.set(10, 10);
			tex.needsUpdate = true;
			return tex;
		}()),
		
		// blue blurred circle texture as seen when moving 2D Objects near a Cube.
		"snappingTexture" : (function() {
			var canvas = $("<canvas>")[0],
			ctx = canvas.getContext("2d");
			canvas.width = canvas.height = 32;
			var grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
			grad.addColorStop(0, "rgba(0,0,255,0.5)");
			grad.addColorStop(1, "rgba(0,0,255,0)");
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, 32, 32);
			var tex = new THREE.Texture(canvas);
			tex.needsUpdate = true;
			return tex;
		}())
	};
	
}(sp.module("resource")));