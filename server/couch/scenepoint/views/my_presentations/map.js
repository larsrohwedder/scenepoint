function(doc) {
	if(doc.author) {
		emit([doc.author, doc.date], {
			"name" : doc.name,
			"author" : doc.author,
			"date" : doc.date
		});
	}
}
