
(function(Core) {
	
	// dependencies
	var Misc = sp.module("misc");
	
	var dialogEvents = _.extend({}, Backbone.Events),
	$el;
	
	$(function() {
		var view = {};
		$el = $(Mustache.render($("#sp-tpl-dialogCaptcha").html(), view));
		$("sp-container-body").append($el);
		$el.attr("title", "Human Verification");
		$el.dialog({
			"autoOpen": false,
			
			"width" : "auto",
			
			"resizable" : false,
			
			"modal": true,
			
			"buttons": {
				"Submit" : function() {
					dialogEvents.trigger("submit");
				},
				"Cancel" : function() {
					dialogEvents.trigger("cancel");
				}
			}
		});

	});

	function create() {
		Recaptcha.create(window.config["reCaptchaPublicKey"],
			"recaptcha-container", 
			{
				"theme" : "white",
				"callback" : Recaptcha.focus_response_field
			}
	    );
	}
	
	Core.View.CaptchaDialog = Backbone.View.extend({
	
		"reload" : function(err) {
			Recaptcha.destroy();
			create();
			$el.find(".sp-account-error").html(Mustache
					.render($("#sp-tpl-accountError").html(), {"error" : JSON.stringify(json)}));
			$el.find(".sp-account-error").show();
		},
		
		"remove" : function() {
			Backbone.View.prototype.remove.call(this);
			Recaptcha.destroy();
			dialogEvents.off(null, null, this);
			$el.dialog("close");
		},
		
		"render" : function() {
			scope = this;
			
			$el.find(".sp-account-loading").hide();
			$el.find(".sp-account-error").hide();
			
			$el.dialog("open");

			create();
			
			dialogEvents.on("submit", function() {
				$el.find(".sp-account-loading").show();
				$el.find(".sp-account-error").hide();

				var challenge = Recaptcha.get_challenge(),
				response = Recaptcha.get_response();
					
				this.trigger("submit", challenge, response);
			}, this);
			
			dialogEvents.on("cancel", function() {
				close();
				this.trigger("fail");
			}, this);
			
			return this;
		}

	});

}(sp.module("core")));