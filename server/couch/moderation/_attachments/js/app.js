var View = {},
Model = {};

$(function() {
	View.UserList.initialize();
	
	$("#presentationList").hide();
	$("#userList").hide();
	$("#user").hide();
	
	$("#mb-show-presi").click(function() {
		$("#presentationList").show();
		$("#userList").hide();
		$("#user").hide();
		$.getJSON("/moderation/_view/sorted_presentations?startkey=[\"name\",\"\"]&endkey=[\"name\",[]]", function(json) {
			View.PresentationList.setContent(json);
			View.PresentationList.render();
		}).fail(function(err) {
			alert("Error loading presentations")
		})
	}),
	
	$("#mb-show-users").click(function() {
		$("#presentationList").hide();
		$("#userList").show();
		$("#user").hide();
		$.getJSON("/users/_design/_auth/_view/sorted_users?startkey=[\"name\",\"\"]&endkey=[\"name\",[]]", function(json) {
			View.UserList.setContent(json);
			View.UserList.render();
		}).fail(function(err) {
			alert("Error loading users")
		})
	});
	
	

	function addUserLink(name) {

		
		
	};
	
	

});