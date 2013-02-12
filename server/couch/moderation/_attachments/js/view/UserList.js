View.UserList = (function() {
	var content;
	return {
		"initialize" : function() {
		},
		"setContent" : function(c) {
			content = c;
		},
		"render" : function() {
			$("#userList tbody").html(Mustache.render($("#tpl-userList").html(), content));
			$("#userList tbody tr a").click(function() {
				console.log($(this).attr("href"));
				$("#presentationList").hide();
				$("#userList").hide();
				$("#user").show();
				
				return false;
			});
		}
	};
}());