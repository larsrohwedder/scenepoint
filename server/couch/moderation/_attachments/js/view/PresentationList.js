View.PresentationList = (function() {
	var content;
	return {
		"setContent" : function(c) {
			content = c;
		},
		"render" : function() {
			$("#presentationList tbody").html(Mustache.render($("#tpl-presentationList").html(), content));
		}
	};
}());