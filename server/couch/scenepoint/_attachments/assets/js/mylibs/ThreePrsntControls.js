/**
 * Modified Version of THREE.FlyControls
 * @author James Baicoianu / http://www.baicoianu.com/
 * @author Lars Rohwedder
 */

THREE.PrsntControls = function ( object, domElement ) {

	this.object = object;

	this.domElement = ( domElement !== undefined ) ? domElement : document;
	if ( domElement ) this.domElement.setAttribute( 'tabindex', -1 );

	// API

	this.movementSpeed = 50.0;
	this.rollSpeed = 0.005;

	this.autoForward = false;
	
	// internals

	this.object.eulerOrder = "YXZ";
	
	this.tmpQuaternion = new THREE.Quaternion();

	this.moveState = { up: 0, down: 0, left: 0, right: 0, forward: 0, back: 0, pitchUp: 0, pitchDown: 0, yawLeft: 0, yawRight: 0 };
	this.moveVector = new THREE.Vector3( 0, 0, 0 );
	this.rotationVector = new THREE.Vector3( 0, 0, 0 );
	this.animation = null;

	this.handleEvent = function ( event ) {

		if ( typeof this[ event.type ] == 'function' ) {

			this[ event.type ]( event );

		}

	};

	this.keydown = function( event ) {

		var tag = $(event.target).prop("nodeName");
			
		if ( event.altKey || event.shiftKey 
			|| tag == "INPUT" || tag == "TEXTAREA") {

			return;

		}

		switch( event.keyCode ) {

			case 87: /*W*/ this.moveState.forward = 1; break;
			case 83: /*S*/ this.moveState.back = 1; break;

			case 65: /*A*/ this.moveState.left = 1; break;
			case 68: /*D*/ this.moveState.right = 1; break;

			case 82: /*R*/ this.moveState.up = 1; break;
			case 70: /*F*/ this.moveState.down = 1; break;

			case 38: /*up*/ this.moveState.pitchUp = 1; break;
			case 40: /*down*/ this.moveState.pitchDown = 1; break;

			case 37: /*left*/ this.moveState.yawLeft = 1; break;
			case 39: /*right*/ this.moveState.yawRight = 1; break;

		}

		this.updateMovementVector();
		this.updateRotationVector();

	};

	this.keyup = function( event ) {

		switch( event.keyCode ) {

			case 16: /* shift */ this.movementSpeedMultiplier = 1; break;

			case 87: /*W*/ this.moveState.forward = 0; break;
			case 83: /*S*/ this.moveState.back = 0; break;

			case 65: /*A*/ this.moveState.left = 0; break;
			case 68: /*D*/ this.moveState.right = 0; break;

			case 82: /*R*/ this.moveState.up = 0; break;
			case 70: /*F*/ this.moveState.down = 0; break;

			case 38: /*up*/ this.moveState.pitchUp = 0; break;
			case 40: /*down*/ this.moveState.pitchDown = 0; break;

			case 37: /*left*/ this.moveState.yawLeft = 0; break;
			case 39: /*right*/ this.moveState.yawRight = 0; break;

		}

		this.updateMovementVector();
		this.updateRotationVector();

	};

	this.listen = function() {
		$(this.domElement).bind( 'keydown', bind( this, this.keydown ));
		$(this.domElement).bind( 'keyup',   bind( this, this.keyup ));
	};
	
	this.unlisten = function() {
		$(this.domElement).unbind( 'keydown', bind( this, this.keydown ));
		$(this.domElement).unbind( 'keyup',   bind( this, this.keyup ));
	};

	this.update = function( delta ) {

		// position
		
		var moveMult = delta * this.movementSpeed;
		var rotMult = delta * this.rollSpeed;

		this.object.translateX( this.moveVector.x * moveMult );
		this.object.translateY( this.moveVector.y * moveMult );
		this.object.translateZ( this.moveVector.z * moveMult );
		
		this.object.position.y = Math.max(this.object.position.y, 100);
		
		if(this.animation) {
			this.animation.progress += delta;
			if(this.animation.progress > this.animation.duration) {
				this.animation = null;
			} else {
				dir = this.animation.dir.clone();
				this.object.position.addSelf(dir.multiplyScalar(delta / this.animation.duration));
			}
		}
		// rotation

		var cur = this.object.rotation;
		var rotX = this.rotationVector.x * rotMult;
		var rotY = this.rotationVector.y * rotMult;

		function mod(x) {
			return x < 0 ? x % (2 * Math.PI) + 2 * Math.PI : x % (2 * Math.PI);
		}
		this.object.rotation.set(mod(cur.x + rotX), mod(cur.y + rotY), 0);
		
		this.object.matrixWorldNeedsUpdate = true;

	};
	
	this.animateTo = function( pos, msec ) {
		var off = new THREE.Vector3(0, 0, 300);
		this.object.matrixWorld.multiplyVector3(off);
		off.subSelf(this.object.position);
		
		pos.addSelf(off);
		this.animation = {
			"dir" : pos.subSelf(this.object.position),
			"duration" : msec,
			"progress" : 0
		};
	};

	this.updateMovementVector = function() {

		var forward = ( this.moveState.forward || ( this.autoForward && !this.moveState.back ) ) ? 1 : 0;

		this.moveVector.x = ( -this.moveState.left    + this.moveState.right );
		this.moveVector.y = ( -this.moveState.down    + this.moveState.up );
		this.moveVector.z = ( -forward + this.moveState.back );

		//console.log( 'move:', [ this.moveVector.x, this.moveVector.y, this.moveVector.z ] );

	};

	this.updateRotationVector = function() {

		this.rotationVector.x = ( -this.moveState.pitchDown + this.moveState.pitchUp );
		this.rotationVector.y = ( -this.moveState.yawRight  + this.moveState.yawLeft );
		this.rotationVector.z = 0;

		//console.log( 'rotate:', [ this.rotationVector.x, this.rotationVector.y, this.rotationVector.z ] );

	};

	this.getContainerDimensions = function() {

		if ( this.domElement != document ) {

			return {
				size	: [ this.domElement.offsetWidth, this.domElement.offsetHeight ],
				offset	: [ this.domElement.offsetLeft,  this.domElement.offsetTop ]
			};

		} else {

			return {
				size	: [ window.innerWidth, window.innerHeight ],
				offset	: [ 0, 0 ]
			};

		}

	};

	function bind( scope, fn ) {

		return function () {

			fn.apply( scope, arguments );

		};

	};

	this.updateMovementVector();
	this.updateRotationVector();

};
