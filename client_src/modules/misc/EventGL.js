/**
 * @author Lars Rohwedder
 * 
 * Normal events are not useful in the webgl canvas, as x and y window coordinates don't say much about the event.
 * this class transforms such an event to a 3D event object.
 * 
 * Attributes:
 * - ray: A THREE.Ray object that has a starting position (x,y,z) coordinates where the user clicked and a direction
 *        from the users eye to this position.
 */
(function(Misc) {
	
	var projector = new THREE.Projector();
	
	Misc.EventGL = function(options) {
		_.extend(this, options);
	};
	
	Misc.EventGL.fromDOMEvent = function($event, camera, options) {
		options || (options = {});
		options.originalEvent = $event;
		
		//ray
		var x = $event.pageX - $event.target.offsetLeft,
		y = $event.pageY - $event.target.offsetTop;
		x = 2 * x / $event.target.width - 1;
		y = -(2 * y / $event.target.height - 1);
		var dir = new THREE.Vector3(x, y, 1);
		projector.unprojectVector(dir, camera);
		
		var position = new THREE.Vector3();
		position.getPositionFromMatrix(camera.matrixWorld);

		dir.subSelf(position).normalize();

		options.ray = new THREE.Ray(position, dir);
		
		return new Misc.EventGL(options);
	}
	
}(sp.module("misc")));