
(function(Core) {
	
	Core.View.OpenCloudDialog = Backbone.View.extend({
		
		"template" : $("#sp-tpl-openCloudDialog").html(),
		
		"initialize" : function() {
			this._offset = 0;
			this._entriesPerPage = 5;
			this._mode = "my";
		},
	
		"render" : function() {
			var scope = this;
							
			this.$el.html(Mustache.render(this.template, {}));
			this.$el.attr("title", "Open from Cloud");
			
			this.$("#sp-openCloud-navigation li").hover(
				function() {
					$(this).addClass("ui-state-hover");
				},
				function() {
					$(this).removeClass("ui-state-hover");
				}
			);
			
			this.$("#sp-openCloud-navigation li").each(function(i) {
				$(this).click(function() {
					scope._offset = 0;
					scope._mode = i == 0 ? "my" : i == 1 ? "team" : "open";
					scope.$("#sp-openCloud-navigation li").each(function(j) {
						if(i == j)
							$(this).addClass("ui-state-active");
						else
							$(this).removeClass("ui-state-active");
					});
					scope.queryEntries();
				});
			});
			
			this.$el.dialog({
				"autoOpen": true,
				
				"width" : 750,
				
				"height" : 500,
				
				"resizable" : false,
				
				"modal": true,
				
				"buttons": {
					"Cancel" : function() {
						scope.$el.dialog("close");
					}
				}
			});
			
			this.queryEntries();
			
		},
		
		"queryEntries" : function() {
			
			var user = this.model.uiStatus.get("userCtx").name,
			scope = this, contentTemplate = $("#sp-tpl-openCloudDialogContent").html(),
			pendingTemplate = $("#sp-tpl-openCloudDialogPending").html(),
			errorTemplate = $("#sp-tpl-openCloudDialogError").html(),
			url, query;

			scope.$("#sp-openCloud-content").html(Mustache.render(pendingTemplate, {}));
			
			$.getJSON("/browse?target=" + this._mode + "&skip="+this._offset+"&limit="+this._entriesPerPage, function(data) {
				
				scope.$("#sp-openCloud-content").html(Mustache.render(contentTemplate, _.defaults(data, {					
					"start" : scope._offset,
					"end" : scope._offset + scope._entriesPerPage
				})));
				
				scope.$("#sp-openCloud-content .sp-open-project").click(function($e) {
					var id = $($e.target).closest("tr").attr("data-id");
					scope.model.openCloud(id);
					scope.$el.dialog("close");
				});
				
				scope.$("#sp-openCloud-content span").has(".ui-icon-triangle-1-w").click(function() {
					scope._offset = Math.max(scope._offset - scope._entriesPerPage, 0);
					scope.queryEntries();
				});
				scope.$("#sp-openCloud-content span").has(".ui-icon-triangle-1-e").click(function() {
					scope._offset = scope._offset + scope._entriesPerPage;
					scope.queryEntries();
				});
				
			}).error(function() {
				
				scope.$("#sp-openCloud-content").html(Mustache.render(errorTemplate, {}));
				scope.$("#sp-openCloud-content .ui-state-default").click(function() {
					scope.queryEntries();
				});
				
				scope.$("#sp-openCloud-content .ui-state-default").hover(
					function() {
						$(this).addClass("ui-state-hover");
					},
					function() {
						$(this).removeClass("ui-state-hover");
					}
				);
				
			});
			
		}

	});

}(sp.module("core")));