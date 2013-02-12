(function() {
	

	View.Window = Backbone.View.extend({
		
	
		"initialize" : function() {
			this.$("#presentationList").show();
			this.$("#userList").hide();
			this.$("#user").hide();
			
			this.$("#mb-show-presi").click(function() {
				this.$("#presentationList").show();
				this.$("#userList").hide();
				this.$("#user").hide();
				$.getJSON("/moderation/_view/sorted_presentations?startkey=[\"name\",\"\"]&endkey=[\"name\",[]]", function(json) {
					View.PresentationList.setContent(json);
					View.PresentationList.render();
				}).fail(function(err) {
					alert("Error loading presentations")
				})
			}),
			
			this.$("#mb-show-users").click(function() {
				this.$("#presentationList").hide();
				this.$("#userList").show();
				this.$("#user").hide();
				$.getJSON("/users/_design/_auth/_view/sorted_users?startkey=[\"name\",\"\"]&endkey=[\"name\",[]]", function(json) {
					View.UserList.setContent(json);
					View.UserList.render();
				}).fail(function(err) {
					alert("Error loading users")
				})
			});
		}
	});
}());
	