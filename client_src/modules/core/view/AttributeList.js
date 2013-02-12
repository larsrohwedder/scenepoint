
(function(Core) {
	
	Core.View.AttributeList = Backbone.View.extend({
		
		"tagName" : "tbody",
		
		"template" : $("#sp-tpl-attributeList").html(),
		
		"initialize" : function() {
			this.model.on("destroy", this.remove, this);
			this.render();
		},
		
		"render" : function() {
			var scope = this;
			
			var view = {
				"items" : this.model.constructor.attributes,
				
				"iterator" : function() {
					var list = [];
					for(var key in this.items) {
						if(!this.items[key].type)
							continue;
						var newKey = (this.key ? this.key + "/" : "") + key;
						var item = _.defaults({
							"key" : newKey,
							"value" : scope.model.get(newKey),
							"iterator" : this.iterator,
							"lang" : this.lang
						}, this.items[key]);
						//prevent inheritance
						item["type-"+this.type] = false;
						item["type-"+this.items[key].type] = true;
						
						list.push(item);
					}
					return list;
				},
				
				"lang" : window.lang
			}

			this.$el.html(Mustache.render(this.template, view, {
				"template" : this.template
			}));
			
			this.$(".sp-trigger").click(function() {
				$(this).parent().find("ol").slideToggle();
			});
			
			this.$(".sp-attr-string, .sp-attr-float, .sp-attr-bool, .sp-attr-color").each(function(i, el) {
				var $el = $(el),
				$input = $el.find("input"),
				key = $el.attr("data-key");
				
				function update() {
					if($el.hasClass("sp-attr-color")) {
						var s = this.model.get(key).toString(16);
						while(s.length < 6)
							s = "0" + s;
						$input.val(s);
					} else if($el.hasClass("sp-attr-float")) {
						$input.val(this.model.get(key).toFixed(4));
					} else if($el.hasClass("sp-attr-bool")) {
						$input.attr("checked", this.model.get(key));
					} else {
						$input.val(this.model.get(key));
					}
				}
				
				$input.change(function() {
					if($el.hasClass("sp-attr-float")) {
						var val = parseFloat($(this).val());
						if(!_.isFinite(val))
							update.call(scope);
						else
							scope.model.set(key, val);
					} else if($el.hasClass("sp-attr-color")) {
						var val = parseInt($(this).val(), 16);
						if(!_.isFinite(val) || val < 0 || val > 0xffffff)
							update.call(scope);
						else
							scope.model.set(key, val);
					} else if($el.hasClass("sp-attr-bool")) {
						scope.model.set(key, $(this).attr("checked") === "checked");
					} else {
						scope.model.set(key, $(this).val());
					}
				});
				
				
				/*
				 * select value by clicking
				 */

				$input.focus(function() {
					$input.select();
				});
				

				scope.model.on("change:"+key, function() {
					update.call(scope);
				}, scope);
				
				if($el.hasClass("sp-attr-color")) {
					var $farb = $el.find(".sp-farbtastic"),
	                picker = $.farbtastic($farb);
					picker.linkTo(function(color) {
	                	scope.model.set(key, parseInt(color.substring(1), 16));
	                });
					scope.model.on("change:"+key, function() {
						picker.setColor("#"+this.model.get(key).toString(16));
					}, scope);
	                $farb.hide();
	                $input.focus(function() {
	                	$farb.show("puff");
	                	function callback($e) {
	                		if($farb.has($e.target).length <= 0
	                			&& !$input.is($e.target)) {
		                		$farb.hide("puff");
			                	$(document).unbind("click", callback);
	                		}
	                	};
	                	$(document).bind("click", callback);
	                });
				}
				
				update.call(scope);
				
			});
			
			this.$(".sp-attr-object div").buttonset();
			this.$(".sp-attr-object").each(function(i, el) {
				var $el = $(el),
				$select = $el.find(".sp-select"),
				$clear = $el.find(".sp-clear"),
				key = $el.attr("data-key");
				
				$el.find(".ui-state-default").hover(
					function() {
						if(!$(this).hasClass("ui-state-disabled"))
							$(this).addClass("ui-state-hover");
					},
					function() {
						$(this).removeClass("ui-state-hover");
					}
				);
				$select.click(function() {
					if($select.hasClass("ui-state-active")) {
						$select.removeClass("ui-state-active");
						$select.text("select");
						scope.model.collection.off("select", null, scope);
					} else {
						if(scope.model.collection) {
							$select.addClass("ui-state-active");
							$select.text("cancel");
							scope.model.collection.on("select", function(model) {
								scope.model.set(key, model.id);
								$select.removeClass("ui-state-active");
								$select.text("select");
								scope.model.collection.off("select", null, scope);
							}, scope);
						}
					}
				});
				
				function update() {
					if(scope.model.get(key))
						$clear.removeClass("ui-state-disabled");
					else
						$clear.addClass("ui-state-disabled");
				}
				update();
				scope.model.on("change:"+key, function() {
					update();
				});
				$clear.click(function() {
					if($select.hasClass("ui-state-active")) {
						$select.removeClass("ui-state-active");
						$select.text("select");
						scope.model.collection.off("select", null, scope);
					}
					scope.model.set(key, 0);
				});
			});
			
			this.$(".sp-attr-bool-unique").each(function(i, el) {
				var $el = $(el),
				$button = $el.find("span.ui-state-default"),
				key = $el.attr("data-key");
				
				function update() {
					if(scope.model.get(key))
						$button.addClass("ui-state-disabled");
					else
						$button.removeClass("ui-state-disabled");
				}
				update();
				
				scope.model.on("change:"+key, function() {
					update();
				}, this);

				$button.hover(
					function() {
						if(!$button.hasClass("ui-state-disabled"))
							$button.addClass("ui-state-hover");
					},
					function() {
						$button.removeClass("ui-state-hover");
					}
				);
				$button.click(function() {
					if(!$button.hasClass("ui-state-disabled")) {
						scope.model.set(key, true);
						if(scope.model.collection) {
							scope.model.collection.each(function(model) {
								if(model != scope.model && model.get(key) === true) {
									model.set(key, false);
								}
							})
						}
					}
				});
			});
			
			this.$(".sp-attr-bigString").each(function(i, el) {
				var $el = $(el),
				$button = $el.find(".ui-button"),
				key = $el.attr("data-key");
				
				$button.hover(
					function() {
						$button.addClass("ui-state-hover");
					},
					function() {
						$button.removeClass("ui-state-hover");
					}
				);
				$button.click(function() {
					var dialog = new Core.View.TextAreaDialog({
						"text" : scope.model.get(key),

						"success" : function(text) {
							scope.model.set(key, text);
						}
					}).render();
				});
			});
			
			this.$(".sp-attr-res-texture").each(function(i, el) {
				var $el = $(el),
				$button = $el.find(".ui-button"),
				key = $el.attr("data-key");
				
				$button.hover(
					function() {
						$button.addClass("ui-state-hover");
					},
					function() {
						$button.removeClass("ui-state-hover");
					}
				);
				$button.click(function() {
					var dialog = new Core.View.TextureDialog({
						"resources" : scope.options.resources,
						"success" : function(res) {
							scope.model.set(key, res);
						}
					}).render();
				});
			});
			
			this.$(".sp-attr-enum").each(function(i, el) {
				var $el = $(el),
				$select = $el.find("select"),
				key = $el.attr("data-key");
				
				function update() {
					$select.val(scope.model.get(key));
				};
				update();
				
				$select.change(function() {
					scope.model.set(key, $select.val());
				});
				
				scope.model.on("change:"+key, function() {
					update();
				});
			});

			return this;
		},
		
		"remove" : function() {
			Backbone.View.prototype.remove.call(this);
			this.model.off(null, null, this);
		}
		
	});
	
	
}(sp.module("core")));