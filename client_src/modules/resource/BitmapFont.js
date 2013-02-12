/**
 * @author Lars Rohwedder
 * Class that manages the Bitmap Texture for 'Text Plane' Objects.
 * TODO: Add support for multiple fonts.
 */
(function(Resource) {

	var fontCanvas = $("<canvas>")[0],
	fontTexture = new THREE.Texture(fontCanvas),
	fontContext = fontCanvas.getContext("2d"),
	charset = {}, offset = 0;
		
	fontCanvas.width = fontCanvas.height = 2048;
	fontContext.fillStyle = "#000000";
	fontContext.fillRect(0, 0, 2048, 2048);
	// source color + destination color
	fontContext.globalCompositeOperation = "lighter";
	
	fontTexture.wrapS = THREE.RepeatWrapping;
	fontTexture.wrapT = THREE.RepeatWrapping;
	
	function drawChar(c) {
		var y = Math.floor(offset / 32) + 1,
		x = offset % 32;
		fontContext.strokeText(c, x*64, y*96);
	};
	
	function getCharPosition(c) {
		if(charset[c])
			return charset[c];

		fontContext.strokeStyle = "#ff0000";
		fontContext.font = "64px Monospace";
		drawChar(c);
		fontContext.strokeStyle = "#00ff00";
		fontContext.font = "bold 64px Monospace";
		drawChar(c);
		fontContext.strokeStyle = "#0000ff";
		fontContext.font = "italic 64px Monospace";
		drawChar(c);
		
		fontTexture.needsUpdate = true;
		
		charset[c] = offset;
		return offset++;
	}

	Resource.BitmapFont = {
		"texture" : fontTexture,
		
		"getCharPosition" : getCharPosition
	}
	
}(sp.module("resource")));