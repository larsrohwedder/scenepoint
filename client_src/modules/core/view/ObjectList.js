
(function(Core) {
	
	Core.View.ObjectListItemCommon = Backbone.View.extend({
		
		"tagName" : "tr",
		
		"template" : $("#sp-tpl-objectList").html(),
		
		"events" : {
			"mousedown" : function() {
				if(this.model.collection && this.model.collection.select)
					this.model.collection.select(this.model);
			},
			"dblclick" : function() {
				this.model.trigger("focus", this.model);
			},
			"click span" : function() {
				this.model.destroy();
			}
		},
		
		"initialize" : function() {
			this.model.on("change", this.render, this);
			this.model.on("destroy", function() {
				if(this.model.constructor.type != "CameraPoint") {
					this.$el.effect("puff", null, null, $.proxy(this.remove, this));
				}
			}, this);
			
			this.model.on("select", function() {
				this.$el.addClass("ui-state-highlight");
			}, this);
			this.model.on("unselect", function() {
				this.$el.removeClass("ui-state-highlight");
			}, this);
			
			if(this.model.collection && this.model.collection.selectedObjects.indexOf(this.model) >= 0) {
				this.$el.addClass("ui-state-highlight");
			}
		},
		
		"render" : function() {
			// shorten names
			var name = this.model.get("name");
			if(name.length > 15)
				name = name.substring(0, 12) + "...";
			
			
			this.$el.html(Mustache.render(this.template, {
				"name" : name
			}));
			return this;
		}
		
	});
	
	Core.View.ObjectListItemCamera = Backbone.View.extend({
		
		"tagName" : "tr",
		
		"template" : $("#sp-tpl-objectList").html(),
		
		"events" : {
			"mousedown" : function() {
				if(this.model.collection && this.model.collection.select)
					this.model.collection.select(this.model);
			},
			"dblclick" : function() {
				this.model.trigger("focus", this.model);
			},
			"click span" : function() {
				this.model.destroy();
			}
		},
		
		"initialize" : function() {
			this.model.on("change", this.render, this);
			this.model.on("destroy", function() {
				this.$el.effect("puff", null, null, $.proxy(this.remove, this));
			}, this);
			
			this.model.on("select", function() {
				this.$el.addClass("ui-state-highlight");
			}, this);
			this.model.on("unselect", function() {
				this.$el.removeClass("ui-state-highlight");
			}, this);
		},
		
		"render" : function() {
			// shorten names
			var name = this.model.get("name");
			if(name.length > 15)
				name = name.substring(0, 12) + "...";
			
			this.$el.html(Mustache.render(this.template, {
				"name" : name
			}));
			this.$el.attr("data-id", this.model.get("id"));
			return this;
		}
		
	});

	Core.View.ObjectList = Backbone.View.extend({
		
		"template" : $("#sp-tpl-objectList").html(),
		
		"initialize" : function() {
			var scope = this;
			function addHandler(model) {
				// camera points are handled at camera sequence changes
				if(model.constructor.type != "CameraPoint") {
					scope.$el.find("#sp-objectList-common tbody").append(new Core.View.ObjectListItemCommon({"model":model}).render().$el);
					
					//set active tab where object was added TODO: move to 'select'
//					if($( "#sp-objectList" ).tabs( "option", "active" ) == 1){
//						$( "#sp-objectList" ).tabs( "option", "active", 0 );
//					}
				}
			};
			this.collection.each(addHandler);
			this.collection.on("add", addHandler);
			// header
			this.$el.find("ul li").outerWidth(this.$el.innerWidth() / 2 - 1);
			this.$el.tabs();
			
			this.$el.find("#sp-objectList-camera tbody").sortable({
				"stop" : function() {
					var list = [];
					$("#sp-objectList-camera tr").each(function() {
						list.push(parseInt($(this).attr("data-id")));
					});
					scope.options.cameraSequence.set("list", list);
				}
			});
			
			var camElems = {};
			function resort() {
				var container = scope.$el.find("#sp-objectList-camera tbody"),
				elems = container.children(),
				lis = scope.options.cameraSequence.get("list");
				container.empty();
				for(var i=0; i<lis.length; i++) {
					if(!lis[i])
						continue;
					var model = scope.collection.get(lis[i]);
					if(model && !camElems[lis[i]]) {
						camElems[lis[i]] = new Core.View.ObjectListItemCamera({"model":model}).render();
					}
					container.append(camElems[lis[i]].$el);
					// refresh listeners
					camElems[lis[i]].delegateEvents();
				}
				for(var i in camElems) {
					if(lis.indexOf(parseInt(i)) < 0) {
						delete camElems[i];
					}
				}
				container.sortable("refresh");
			}
			this.options.cameraSequence.on("change", resort);
			resort();
		},
		
	},{
	});
	
}(sp.module("core")));