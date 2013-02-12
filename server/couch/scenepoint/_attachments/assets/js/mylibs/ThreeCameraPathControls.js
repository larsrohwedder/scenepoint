/**
 * @author Lars Rohwedder
 */

THREE.CameraPathControls = function (object, points, xRotations, yRotations) {

	this.object = object;
	this.points = points;
	this.xRotations = [];
	this.yRotations = [];
	// normalize rotations to [0, 360)
	_.each(yRotations, function(x) {
		this.yRotations.push(x < 0 ? x % 360 + 360 : x % 360)
	}, this);
	_.each(xRotations, function(x) {
		this.xRotations.push(x < 0 ? x % 360 + 360 : x % 360)
	}, this);


	// internals
	
	this.object.eulerOrder = "YXZ";
	
	this.initCurve = function() {
		var points = this.points;
		var path = this.path = [];
		for(var i=0; i < (points.length + 2) / 3 - 1; i++) {
			path.push(new THREE.CubicBezierCurve3(points[3*i], points[3*i+1], points[3*i+2], points[3*i+3]));
		}
	};

	this.update = function(t) {
		var i = Math.min(Math.floor(t), this.path.length-1);
		this.object.position = this.path[i].getPoint(t - i);

		var rotX;
		if(Math.abs(this.xRotations[i+1] - this.xRotations[i]) < 180)
			rotX = Math.PI - Math.PI / 180 * (180 + this.xRotations[i + 1] * (t - i) + this.xRotations[i] * (1 - (t - i)));
		else if(this.xRotations[i+1] - this.xRotations[i] >= 180)
			rotX = Math.PI - Math.PI / 180 * (180 + (this.xRotations[i + 1] - 360) * (t - i) + this.xRotations[i] * (1 - (t - i)));
		else if(this.xRotations[i] - this.xRotations[i+1] >= 180)
			rotX = Math.PI - Math.PI / 180 * (180 + this.xRotations[i + 1] * (t - i) + (this.xRotations[i] - 360) * (1 - (t - i)));

		var rotY;
		if(Math.abs(this.yRotations[i+1] - this.yRotations[i]) < 180)
			rotY = Math.PI / 180 * (180 + this.yRotations[i + 1] * (t - i) + this.yRotations[i] * (1 - (t - i)));
		else if(this.yRotations[i+1] - this.yRotations[i] >= 180)
			rotY = Math.PI / 180 * (180 + (this.yRotations[i + 1] - 360) * (t - i) + this.yRotations[i] * (1 - (t - i)));
		else if(this.yRotations[i] - this.yRotations[i+1] >= 180)
			rotY = Math.PI / 180 * (180 + this.yRotations[i + 1] * (t - i) + (this.yRotations[i] - 360) * (1 - (t - i)));
		
		this.object.rotation.set(rotX, rotY, 0);
		this.object.matrixWorldNeedsUpdate = true;
	};
	
	this.initCurve();

};
