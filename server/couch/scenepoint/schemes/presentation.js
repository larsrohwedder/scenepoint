exports.schema = {
	"type" : "object",
			
	"properties" : {
		
		"_id" : {
			"type" : "string",
		},
		"_rev" : {
			"type" : "string",
		},
		"_revisions" : {
			"type" : "object",
		},
		"author" : {
			"type" : "string",
			"required" : true
		},
		"name" : {
			"type" : "string",
			"required" : true
		},
		"users" : {
			"type" : "object",
			"additionalProperties" : {
				"type" : "object",
				"properties" : {
					"roles" : {
						"type" : "array",
						"items" : {
							"type" : "string"
						}
					}
				},
				"additionalProperties" : false
			},
			"required" : true
		},
		"worldReadable" : {
			"type" : "boolean",
			"required" : true
		},
		"objects" : {
			"type" : "array",
			"items" : {
				"type" : "object"
			},
			"required" : true
		},
		"_attachments" : {
			"type" : "object"
		}
	}
};