/**
 * @author Lars Rohwedder
 * helper for chaining sequential asynchronous calls
 * example.
 * 
 * ugly:
 * foo(function() {
 *   foo(function(a) {
 *     foo(function(a) {
 *     }
 *   });
 * });
 * 
 * nicer:
 * new Misc.Queue().queue(function(q) {
 *   foo(q.next);
 * }).queue(function(q,a) {
 *   foo(q.next);
 * }).queue(function(q,a) {
 * });
 * 
 * Each queued function is called with the arguments from the next call preceeded by a Queue object.
 */

(function(Misc) {


	Misc.Queue = (function() {
		var Queue = function(f, options) {
			options || (options = {});
			options.ctx || (options.ctx = window);
			options.forcebreak || (options.forcebreak = false);
			var finished = false,
			nextEl;
			
			this.queue = function(h) {
				nextEl = new Queue(h, options);
				if(finished) {
					if(options.forcebreak) {
						setTimeout(function() {
							nextEl.run();
						}, 0);
					} else {
						nextEl.run();
					}
				}
				return nextEl;
			};
			this.run = function() {			
				var args = new Array(arguments.length + 1),
				len = arguments.length || 0;
				args[0] = this;
				for(var i=0; i<len; i++)
					args[i + 1] = arguments[i];
				
				if(typeof options.onException == "function") {
					try {
						f.apply(options.ctx, args);
					} catch(e) {
						options.onException.call(options.ctx, e, this);
					}
				} else {
					f.apply(options.ctx, args);
				}
				return this;
			};
			this.next = function() {
				finished = true;
				if(nextEl) {
					if(options.forcebreak) {
						setTimeout(function() {
							nextEl.run.apply(nextEl, arguments); 
						}, 0);
					} else {
						nextEl.run.apply(nextEl, arguments);
					}
				}
				return this;
			};
		}

		return function(options) {
			Queue.call(this, null, options);
			this.next();
		};
	}());

}(sp.module("misc")))
