
(function(Core) {
	
	// dependencies
	var Misc = sp.module("misc");

	
	function upload(json, onFail, onSuccess, scope) {
		json.date = new Date().getTime();
		$.ajax("/db/"+json._id, {
			"type" : "PUT",
			"dataType" : "json",
			"contentType" : "application/json",
			"data" : JSON.stringify(json)
		}).success(function(data) {
			scope.model.set("_rev", data.rev);
			scope.model.set("_id", data.id);
			onSuccess();
		}).fail(onFail);
	};
	
	Core.View.NavigationBar = Backbone.View.extend({
				
		"template" : $("#sp-tpl-navbar").html(),
		
		"events" : {
			"click #sp-navbarNew" : function() { 
				this.model.createNew();
				new Core.View.PreferenceDialog({ "model" : this.model }).render();
			},
			"click #sp-navbarOpen" : function() { 
				new Misc.OpenFileDialog(function(files) {
					if(files.length <= 0)
						return;
					var file = files[0];
	    			var reader = new FileReader(),
	    			scope = this;
	    			reader.onload = function(e) {
		    			var obj = JSON.parse(e.target.result);
		    			if(obj && obj._attachments && obj.objects) {
		    				scope.model.clear();
		    				scope.model.inflate(obj);
		    			}
	    			};
	    			reader.readAsText(file, "utf-8");
				}, this).show();
			},
			
			"click #sp-navbarSave" : function() {
				new Core.View.SaveDialog({
					"content" : JSON.stringify(this.model)
				}).render();
			},
			
			"click #sp-navbarOpenCloud" : function() { 
				if(this.$("#sp-navbarOpenCloud").hasClass("ui-state-disabled")) {
	    			return;
				}

				new Core.View.OpenCloudDialog({"model" : this.model}).render();
			},
			
			"click #sp-navbarSaveCloudNew" : function() {
				if(this.$("#sp-navbarSaveCloudNew").hasClass("ui-state-disabled")) {
	    			return;
				}

				var dialog = new Core.View.SaveCloudDialog().render();
				
				var scope = this;
				function onFail(jqXHR) {
					try {
						var json = $.parseJSON(jqXHR.responseText);
					} catch(e) {}
					
					if(json && json.error) {
						dialog.error("Unable to save ("+json.reason+").");
					} else {
						dialog.error("Unable to save.");
					}
				};
				
				function onSuccess() {
					dialog.success();
				};
				
				// get uuid first
				$.getJSON("/uuids", function(data) {
					var id;
					if(data && data.uuids) {
						id = data.uuids[0];
					} else {
						onFail(null);
						return;
					}
					
					var json = scope.model.toJSON();
					if(json._rev)
						delete json._rev;
					json._id = id;
					json.author = scope.model.uiStatus.get("userCtx").name;
					upload(json, onFail, onSuccess, scope);
				}).fail(onFail);
			},

			"click #sp-navbarSaveCloud" : function() {
				if(this.$("#sp-navbarSaveCloud").hasClass("ui-state-disabled")) {
	    			return;
				}

				var dialog = new Core.View.SaveCloudDialog().render();

				var scope = this;
				function onFail(jqXHR) {
					try {
						var json = $.parseJSON(jqXHR.responseText);
					} catch(e) {}

					if(json && json.error) {
						dialog.error("Unable to save ("+json.reason+").");
					} else {
						dialog.error("Unable to save.");
					}
				};
				
				function onSuccess() {
					dialog.success();
				};

				upload(scope.model.toJSON(), onFail, onSuccess, scope);
			},
			
			"click #sp-navbarPreferences" : function() {
				new Core.View.PreferenceDialog({ "model" : this.model }).render();
			},
			
			"click #sp-navbarInsertImagePlane" : function() { 
				this.model.objectList.select(this.model.addObject("ImagePlane").trigger("select")); 
			},
			"click #sp-navbarInsertGeometry" : function() { 
				this.model.objectList.select(this.model.addObject("Geometry").trigger("select")); 
			},
			"click #sp-navbarInsertText" : function() { 
				this.model.objectList.select(this.model.addObject("Text3D").trigger("select"));
			},
			"click #sp-navbarInsertTextPlane" : function() { 
				this.model.objectList.select(this.model.addObject("TextPlane"));
			},
			"click #sp-navbarInsertVideo" : function() { 
				this.model.objectList.select(this.model.addObject("VideoPlane", {
					"video" : "assets/videos/Chrome_ImF.webm"
				}));
			},
			"click #sp-navbarInsertCameraPoint" : function() { 
				var model = this.model.addObject("CameraPoint");
				model.trigger("focus", model);
				this.model.objectList.select(model);
			},
			"click #sp-navbarInsertBackground" : function() { this.model.addObject("Background") },
			
			"click #sp-navbarViewScene" : function() { 
				this.model.uiStatus.set("mode", "edit");
			},
			"click #sp-navbarViewPlay" : function() { 
				this.model.uiStatus.set("mode", "play");
			},
			"click #sp-navbarUndo" : function() { 
				this.model.history.undo();
			},
			"click #sp-navbarRedo" : function() { 
				this.model.history.redo();
			},
			"click #sp-navbarHelp" : function() { 
				this.model.uiStatus.set("tooltips", !this.model.uiStatus.get("tooltips"));
			}

		},
		
		"render" : function() {
			var scope = this;
			
			var view = {
				"lang" : window.lang,
				"config" : window.config
			}
			this.$el.html(Mustache.render(this.template, view));

			this.$(".sp-logo img").position({
				"of": this.$(".sp-logo"),
				"at": "center center"
			});
			
			this.$(".sp-trigger").hover(
				function() {
					$(this).addClass("ui-state-hover");
				},
				function() {
					$(this).removeClass("ui-state-hover");
				}
			);
						
			$(".sp-menu").find("ul").hide();
			
			this.$(".sp-trigger").click(function() {
				if($(this).hasClass("ui-state-active")) {
					$(this).removeClass("ui-state-active");
					$(this).parent().find("ul").slideUp();
				} else {
					$(this).addClass("ui-state-active");
					$(this).parent().find("ul").slideDown();
				}
			});
			
			var scope = this;
			$(document).mouseup(function(e) {
				var elems = scope.$(".sp-trigger.ui-state-active");
				for(var i=0; i<elems.length; i++) {
					if(!$(elems[i]).is(e.target) && $(elems[i]).has(e.target).length <= 0) {
						$(elems[i]).removeClass("ui-state-active");
						$(elems[i]).parent().find("ul").slideUp();
					}
				}
			});
			
			
			function updateUser() {
				var userCtx = this.model.uiStatus.get("userCtx");

				this.$("#sp-login-info").html(Mustache.render($("#sp-tpl-loginInfo").html(), {
					"user" : userCtx ? userCtx.name : null
				}));
				if(userCtx && userCtx.name) {
					this.$("#sp-login-info a").click(function() {
						$.ajax("/session", {
							"type" : "DELETE"
						}).done(function() {
							scope.model.uiStatus.set("userCtx", null);
						}).fail(function() {
							scope.model.uiStatus.trigger("error", scope.model, "Unable to logout");
						})
						return false;
					});
				} else {
					this.$("#sp-login-info .sp-login").click(function() {
						new Core.View.LoginDialog({
							"model" : scope.model.uiStatus,
							"type" : "login"
						}).render();
						return false;
					});
					this.$("#sp-login-info .sp-register").click(function() {
						new Core.View.RegisterDialog({
							"model" : scope.model.uiStatus,
							"type" : "login"
						}).render();
						return false;
					});
				}
			}
			this.model.uiStatus.on("change:userCtx", function() {
				updateUser.call(this);
			}, this);
			updateUser.call(this);
			
			function updateCloud() {
				var id = this.model.get("_id"),
				users = this.model.get("users"),
				author = this.model.get("author"),
				userCtx = this.model.uiStatus.get("userCtx");
				if(!id || !userCtx || 
					!(author == userCtx.name || (users[userCtx.name] && users[userCtx.name].roles.indexOf("write") != -1))) {
					this.$("#sp-navbarSaveCloud").addClass("ui-state-disabled");
				} else {
					this.$("#sp-navbarSaveCloud").removeClass("ui-state-disabled");
				}
				if(!userCtx || !userCtx.name) {
					this.$("#sp-navbarSaveCloudNew").addClass("ui-state-disabled");
				} else {
					this.$("#sp-navbarSaveCloudNew").removeClass("ui-state-disabled");
				}
			}
			this.model.on("change:_id", updateCloud, this);
			this.model.on("change:users", updateCloud, this);
			this.model.on("change:author", updateCloud, this);
			this.model.uiStatus.on("change:userCtx", updateCloud, this);
			updateCloud.call(this);
			
			this.model.uiStatus.on("change:progress", function() {
				var p = this.model.uiStatus.get("progress");
				if(p > 0) {
					this.$el.find("#sp-progressIndicator").show();
				} else {
					this.$el.find("#sp-progressIndicator").hide();
				}
			}, this);
			this.$el.find("#sp-progressIndicator").hide();
			
			return this;
		}
		
	});
	
	
}(sp.module("core")));