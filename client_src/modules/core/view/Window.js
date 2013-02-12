(function(Core) {
	
	Misc = sp.module("misc");
	
	Core.View.Window = Backbone.View.extend({
		
		"el" : $("#sp-container-body")[0],
		
		"template" : $("#sp-body").html(),
		
		"initialize" : function() {
			
			// setup listeners
			this.model.uiStatus.on("change:mode", function() {
				var mode = this.model.uiStatus.get("mode");
				if(mode == "play") {
					this.$el.find("canvas").show();
					this.$("#sp-playBar").show();
					this.$("#sp-navbar").hide();
					this.$("#sp-sidebarRight").hide();
					this.$("#sp-attributeList").hide();
					this.$el.find("p").hide();
					this.layout();
					$("body").animate({
						"background-color" : "#000"
					}, "slow");
				} else {
					this.$("#sp-navbar").show();
					this.$("#sp-sidebarRight").show();
					this.$("#sp-attributeList").show();
					this.$("#sp-playBar").hide();
					if(mode == "edit") {
						this.$el.find("canvas").show();
						this.$el.find("p").hide();
					} else if(mode == "source") {
						this.$("p").html(JSON.stringify(this.model, null, "\t"));
						this.$("p").show();
						this.$("canvas").hide();
					}
					this.layout();
					$("body").animate({
						"background-color" : "#fff"
					}, "slow");
				}
			}, this);
			
			this.model.uiStatus.on("error", function(model, error) {
				var $div = $(Mustache.render($("#sp-tpl-errorDialog").html(), {
					"title" : "Error",
					"content" : error
				}));
				$div.dialog({
					"modal" : true,
					"buttons" : {
						"OK" : function() {
							$(this).dialog("close");
						}
					}
				});
			}, this);

			this.model.uiStatus.on("change:tooltips", function() {
				console.debug("toggle");
				console.debug(this.model.uiStatus.get("tooltips"));
				if(this.model.uiStatus.get("tooltips")){
					this.$("#sp-navbarUndo").tooltip( "enable" );
					this.$("#sp-navbarRedo").tooltip( "enable" );
					this.$("#sp-objectList #trigger-tab-1").tooltip( "enable" );
					this.$("#sp-objectList #trigger-tab-2").tooltip( "enable" );
					this.$("#sp-transform1").tooltip( "enable" );
					this.$("#sp-transform2").tooltip( "enable" );
					this.$("#sp-transform3").tooltip( "enable" );
					
					this.$("#sp-project-menu").tooltip( "enable" );
					this.$("#sp-navbarNew").tooltip( "enable" );
					this.$("#sp-navbarOpen").tooltip( "enable" );
					this.$("#sp-navbarSave").tooltip( "enable" );
					this.$("#sp-navbarOpenCloud").tooltip( "enable" );
					this.$("#sp-navbarSaveCloud").tooltip( "enable" );
					this.$("#sp-navbarSaveCloudNew").tooltip( "enable" );
					this.$("#sp-navbarPreferences").tooltip( "enable" );
					
					this.$("#sp-insert-menu").tooltip( "enable" );
					this.$("#sp-navbarInsertImagePlane").tooltip( "enable" );
					this.$("#sp-navbarInsertGeometry").tooltip( "enable" );
					this.$("#sp-navbarInsertText").tooltip( "enable" );
					this.$("#sp-navbarInsertTextPlane").tooltip( "enable" );
					this.$("#sp-navbarInsertVideo").tooltip( "enable" );
					this.$("#sp-navbarInsertCameraPoint").tooltip( "enable" );
					
					this.$("#sp-view-menu").tooltip( "enable" );
					this.$("#sp-navbarViewScene").tooltip( "enable" );
					this.$("#sp-navbarViewPlay").tooltip( "enable" );
					
					this.$("#sp-navbarHelp").tooltip("option", "content", "<b>Deactivate help</b>" );
				}else{
					this.$("#sp-navbarUndo").tooltip( "disable" );
					this.$("#sp-navbarRedo").tooltip( "disable" );
					this.$("#sp-objectList #trigger-tab-1").tooltip( "disable" );
					this.$("#sp-objectList #trigger-tab-2").tooltip( "disable" );
					this.$("#sp-transform1").tooltip( "disable" );
					this.$("#sp-transform2").tooltip( "disable" );
					this.$("#sp-transform3").tooltip( "disable" );
					
					this.$("#sp-project-menu").tooltip( "disable" );
					this.$("#sp-navbarNew").tooltip( "disable" );
					this.$("#sp-navbarOpen").tooltip( "disable" );
					this.$("#sp-navbarSave").tooltip( "disable" );
					this.$("#sp-navbarOpenCloud").tooltip( "disable" );
					this.$("#sp-navbarSaveCloud").tooltip( "disable" );
					this.$("#sp-navbarSaveCloudNew").tooltip( "disable" );
					this.$("#sp-navbarPreferences").tooltip( "disable" );
					
					this.$("#sp-insert-menu").tooltip( "disable" );
					this.$("#sp-navbarInsertImagePlane").tooltip( "disable" );
					this.$("#sp-navbarInsertGeometry").tooltip( "disable" );
					this.$("#sp-navbarInsertText").tooltip( "disable" );
					this.$("#sp-navbarInsertTextPlane").tooltip( "disable" );
					this.$("#sp-navbarInsertVideo").tooltip( "disable" );
					this.$("#sp-navbarInsertCameraPoint").tooltip( "disable" );
					
					this.$("#sp-view-menu").tooltip( "disable" );
					this.$("#sp-navbarViewScene").tooltip( "disable" );
					this.$("#sp-navbarViewPlay").tooltip( "disable" );
					
					this.$("#sp-navbarHelp").tooltip("option", "content", "<b>Activate help</b>" );
				}
			}, this);
			

			
			var scope = this;
			
			$(window).bind("beforeunload", function() {
				if(window.config["warnBeforeUnload"] && !scope.model.history.isEmpty())
					return "Are you sure?";
			});
			
			$(document).bind("keydown", function($e) {
				var mode = scope.model.uiStatus.get("mode");
				var keyCode = $e.which || $e.originalEvent.keyCode;
				var shiftDown = $e.originalEvent.shiftKey;
				
				
				
				var ctrlDown = $e.originalEvent.ctrlKey;			
				
				
				// no shortcuts when inputs have focus
				var tag = $($e.target).prop("nodeName");
				if(tag == "INPUT" || tag == "TEXTAREA") {
					// no F5 refresh
					if(keyCode == 116)
						return false;
					return;
				}

				if(mode == "play" && (keyCode == 37 || keyCode == 33)) // left arrow or page down
					scope.playBar.previous();
				else if(mode == "play" && (keyCode == 39 || keyCode == 34)) // right arrow or page up
					scope.playBar.next();
				else if(mode == "play" && keyCode == 190)
					scope.model.uiStatus.set("darken", !scope.model.uiStatus.get("darken"));
				else if(keyCode == 116) // F5
					scope.model.uiStatus.set("mode", "play");
				else if(keyCode == 27) // esc
					scope.model.uiStatus.set("mode", "edit");
				else if(shiftDown && keyCode == 77) // m
					scope.model.uiStatus.set("transform", "translate");
				else if(shiftDown && keyCode == 82) // r
					scope.model.uiStatus.set("transform", "rotate");
				else if(shiftDown && keyCode == 84) // t
					scope.model.uiStatus.set("transform", "scale");
				else if(keyCode == 46) // Del
					scope.model.objectList.removeSelected();
				else if(ctrlDown && keyCode == 67) // c
					scope.model.copySelected();		
				else if(ctrlDown && keyCode == 86) // v
					scope.model.pasteSelected();
				else if(ctrlDown && keyCode == 90) // z
					scope.model.history.undo();
				else if(ctrlDown && keyCode == 89) // y
					scope.model.history.redo();
				
				
				
				else
					return;
				return false;
			});
			
			// check webGL support and start application
			if(Detector.webgl) {
					
				this.render();
				this.layout();
				$(window).resize($.proxy(this.layout, this));
				this.model.uiStatus.trigger("change:mode");

			} else {
				this.$el.html(Mustache.render($("#sp-tpl-error-fullpage").html(), {
					"shortErr" : "WebGL Error.",
					"longErr" : $(Detector.getWebGLErrorMessage()).html()
				}));
					
			}
		},
	
		"render" : function() {
			var scope = this;
			
			this.$el.html(Mustache.render(this.template, window));
						
			this.navbar = new Core.View.NavigationBar({
				"model" : this.model,
				"el" : this.$el.find("#sp-navbar"),
				"window" : this
			}).render();

			this.playBar = new Core.View.PlayBar({
				"model" : this.model,
				"el" : this.$el.find("#sp-playBar")
			}).render();
			
			this.objectList = new Core.View.ObjectList({
				"collection" : this.model.objectList,
				"cameraSequence" : this.model.cameraSequence,
				"el" : this.$el.find("#sp-objectList")
			});
			
			this.canvasView = new Core.View.Canvas({
				"model" : this.model,
				"el" : this.$("#sp-presentation canvas")
			});
			
			// transform switcher
			this.$("#sp-transformSwitcher").buttonset();
			this.$("#sp-transform1").click(function() {
				scope.model.uiStatus.set("transform", "translate");
			});
			this.$("#sp-transform2").click(function() {
				scope.model.uiStatus.set("transform", "rotate");
			});
			this.$("#sp-transform3").click(function() {
				scope.model.uiStatus.set("transform", "scale");
			});
			function updateSwitchers() {
				var i = ["translate","rotate","scale"].indexOf(this.model.uiStatus.get("transform"));
				console.debug(i);
				this.$("#sp-transform1, #sp-transform2, #sp-transform3").each(function(j, el) {
					var $el = $(el);
					if(j == i)
						$el.addClass("ui-state-active");
					else
						$el.removeClass("ui-state-active");
				});				
			}
			this.model.uiStatus.on("change:transform", updateSwitchers, this);
			updateSwitchers.call(this);
			
			this.model.objectList.on("unselect", function(model) {
				if(this.attributeList)
					this.attributeList.remove();
			}, this).on("select", function(model) {
				if(model) {
					this.attributeList = new Core.View.AttributeList({
						"resources" : scope.model.resources,
						"model" : model, 
					});
					this.$("#sp-attributeList table").append(this.attributeList.$el);
				}
			}, this);
			
			// put id to url for bookmarking
			
			this.model.on("change:_id", function() {
				var id = this.model.get("_id");
				Misc.URL.setQuery("p", id);
			}, this);
			
			if(Misc.URL.query.p) {
				var id = Misc.URL.query.p;
				Misc.URL.setQuery("p", undefined);
				this.model.openCloud(id);
			}

			/****tooptips******/

			this.$("#sp-navbarUndo").tooltip({ track: true });
			this.$("#sp-navbarUndo").tooltip("option", "content", "Undo last action <b>(Ctrl + Z)</b>" );
			this.$("#sp-navbarUndo").tooltip( "disable" );
		
			
			this.$("#sp-navbarRedo").tooltip({ track: true });
			this.$("#sp-navbarRedo").tooltip("option", "content", "Redo last action <b>(Ctrl + Y)</b>" );
			this.$("#sp-navbarRedo").tooltip( "disable" );

			this.$("#sp-navbarHelp").tooltip({ track: true });
			this.$("#sp-navbarHelp").tooltip("option", "content", "<b>Activate help</b> <br>" +
					"Many useful hints will appear which helps you get startet." );
			
			this.$("#sp-objectList #trigger-tab-1").tooltip({ track: true });
			this.$("#sp-objectList #trigger-tab-1").tooltip("option", "content", "<b>List of all objects</b> <br>" +
					"Doubleclick on any object for focusing." );
			this.$("#sp-objectList #trigger-tab-1").tooltip( "disable" );
			
			this.$("#sp-objectList #trigger-tab-2").tooltip({ track: true });
			this.$("#sp-objectList #trigger-tab-2").tooltip("option", "content", "<b>List of all cameras</b> <br>" +
					"Sort your cameras. Presentation goes as your camears appear in this list." );
			this.$("#sp-objectList #trigger-tab-2").tooltip( "disable" );
			
			this.$("#sp-transform1").tooltip({ track: true });
			this.$("#sp-transform1").tooltip("option", "content", "Move object <b>(Ctrl + M)</b>" );
			this.$("#sp-transform1").tooltip( "disable" );
			
			this.$("#sp-transform2").tooltip({ track: true });
			this.$("#sp-transform2").tooltip("option", "content", "Rotate object <b>(Ctrl + R)</b>" );
			this.$("#sp-transform2").tooltip( "disable" );
			
			this.$("#sp-transform3").tooltip({ track: true });
			this.$("#sp-transform3").tooltip("option", "content", "Scale object <b>(Ctrl + T)</b>" );
			this.$("#sp-transform3").tooltip( "disable" );
			
			/*projectmenu*/
			this.$("#sp-project-menu").tooltip({ track: true });
			this.$("#sp-project-menu").tooltip("option", "content", "The Projectmenu offers all kind of saving options.<br> " +
					"You can also edit the preferences here!" );
			this.$("#sp-project-menu").tooltip( "disable" );
			
			this.$("#sp-navbarNew").tooltip({ track: true });
			this.$("#sp-navbarNew").tooltip("option", "content", "<b>Create</b> a new empty <b>project</b>. By default, you create " +
					"a private project nobody else has access to." );
			this.$("#sp-navbarNew").tooltip( "disable" );
			
			this.$("#sp-navbarOpen").tooltip({ track: true });
			this.$("#sp-navbarOpen").tooltip("option", "content", "<b>Upload</b> an existing presentation from your <b>computer</b>." );
			this.$("#sp-navbarOpen").tooltip( "disable" );
			
			this.$("#sp-navbarSave").tooltip({ track: true });
			this.$("#sp-navbarSave").tooltip("option", "content", "<b>Save</b> your current presentation on your <b>computer</b>." );
			this.$("#sp-navbarSave").tooltip( "disable" );
			
			this.$("#sp-navbarOpenCloud").tooltip({ track: true });
			this.$("#sp-navbarOpenCloud").tooltip("option", "content", "<b>Load</b> a presentation from the <b>cloud</b>. " +
					"You have access to your own presentations, presentations someone gave you access to " +
					"and open presentation which were made world readable." );
			this.$("#sp-navbarOpenCloud").tooltip( "disable" );
			
			this.$("#sp-navbarSaveCloud").tooltip({ track: true });
			this.$("#sp-navbarSaveCloud").tooltip("option", "content", "<b>Save</b> your current presentation in the <b>cloud</b>. " +
					"Before saving, make sure you have set the correct read&write-permissions in the preferences. <b>Warning!</b> Even " +
					"if you change the presentation's name it will overwrite.");
			this.$("#sp-navbarSaveCloud").tooltip( "disable" );
			
			this.$("#sp-navbarSaveCloudNew").tooltip({ track: true });
			this.$("#sp-navbarSaveCloudNew").tooltip("option", "content", "<b>Save a new version</b> of your current presentation in the " +
					"<b>cloud</b>. If you edit a presentation you do not have writing permission, " +
					"you can still save your own copy in the cloud." );
			this.$("#sp-navbarSaveCloudNew").tooltip( "disable" );
			
			
			this.$("#sp-navbarPreferences").tooltip({ track: true });
			this.$("#sp-navbarPreferences").tooltip("option", "content", "<b>Manage your project</b>.<br>" +
					"Give other users the permission to watch or edit your presentation. You can even make it public." );
			this.$("#sp-navbarPreferences").tooltip( "disable" );
			
			
			/*insertmenu*/
			this.$("#sp-insert-menu").tooltip({ track: true });
			this.$("#sp-insert-menu").tooltip("option", "content", "Add new Objects here.");
			this.$("#sp-insert-menu").tooltip( "disable" );
			
			this.$("#sp-navbarInsertImagePlane").tooltip({ track: true });
			this.$("#sp-navbarInsertImagePlane").tooltip("option", "content", "A ImagePlane-object is a <b>2D image</b>.<br>" +
					"After adding, select <i>change</i> under Attributes to upload a image from your computer.<br />" +
					"<b>Hint:</b> You can also add images by <b>drag & drop</b> from your explorer!");
			this.$("#sp-navbarInsertImagePlane").tooltip( "disable" );
			
			this.$("#sp-navbarInsertGeometry").tooltip({ track: true });
			this.$("#sp-navbarInsertGeometry").tooltip("option", "content", "After adding you can change the type " +
					"of this <b>3D object</b> in the Attributes menu.");
			this.$("#sp-navbarInsertGeometry").tooltip( "disable" );
			
			this.$("#sp-navbarInsertText").tooltip({ track: true });
			this.$("#sp-navbarInsertText").tooltip("option", "content", "This is a <b>3D textobject</b>.<br>" +
					"After adding you can change the text in the Attributes menu.");
			this.$("#sp-navbarInsertText").tooltip( "disable" );
			
			this.$("#sp-navbarInsertTextPlane").tooltip({ track: true });
			this.$("#sp-navbarInsertTextPlane").tooltip("option", "content", "This is a <b>2D textobject</b>.<br>" +
					"After adding you can change the text in the Attributes menu.");
			this.$("#sp-navbarInsertTextPlane").tooltip( "disable" );
			
			this.$("#sp-navbarInsertVideo").tooltip({ track: true });
			this.$("#sp-navbarInsertVideo").tooltip("option", "content", "This is a <b>2D videoobject</b>.<br>" +
					"After adding you can change the video in the Attributes menu.");
			this.$("#sp-navbarInsertVideo").tooltip( "disable" );
			
			this.$("#sp-navbarInsertCameraPoint").tooltip({ track: true });
			this.$("#sp-navbarInsertCameraPoint").tooltip("option", "content", "This is a <b>camera</b>.<br>" +
					"With cameras you define your presentation - where you want to stop and look at. Or you deactivate the " +
					"attribute <i>breakpoint</i> and the presentation wont stop there.");
			this.$("#sp-navbarInsertCameraPoint").tooltip( "disable" );
			
			/*viewmenu*/
			this.$("#sp-view-menu").tooltip({ track: true });
			this.$("#sp-view-menu").tooltip("option", "content", "Switch between <b>presentation mode</b> " +
					"and <b>edit mode</b>");
			this.$("#sp-view-menu").tooltip( "disable" );
			
			this.$("#sp-navbarViewPlay").tooltip({ track: true });
			this.$("#sp-navbarViewPlay").tooltip("option", "content", "Start <b>presentation</b> <br>" +
					"<b>Hint:</b> You can also press <b>F5</b>!");
			this.$("#sp-navbarViewPlay").tooltip( "disable" );
			
			this.$("#sp-navbarViewScene").tooltip({ track: true });
			this.$("#sp-navbarViewScene").tooltip("option", "content", "Enter <b>editor</b><br>"+
					"<b>Hint:</b> If you are in presentation mode, press <b>ESC</b>!");
			this.$("#sp-navbarViewScene").tooltip( "disable" );
			return this;
		},
		

		
		"layout" : function() {
			var availableWidth = this.model.uiStatus.get("mode") == "play" ?
					$(window).width() :
					$(window).width() - $("#sp-attributeList").outerWidth(true) - $("#sp-sidebarRight").outerWidth(true) - 30;
			var availableHeight = $(window).height() - this.$("#sp-presentation").offset().top;

			var min = Math.min(availableWidth, availableHeight * 16/9);
			this.canvasView.$el.width(min);
			this.canvasView.$el.height(Math.floor(min * 9/16));
						
			// 2px for border
			this.$("#sp-presentation").height(availableHeight - 2);
			this.$("#sp-objectList #tab-1, #sp-objectList #tab-2")
				.outerHeight($(window).innerHeight() - this.$("#sp-objectList").offset().top - this.$("#sp-objectList ul").outerHeight());
			this.$("#sp-attributeList").height(availableHeight - 2);

			this.canvasView.resize();
			this.canvasView.$el.position({
				"of" : this.$("#sp-presentation"),
				"my" : "center center",
				"at" : "center center"
			});

			this.playBar.resize();
			
			return this;
		}
		
	});
	
	
}(sp.module("core")));