function(doc) {
	if(doc.worldReadable) {
		emit([doc.name, doc.date], {
			"name" : doc.name,
			"author" : doc.author,
			"date" : doc.date
		});
	}
}
