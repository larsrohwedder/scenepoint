(function(Core) {
	
	Core.Model.CameraSequence = Backbone.Model.extend({
		"initialize" : function() {
			this.set("list", []);
		},

		// suppress change event for efficiency
		"startTransaction" : function() {
			this.transaction = true;
		},

		"finishTransaction" : function() {
			this.transaction = false;
			this.trigger("change");
		},
		
		"move" : function(id, index) {
			var lis = this.get("list"),
			cur = lis.indexOf(id);
			
			index >= 0 || (index = 0);
			index >= lis.length || (index = lis.length-1);
			
			if(cur >= 0) {
				var el = lis.splice(cur, 1);
				lis.splice(index, 0, el[0]);
				this.transaction || this.trigger("change");
			}
		},

		"remove" : function(id) {
			var lis = this.get("list"),
			cur = lis.indexOf(id);
			
			if(cur >= 0) {
				var el = lis.splice(cur, 1);
				this.transaction || this.trigger("change");
			}
		},
		
		"push" : function(id) {
			var lis = this.get("list");
			lis.push(id);
			this.transaction || this.trigger("change");
		},
		
		"toJSON" : function() {
			return this.get("list");
		}
	});

}(sp.module("core")));