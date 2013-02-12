/**
 * Module, tracks changes in the presentation and provides undo/redo functions.
 * It also retains/releases the resources as of now.
 */
(function(Misc) {
	
	var resRegExp = /^res-/i;
	
	var History = Misc.ChangeHistory = function(model, limit) {
		
		var list = model.objectList,
//		camSeq = model.cameraSequence,
		resources = model.resources;
		
		this.limit = limit || 25;
		this.enabled = true;
		this.unStack = [];
		this.reStack = [];
		this.targetStack = this.unStack;
		this.undoActive = false;
		
		/*
		 * Change Class
		 */
		function retainRes(attrs, model) {
			for(var i in attrs) {
				var props = model.constructor.getAttribute(i);
				if(!props)
					continue;
				if(resRegExp.test(props.type)) {
					var res = resources.get(attrs[i]);
					if(res) {
						res.retain();
					}
				}
			}
		}
		function releaseRes(attrs, model) {
			for(var i in attrs) {
				var props = model.constructor.getAttribute(i);
				if(!props)
					continue;
				if(resRegExp.test(props.type)) {
					var res = resources.get(attrs[i]);
					if(res) {
						res.release();
					}
				}
			}
		}
		
		var Change = function(type, options) {
			this.type = type;
			this.options = options;
		};
		
		Change.prototype = {
			"undo" : function() {
				if(this.type == "change") {
					this.options.model.set(this.options.values);
				} else if(this.type == "add") {
					list.remove(this.options.model);
				} else if(this.type == "remove") {
					list.add(this.options.model);
				} else if(this.type == "camSequence") {
					camSeq.set("list", this.seq);
				}
			},
			
			"remove" : function() {
				if(this.type == "remove") {
					releaseRes(this.options.model.attributes, this.options.model);
					this.options.model.destroy();
				} else if(this.type == "change") {
					releaseRes(this.options.values, this.options.model);
				}

			},
		};
		/*
		 * Change Class End
		 */
		
//		camSeq.on("change", function() {
//			this.targetStack.push(new Change("camSequence", {
//				"seq" : (function() {
//					var s = [];
//					s.push(camSeq.get("list"));
//					return s;
//				}())
//			}));
//				
//			if(this.targetStack.length > this.limit) {
//				this.targetStack.shift().remove();
//			}
//		}, this);
		
		list.on("add", function(model) {
			if(!this.enabled) return;

			this.undoActive || this.clearRedo();
			
			this.targetStack.push(new Change("add", {
				"model" : model
			}));
			
			if(!this.undoActive) {
				retainRes(model.attributes, model);
			}
				
			if(this.targetStack.length > this.limit) {
				this.targetStack.shift().remove();
			}
		}, this).on("remove", function(model) {
			if(!this.enabled) return;

			this.undoActive || this.clearRedo();
			
			this.targetStack.push(new Change("remove", {
				"model" : model
			}));
			if(this.targetStack.length > this.limit) {
				this.targetStack.shift().remove();
			}
		}, this).on("change", function(model, attrs) {
			if(!this.enabled) return;
			
			var lastChange = this.targetStack[this.targetStack.length - 1],
			values = {}, now = {}, toRemove = {}, changed = false;
			for(var i in attrs.changes) {
				if(lastChange && lastChange.options.model == model
						&& lastChange.type == "change" 
						&& i in lastChange.options.values) {
					toRemove[i] = model.previous(i);
					continue;
				}
				values[i] = model.previous(i);
				now[i] = model.get(i);
				changed = true;
			}
			
			releaseRes(toRemove, model);
			if(!this.undoActive) {
				retainRes(now, model);
			}
			
			if(!changed)
				return;
			this.undoActive || this.clearRedo();
			
			this.targetStack.push(new Change("change", {
				"model" : model,
				"values" : values
			}));
			if(this.targetStack.length > this.limit) {
				this.targetStack.shift().remove();
			}
		}, this);
	};
	
	History.prototype = {
		"undo" : function() {
			var change = this.unStack.pop();
			if(change) {
				this.targetStack = this.reStack;
				this.undoActive = true;
				change.undo();
				this.undoActive = false;
				this.targetStack = this.unStack;
			}
		},
		"redo" : function() {
			var change = this.reStack.pop();
			if(change) {
				this.undoActive = true;
				change.undo();
				this.undoActive = false;
			}
		},
		"setEnabled" : function(enabled) {
			this.enabled = enabled;
		},
		"isEmpty" : function() {
			return this.unStack.length == 0;
		},
		"clearUndo" : function() {
			var i;
			while(i = this.unStack.pop())
				i.remove();
			return this;
		},
		"clearRedo" : function() {
			var i;
			while(i = this.reStack.pop())
				i.remove();
			return this;
		}
	};
	
}(sp.module("misc")));