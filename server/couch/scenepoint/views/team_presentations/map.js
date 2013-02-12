function(doc) {
	if(doc.author && doc.users) {
		function f(user) {
			emit([user, doc.date], {
				"name" : doc.name,
				"author" : doc.author,
				"date" : doc.date
			});
		}
		
		for(var i=0; i<doc.users.length; i++) {
			f(doc.users[i]);
		}
		f(doc.author);
	}
}
