(function(Core) {
	
	Core.Model.ObjectList = Backbone.Collection.extend({
		
		"initialize" : function() {
			this.selectedObjects = [];
		},
		
		"add" : function(model) {
			Backbone.Collection.prototype.add.apply(this, arguments);
			model.trigger("add");
		},
		
		"remove" : function(model) {
			Backbone.Collection.prototype.remove.apply(this, arguments);
			model.trigger("remove");
			model.destroy();
		},
		
		"select" : function(model) {
			// do nothing if model is already selected
			if(this.selectedObjects.indexOf(model) < 0) {
				// unselect currently selected objects
				for(var i=0; i<this.selectedObjects.length; i++) {
					this.selectedObjects[i].trigger("unselect", this.selectedObjects[i]);
					// remove listener (see below)
					this.selectedObjects[i].off("destroy", null, this);
				}
				this.selectedObjects = [];
				
				// model == null means unselect only
				if(model) {
					model.trigger("select", model);
					// remove model from selectedObjects when destroyed
					model.on("destroy", function() {
						model.trigger("unselect", model);
						var index = this.selectedObjects.indexOf(model);
						if(index >= 0) {
							this.selectedObjects.splice(index, 1);
						}
					}, this);
					this.selectedObjects.push(model);
				}
			}
		},
		
		"removeSelected" : function() {
			for(var i=0; i<this.selectedObjects.length; i++) {
				this.remove(this.selectedObjects[i]);
			}
		},
		

		"createId" : function() {
			var id;
			do {
				// IDs 0x0 to 0xFFF are reserved
				id = 0x100 * (Math.round(Math.random() * 0xFFEF) + 0x0010);
			} while(this.get(id));
			return id;
		}
	});
	
}(sp.module("core")));