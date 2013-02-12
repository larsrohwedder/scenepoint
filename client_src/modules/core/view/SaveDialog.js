
(function(Core) {
	
	Core.View.SaveDialog = Backbone.View.extend({
		
		"tagName" : "div",
		
		"template" : $("#sp-tpl-dialog-save").html(),
		
		"initialize" : function() {
			
		},
	
		"render" : function() {
			
			var bb = new BlobBuilder();
			bb.append(this.options.content);
			var blob = bb.getBlob("application/octet-stream");
			var url = (window.URL || window.webkitURL).createObjectURL(blob);
			
			var view = {
				"data" : {
					"url" : url,
					"title" : "Save"
				},
				"lang" : window.lang
			}
			
			this.$el.html(Mustache.render(this.template, view));
			this.$("div").dialog({
				"autoOpen" : true,
				"modal" : true,
				"width" : 400,
				"buttons" : {
					"Ok": function() {
						$(this).dialog("close");
						(window.URL || window.webkitURL).revokeObjectURL(url);
					}
				}
			});
			
			return this;
		}

	});

}(sp.module("core")));