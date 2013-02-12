
(function(Core) {

	// dependencies
	var Misc = sp.module("misc");
	
	Core.View.LoginDialog = Backbone.View.extend({
		
		"template" : $("#sp-tpl-dialogLogin").html(),
				
		"initialize" : function() {
		var scope = this;
		$(document).bind("keydown", function($e) {
			var keyCode = $e.which || $e.originalEvent.keyCode;
		
			if(keyCode == 13){
				console.debug("submit");
				scope.enter();
			}
		});

		},
	
		"render" : function() {
			var scope = this;
			
			var view = {};
			this.$el.html(Mustache.render(this.template, view));
			this.$el.attr("title", "Login");
			
			this.$(".sp-account-loading").hide();
			this.$(".sp-account-error").hide();
			
			

			this.$el.dialog({
				
				
				"autoOpen": true,
				
				"resizable" : false,
				
				"modal": true,
				
				"buttons": {
					"Submit" : function() {
						scope.enter();
					},
					"Cancel" : function() {
						scope.$el.dialog("close");
					}
				}
			});
		},

		"enter" : function() {
			var scope = this;

			scope.$(".sp-account-error").hide();
			scope.$(".sp-account-loading").show();
	
			var name = scope.$("#sp-login-name").val(),
					password = scope.$("#sp-login-password").val(),
					nameEnc = encodeURIComponent(name),
					nameEnc2 = nameEnc.replace("%", "%"+"%".charCodeAt(0).toString(16));
	
			new Misc.Queue().queue(function(q) {
		
				$.ajax("/session", {
					"type" : "POST",
					"data" : "name="+name+"&password="+password
				}).done(function(data) {
					scope.$(".sp-account-loading").hide();
					var response = $.parseJSON(data);								
					q.next(response);

				}).fail(function(jqXHR) {
					scope.$(".sp-account-loading").hide();
					try {
						var json = $.parseJSON(jqXHR.responseText);
					} catch(e) {}
			
					if(json && json.error) {
						scope.$(".sp-account-error").html(Mustache
								.render($("#sp-tpl-accountError").html(), {"error" : json.reason}));
						scope.$(".sp-account-error").show();
					} else {
						scope.$(".sp-account-error").html(Mustache
								.render($("#sp-tpl-accountError").html(), {"error" : "Login Failed"}));
						scope.$(".sp-account-error").show();
					}
				});

			}).queue(function(q, response) {
				scope.model.set("userCtx", response);
				scope.$el.dialog("close");
			});
		
		}
	});

}(sp.module("core")));