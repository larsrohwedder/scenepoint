
(function(Core) {
	
	//dependencies
	var Misc = sp.module("misc");
	var Resource = sp.module("resource");
		
	Core.View.TextureDialog = Backbone.View.extend({
		
		"template" : $("#sp-tpl-dialogTexture").html(),
				
		"initialize" : function() {
		},
	
		"render" : function() {
			var scope = this;
			
			var view = {};
			this.$el.html(Mustache.render(this.template, view));
			
			var resources = this.options.resources;
//			resources.each(function(res) {
//				if(/^image.*/.test(res.get("content_type"))) {
//					var span = $("<span>"),
//					im = res.getImage();
//					$(res.getImage()).data("id", res.id);
//					span.append(im);
//					$(im).css("height", ($(im).css("width") * im.height / im.width) + "px");
//					this.$("div").append(span);
//				}
//			}, this);
						
			this.$el.dialog({
				"autoOpen": true,
				
				"width" : 500,
				
				"resizable" : true,
				
				"buttons" : {
					"Open File" : function() {
						new Misc.OpenFileDialog(function(files) {
							if(files.length > 0 && scope.options.success) {
					    		Resource.Model.Resource.fromFile(files[0], function(texture) {
					    			var id = resources.createID();
					    			texture.set("id", id);
					    			resources.add(texture);
									scope.options.success(id);
					    		}, this);
							}
							this.$el.dialog("close");
						}, scope).show();
					}
				}
			});
			
			this.$el.click(function($e) {
				if($e.target.nodeName === "IMG") {
					if(scope.options.success) {
						scope.options.success($($e.target).data("id"));
					}
					scope.$el.dialog("close");
				}
			});
		}

	});

}(sp.module("core")));