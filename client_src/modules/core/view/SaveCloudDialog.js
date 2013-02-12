
(function(Core) {
	
	Core.View.SaveCloudDialog = Backbone.View.extend({
		
		"tagName" : "div",
		
		"template" : $("#sp-tpl-dialog-saveCloud").html(),
		
		"success" : function() {
			this._done.show();
			this._loading.hide();
		},
		
		"error" : function(err) {
			this._error.html(Mustache.render($("#sp-tpl-accountError").html(), {
				"error" : err
			}));
			this._error.show();
			this._loading.hide();
		},
	
		"render" : function() {
			
			var view = {
				"data" : {
					"title" : "Save"
				},
				"lang" : window.lang
			}
			
			this.$el.html(Mustache.render(this.template, view));
			
			this._error = this.$(".sp-account-error");
			this._loading = this.$(".sp-account-loading");
			this._done = this.$(".sp-account-done");
			this._error.hide();
			this._done.hide();
			this.$(".sp-progressIndicator").progressbar({
				"value" : 100
			});
			
			$(this.$("div")[0]).dialog({
				"autoOpen" : true,
				"modal" : true,
				"buttons" : {
					"Hide": function() {
						$(this).dialog("close");
					}
				}
			});
			
			return this;
		}

	});

}(sp.module("core")));