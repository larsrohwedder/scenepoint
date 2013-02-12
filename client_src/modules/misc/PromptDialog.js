/**
 * Simple helper for a simple jQuery-UI dialog that asks for an input
 */

(function(Misc) {
	
	Misc.PromptDialog = function(prompt, callback, context) {
		this.callback = callback;
		this.prompt = prompt;
		this.context = context || this;
	};
	
	Misc.PromptDialog.prototype = {
		"show" : function() {
			var view = {
				"data" : {
					"prompt" : this.prompt,
					"title" : ""
				},
				"lang" : window.lang
			};
			var $el = $(Mustache.render($("#sp-tpl-dialog-text").html(), view)),
			scope = this;
			$el.dialog({
				"buttons" : {
					"Ok" : function() {
						if(this.callback) {
							this.callback.call(this.context || this, $el.find("input").val());
						}
						$(this).dialog("close");
					},
					"Cancel" : function() {
						$(this).dialog("close");
					}
				}
			});
		}
	};
	
}(sp.module("misc")));