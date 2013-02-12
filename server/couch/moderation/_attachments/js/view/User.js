View.User = (function() {
	var content;
	return {
		"initialize" : function() {
		},
		"setContent" : function(c) {
			content = c;
		},
		"render" : function() {
			$("#user-info").html(Mustache.render($("#tpl-user").html(), content));
		}
	};
}());