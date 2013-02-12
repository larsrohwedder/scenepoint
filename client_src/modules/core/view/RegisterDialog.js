
(function(Core) {
	
	// dependencies
	var Misc = sp.module("misc");
	
	Core.View.RegisterDialog = Backbone.View.extend({
		
		"template" : $("#sp-tpl-dialogRegister").html(),
				
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
			this.$el.attr("title", "Register");
			
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
			console.debug("enter");
			var scope = this;
			scope.$(".sp-account-error").hide();
			
			var name = scope.$("#sp-register-name").val().toLowerCase(),
			mail = scope.$("#sp-register-mail").val();
			password = scope.$("#sp-register-password").val();
			password2 = scope.$("#sp-register-password2").val();
			
			if(!/^[A-Z0-9._-]+$/i.test(name)) {
					// RegExp for Email syntax
					scope.$(".sp-account-error").html(Mustache
							.render($("#sp-tpl-accountError").html(), {"error" : "Invalid username! Only letters, numbers and . _ - are allowed"}));
					scope.$(".sp-account-error").show();
					return;
			} else if(!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(mail)) {
					// RegExp for Email syntax
					scope.$(".sp-account-error").html(Mustache
							.render($("#sp-tpl-accountError").html(), {"error" : "Email is not valid!"}));
					scope.$(".sp-account-error").show();
					return;
				
			}else if(password != password2) {
				scope.$(".sp-account-error").html(Mustache
						.render($("#sp-tpl-accountError").html(), {"error" : "Passwords are not equal!"}));
				scope.$(".sp-account-error").show();
				return;
			}else if(password == "") {
				scope.$(".sp-account-error").html(Mustache
						.render($("#sp-tpl-accountError").html(), {"error" : "Please enter password"}));
				scope.$(".sp-account-error").show();
				return;
			}

			scope.$(".sp-account-loading").show();

			var doc = {
					"name" : name,
					"email" : mail,
					"password" : password
			}

			function onFail(jqXHR) {
				scope.$(".sp-account-loading").hide();
				try {
					var json = $.parseJSON(jqXHR.responseText);
				} catch(e) {}
				
				
				if(json && json.error == "conflict"){
					scope.$(".sp-account-error").html(Mustache
							.render($("#sp-tpl-accountError").html(), {"error" : "Username already registered"}));
					scope.$(".sp-account-error").show();
				}
				else if(json && json.error) {
					scope.$(".sp-account-error").html(Mustache
							.render($("#sp-tpl-accountError").html(), {"error" : json.reason}));
					scope.$(".sp-account-error").show();
				} else {
					scope.$(".sp-account-error").html(Mustache
							.render($("#sp-tpl-accountError").html(), {"error" : "Login Failed"}));
					scope.$(".sp-account-error").show();
				}
			}

			new Misc.Queue().queue(function(q) {

				// show captcha challenge
				var cd = new Core.View.CaptchaDialog().render();
				cd.on("submit", function(challenge, response) {
					doc.challenge = challenge;
					doc.response = response;
					q.next(cd);
				});
			}).queue(function(q, cd) {
				// register

				$.ajax("/register", {
					"type" : "PUT",
					"contentType" : "application/json",
					"data" : JSON.stringify(doc)
				}).done(function(data) {
					cd.remove();
					q.next();
				}).fail(function() {
					cd.remove();
					onFail.apply(this, arguments);
				});
	
			}).queue(function(q) {
				// login
	
				$.ajax("/session", {
					"type" : "POST",
					"data" : "name="+name+"&password="+password
				}).done(function(data) {
					var response = $.parseJSON(data);
					scope.model.set("userCtx", response);
					scope.$el.dialog("close");
				}).fail(onFail);
	
			}).queue(function(q, response) {
				// update internal user attribute
				// check if catcha is neccessary
						
				scope.model.set("userCtx", response);
				scope.$el.dialog("close");
	
				if(response.roles.indexOf("validated") == -1) {
					new Core.View.CaptchaDialog({ "user" : response.name }).render();
				}
	
			});
		}
	});

}(sp.module("core")));