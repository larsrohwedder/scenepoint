
(function(Core) {
	
	var dialogEvents = _.extend({}, Backbone.Events),
	$el, editor;
	
	$(function() {
		var view = {
			"data" : {
				"title" : "Enter Text",
			},
		};
		$el = $(Mustache.render($("#sp-tpl-dialog-textarea").html(), view));
		$("#sp-container-body").append($el);
		
		editor = $el.find("textarea").cleditor({
			"controls" : "bold italic | color | bullets numbering | undo redo",
			"useCSS" : true
		});

		var _this = this;
		$el.dialog({
			"autoOpen" : false,
			"modal" : true,
			"width" : "auto",
			"resizable" : false,
			"buttons" : {
				"Ok": function() {
					dialogEvents.trigger("ok");
					$(this).dialog("close");
				},
				"Cancel": function() {
					dialogEvents.trigger("cancel");
					$(this).dialog("close");
				}
			}
		});
	});
	
	Core.View.TextAreaDialog = Backbone.View.extend({
	
		"render" : function() {

			dialogEvents.on("ok", function() {
				if(this.options.success) {
					this.options.success($el.find("textarea").val());
				}
				dialogEvents.off(null, null, this);
			}, this);
			dialogEvents.on("cancel", function() {
				dialogEvents.off(null, null, this);
			}, this);
			
			$el.find("textarea").val(this.options.text);
			$el.dialog("open");
			$el.find("textarea").cleditor()[0].refresh();
			
			return this;
		}

	});

}(sp.module("core")));