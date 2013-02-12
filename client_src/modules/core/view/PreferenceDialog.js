
(function(Core) {
	
	Core.View.PreferenceDialog = Backbone.View.extend({
		
		"template" : $("#sp-tpl-prefDialog").html(),
	
		"render" : function() {
			var scope = this;
			
			var rowTemplate = $("#sp-tpl-prefDialogPermissionRow").html();
			
			var view = {
				"worldReadable" : this.model.get("worldReadable"),
				"name" : this.model.get("name"),
				"users" : [],
			}
			var userHash = this.model.get("users") || {};
			for(var i in userHash) {
				view.users.push((function() {
					var user = {
						"name" : i,
						"write" : false
					};
					for(var j=0; j<userHash[i].roles.length; j++) {
						if(userHash[i].roles[j] === "write")
							user.write = true;
					}
					return user;
				}()));
			}
				
			this.$el.html(Mustache.render(this.template, view, {
				"permissionRow" : rowTemplate
			}));
			this.$el.attr("title", "Preferences");
			
			this.$("#sp-pref-navigation li, .sp-perm-add, .sp-perm-remove").hover(
				function() {
					$(this).addClass("ui-state-hover");
				},
				function() {
					$(this).removeClass("ui-state-hover");
				}
			);
			
			function onClick() {
				var j = $(this).index();
				console.debug("onClick "+j);
				$(this).addClass("ui-state-active");
				scope.$("#sp-pref-navigation li").each(function(i) {
					if(i != j)
						$(this).removeClass("ui-state-active");
				});
				scope.$("#sp-pref-content").children().each(function(i) {
					if(i != j)
						$(this).hide();
					else
						$(this).show();
				});
			}
			
			onClick.call($("#sp-pref-navigation li")[0]);
						
			this.$("#sp-pref-navigation li").click(onClick);
			
			this.$(".sp-perm-add").click(function() {
				var $elem = $(Mustache.render(rowTemplate, {
					"name" : "",
					"write" : false
				}));
				$elem.find(".sp-perm-remove").click(function() {
					$(this).closest("tr").remove();
				});
				$(this).closest("tr").before($elem);
			});
			
			this.$(".sp-perm-remove").click(function() {
				$(this).closest("tr").remove();
			});
			
			this.$el.dialog({
				"autoOpen": true,
				
				"width" : 750,
				
				"height" : 500,
				
				"resizable" : false,
				
				"modal": true,
				
				"buttons": {
					"Ok" : function() {
						scope.applyChanges();
						scope.$el.dialog("close");
					},
					"Apply" : function() {
						scope.applyChanges();
					},
					"Cancel" : function() {
						scope.$el.dialog("close");
					}
				}
			});
		},
		
		"applyChanges" : function() {
			var users = {};
			this.$("#sp-pref-permissions tr").each(function(i) {
				var name = $(this).find(".sp-permission-name").val();
				var write = !_.isUndefined($(this).find(".sp-permission-write").attr("selected"));
				if(name) {
					users[name] = {
						"roles" : []
					};
					if(write)
						users[name].roles.push("write");
				}
			});
			this.model.set("users", users);
			
			this.model.set("worldReadable", this.$("#sp-pref-permissions-worldReadable").attr("checked") === "checked");

			this.model.set("name", this.$("#sp-pref-general-name").val());
		}

	});

}(sp.module("core")));