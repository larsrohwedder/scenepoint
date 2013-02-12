var sp = {module:function() {
  var modules = {};
  return function(name) {
    if(modules[name]) {
      return modules[name]
    }
    if(name == "core") {
      return modules[name] = {"Model":{}, "View":{}}
    }else {
      if(name == "object") {
        return modules[name] = {"Model":{}, "ViewGL":{}}
      }else {
        if(name == "resource") {
          return modules[name] = {"Model":{}}
        }else {
          return modules[name] = {}
        }
      }
    }
  }
}()};
$(function() {
  var Core = sp.module("core"), Misc = sp.module("misc");
  (new Misc.Queue).queue(function(q) {
    var i = 1, query = window.location.search, lang;
    while(0 < i) {
      var j = query.indexOf("=", i);
      var nexti = query.indexOf("&", i) + 1;
      if(query.substring(i, j) === "lang") {
        lang = query.substring(j + 1, nexti == 0 ? query.length : nexti - 1)
      }
      i = nexti
    }
    lang = lang && ["en", "de"].indexOf(lang) >= 0 ? lang : "en";
    $.getJSON("assets/json/lang/" + lang + ".json", function(data) {
      window.lang = data;
      q.next()
    }).error(function() {
      $("body").html(Mustache.render($("#sp-tpl-error-fullpage").html(), {"shortErr":"Language Error.", "longErr":"The page failed to load the language files."}))
    })
  }).queue(function() {
    new Core.View.Window({"model":new Core.Model.Presentation})
  })
});
(function(Misc) {
  var projector = new THREE.Projector;
  Misc.EventGL = function(options) {
    _.extend(this, options)
  };
  Misc.EventGL.fromDOMEvent = function($event, camera, options) {
    options || (options = {});
    options.originalEvent = $event;
    var x = $event.pageX - $event.target.offsetLeft, y = $event.pageY - $event.target.offsetTop;
    x = 2 * x / $event.target.width - 1;
    y = -(2 * y / $event.target.height - 1);
    var dir = new THREE.Vector3(x, y, 1);
    projector.unprojectVector(dir, camera);
    var position = new THREE.Vector3;
    position.getPositionFromMatrix(camera.matrixWorld);
    dir.subSelf(position).normalize();
    options.ray = new THREE.Ray(position, dir);
    return new Misc.EventGL(options)
  }
})(sp.module("misc"));
(function(Misc) {
  Misc.OpenFileDialog = function(callback, context) {
    this.callback = callback;
    this.context = context || this
  };
  Misc.OpenFileDialog.prototype = {"show":function() {
    var $el = $('<input type="file">'), scope = this;
    $el.change(function() {
      if(scope.callback) {
        scope.callback.call(scope.context, $el[0].files)
      }
    });
    $el.click()
  }}
})(sp.module("misc"));
(function(Misc) {
  Misc.PromptDialog = function(prompt, callback, context) {
    this.callback = callback;
    this.prompt = prompt;
    this.context = context || this
  };
  Misc.PromptDialog.prototype = {"show":function() {
    var view = {"data":{"prompt":this.prompt, "title":""}, "lang":window.lang};
    var $el = $(Mustache.render($("#sp-tpl-dialog-text").html(), view)), scope = this;
    $el.dialog({"buttons":{"Ok":function() {
      if(this.callback) {
        this.callback.call(this.context || this, $el.find("input").val())
      }
      $(this).dialog("close")
    }, "Cancel":function() {
      $(this).dialog("close")
    }}})
  }}
})(sp.module("misc"));
(function(Misc) {
  Misc.Queue = function() {
    var Queue = function(f, options) {
      options || (options = {});
      options.ctx || (options.ctx = window);
      options.forcebreak || (options.forcebreak = false);
      var finished = false, nextEl;
      this.queue = function(h) {
        nextEl = new Queue(h, options);
        if(finished) {
          if(options.forcebreak) {
            setTimeout(function() {
              nextEl.run()
            }, 0)
          }else {
            nextEl.run()
          }
        }
        return nextEl
      };
      this.run = function() {
        var args = new Array(arguments.length + 1), len = arguments.length || 0;
        args[0] = this;
        for(var i = 0;i < len;i++) {
          args[i + 1] = arguments[i]
        }
        if(typeof options.onException == "function") {
          try {
            f.apply(options.ctx, args)
          }catch(e) {
            options.onException.call(options.ctx, e, this)
          }
        }else {
          f.apply(options.ctx, args)
        }
        return this
      };
      this.next = function() {
        finished = true;
        if(nextEl) {
          if(options.forcebreak) {
            setTimeout(function() {
              nextEl.run.apply(nextEl, arguments)
            }, 0)
          }else {
            nextEl.run.apply(nextEl, arguments)
          }
        }
        return this
      }
    };
    return function(options) {
      Queue.call(this, null, options);
      this.next()
    }
  }()
})(sp.module("misc"));
(function(Misc) {
  var resRegExp = /^res-/i;
  var History = Misc.ChangeHistory = function(model, limit) {
    var list = model.objectList, resources = model.resources;
    this.limit = limit || 25;
    this.enabled = true;
    this.unStack = [];
    this.reStack = [];
    this.targetStack = this.unStack;
    this.undoActive = false;
    function retainRes(attrs, model) {
      for(var i in attrs) {
        var props = model.constructor.getAttribute(i);
        if(!props) {
          continue
        }
        if(resRegExp.test(props.type)) {
          var res = resources.get(attrs[i]);
          if(res) {
            res.retain()
          }
        }
      }
    }
    function releaseRes(attrs, model) {
      for(var i in attrs) {
        var props = model.constructor.getAttribute(i);
        if(!props) {
          continue
        }
        if(resRegExp.test(props.type)) {
          var res = resources.get(attrs[i]);
          if(res) {
            res.release()
          }
        }
      }
    }
    var Change = function(type, options) {
      this.type = type;
      this.options = options
    };
    Change.prototype = {"undo":function() {
      if(this.type == "change") {
        this.options.model.set(this.options.values)
      }else {
        if(this.type == "add") {
          list.remove(this.options.model)
        }else {
          if(this.type == "remove") {
            list.add(this.options.model)
          }else {
            if(this.type == "camSequence") {
              camSeq.set("list", this.seq)
            }
          }
        }
      }
    }, "remove":function() {
      if(this.type == "remove") {
        releaseRes(this.options.model.attributes, this.options.model);
        this.options.model.destroy()
      }else {
        if(this.type == "change") {
          releaseRes(this.options.values, this.options.model)
        }
      }
    }};
    list.on("add", function(model) {
      if(!this.enabled) {
        return
      }
      this.undoActive || this.clearRedo();
      this.targetStack.push(new Change("add", {"model":model}));
      if(!this.undoActive) {
        retainRes(model.attributes, model)
      }
      if(this.targetStack.length > this.limit) {
        this.targetStack.shift().remove()
      }
    }, this).on("remove", function(model) {
      if(!this.enabled) {
        return
      }
      this.undoActive || this.clearRedo();
      this.targetStack.push(new Change("remove", {"model":model}));
      if(this.targetStack.length > this.limit) {
        this.targetStack.shift().remove()
      }
    }, this).on("change", function(model, attrs) {
      if(!this.enabled) {
        return
      }
      var lastChange = this.targetStack[this.targetStack.length - 1], values = {}, now = {}, toRemove = {}, changed = false;
      for(var i in attrs.changes) {
        if(lastChange && lastChange.options.model == model && lastChange.type == "change" && i in lastChange.options.values) {
          toRemove[i] = model.previous(i);
          continue
        }
        values[i] = model.previous(i);
        now[i] = model.get(i);
        changed = true
      }
      releaseRes(toRemove, model);
      if(!this.undoActive) {
        retainRes(now, model)
      }
      if(!changed) {
        return
      }
      this.undoActive || this.clearRedo();
      this.targetStack.push(new Change("change", {"model":model, "values":values}));
      if(this.targetStack.length > this.limit) {
        this.targetStack.shift().remove()
      }
    }, this)
  };
  History.prototype = {"undo":function() {
    var change = this.unStack.pop();
    if(change) {
      this.targetStack = this.reStack;
      this.undoActive = true;
      change.undo();
      this.undoActive = false;
      this.targetStack = this.unStack
    }
  }, "redo":function() {
    var change = this.reStack.pop();
    if(change) {
      this.undoActive = true;
      change.undo();
      this.undoActive = false
    }
  }, "setEnabled":function(enabled) {
    this.enabled = enabled
  }, "isEmpty":function() {
    return this.unStack.length == 0
  }, "clearUndo":function() {
    var i;
    while(i = this.unStack.pop()) {
      i.remove()
    }
    return this
  }, "clearRedo":function() {
    var i;
    while(i = this.reStack.pop()) {
      i.remove()
    }
    return this
  }}
})(sp.module("misc"));
(function(Misc) {
  Misc.URL = function() {
    var hash = {}, query = {};
    function decode(str) {
      var urlParams = {};
      var match, pl = /\+/g, search = /([^&=]+)=?([^&]*)/g, decode = function(s) {
        return decodeURIComponent(s.replace(pl, " "))
      }, query = str.substring(1);
      while(match = search.exec(query)) {
        urlParams[decode(match[1])] = decode(match[2])
      }
      return urlParams
    }
    function refresh() {
      hash = decode(window.location.hash);
      query = decode(window.location.search)
    }
    refresh();
    function setHash(key, val) {
      hash[key] = val;
      var s = [];
      for(var i in hash) {
        if(hash[i]) {
          s.push(i + "=" + hash[i])
        }
      }
      window.location.hash = "#" + s.join("&")
    }
    function setQuery(key, val) {
      query[key] = val;
      var s = [];
      for(var i in query) {
        if(query[i]) {
          s.push(i + "=" + query[i])
        }
      }
      window.history.pushState(null, null, "?" + s.join("&"))
    }
    return{"refresh":refresh, "setHash":setHash, "setQuery":setQuery, "hash":hash, "query":query}
  }()
})(sp.module("misc"));
(function(Resource) {
  var Misc = sp.module("misc");
  Resource.Model.Resource = Backbone.Model.extend({"initialize":function() {
    this._retainCount = 0;
    if(!this.get("_data")) {
      this.set("_data", 0)
    }
    this.on("destroy", function() {
      if(this._texture) {
        this.collection.renderer.deallocateTexture(this._texture)
      }
    }, this)
  }, "retain":function() {
    this.trigger("retain");
    this._retainCount++
  }, "release":function() {
    this.trigger("release");
    if(--this._retainCount <= 0) {
      this.destroy()
    }
  }, "destroy":function() {
    this.trigger("destroy", this, this.collection)
  }, "getText":function() {
    if(this._text) {
      return this._text
    }
    return this._text = decodeURIComponent(escape(window.atob(this.get("_data"))))
  }, "getImage":function() {
    if(this._image) {
      return this._image
    }
    var im = this._image = new Image;
    im.src = "data:" + (this.get("content_type") || "application/octet-stream") + ";base64," + this.get("_data");
    return im
  }, "getTexture":function() {
    if(this._texture) {
      return this._texture
    }
    var scope = this, im = this.getImage(), texture = this._texture = new THREE.Texture(im);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    if(im.width && im.height) {
      if(Math.log(im.width) / Math.log(2) % 1 > 0 || Math.log(im.height) / Math.log(2) % 1 > 0) {
        texture.generateMipmaps = false
      }
    }
    im.onload = function() {
      if(Math.log(im.width) / Math.log(2) % 1 > 0 || Math.log(im.height) / Math.log(2) % 1 > 0) {
        texture.generateMipmaps = false
      }
      scope.trigger("load");
      texture.needsUpdate = true
    };
    return texture
  }, "getGeometry":function() {
    if(this._geometry) {
      return this._geometry
    }
    this._geometry = new THREE.Geometry;
    var group = (new THREE.OBJLoader).parse(this.getText());
    for(var i = 0;i < group.children.length;i++) {
      THREE.GeometryUtils.merge(this._geometry, group.children[i])
    }
    return this._geometry
  }, "toJSON":function(stubs) {
    if(stubs && !this._dirty) {
      return{"content_type":this.get("content_type") || "application/octet-stream", "stub":true, "length":this.get("_data").length}
    }else {
      return{"content_type":this.get("content_type") || "application/octet-stream", "stub":false, "length":this.get("_data").length, "data":this.get("_data")}
    }
  }}, {"fromFile":function(file, callback, context) {
    var reader = new FileReader;
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var i = 4;
      while(dataUrl[i] !== ",") {
        i++
      }
      var result = new Resource.Model.Resource({"_data":dataUrl.substring(i + 1), "name":file.name, "content_type":file.type});
      if(context) {
        callback.call(context, result)
      }else {
        callback(result)
      }
    };
    reader.readAsDataURL(file)
  }, "fromPlainText":function(text) {
    return new Resource.Model.Resource({"_data":window.btoa(unescape(encodeURIComponent(text))), "_text":text})
  }, "fromJSON":function(json, id) {
    return new Resource.Model.Resource({"content_type":json.content_type, "_data":json.data, "id":id})
  }});
  Resource.Model.ResourceCollection = Backbone.Collection.extend({"createID":function() {
    var id;
    do {
      id = 256 * (Math.round(Math.random() * 65519) + 16)
    }while(this.get(id));
    return id
  }, "toJSON":function(stubs) {
    var result = {};
    for(var i = 0;i < this.models.length;i++) {
      result[this.models[i].id] = this.models[i].toJSON(stubs)
    }
    return result
  }})
})(sp.module("resource"));
(function(Resource) {
  var fontCanvas = $("<canvas>")[0], fontTexture = new THREE.Texture(fontCanvas), fontContext = fontCanvas.getContext("2d"), charset = {}, offset = 0;
  fontCanvas.width = fontCanvas.height = 2048;
  fontContext.fillStyle = "#000000";
  fontContext.fillRect(0, 0, 2048, 2048);
  fontContext.globalCompositeOperation = "lighter";
  fontTexture.wrapS = THREE.RepeatWrapping;
  fontTexture.wrapT = THREE.RepeatWrapping;
  function drawChar(c) {
    var y = Math.floor(offset / 32) + 1, x = offset % 32;
    fontContext.strokeText(c, x * 64, y * 96)
  }
  function getCharPosition(c) {
    if(charset[c]) {
      return charset[c]
    }
    fontContext.strokeStyle = "#ff0000";
    fontContext.font = "64px Monospace";
    drawChar(c);
    fontContext.strokeStyle = "#00ff00";
    fontContext.font = "bold 64px Monospace";
    drawChar(c);
    fontContext.strokeStyle = "#0000ff";
    fontContext.font = "italic 64px Monospace";
    drawChar(c);
    fontTexture.needsUpdate = true;
    charset[c] = offset;
    return offset++
  }
  Resource.BitmapFont = {"texture":fontTexture, "getCharPosition":getCharPosition}
})(sp.module("resource"));
(function(Resource) {
  Resource.CommonRes = {"placeholderTexture":function() {
    var canvas = $("<canvas>")[0], ctx = canvas.getContext("2d");
    canvas.width = canvas.height = 32;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillRect(16, 16, 16, 16);
    ctx.fillStyle = "#f88";
    ctx.fillRect(16, 0, 16, 16);
    ctx.fillRect(0, 16, 16, 16);
    var tex = new THREE.Texture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    tex.needsUpdate = true;
    return tex
  }(), "snappingTexture":function() {
    var canvas = $("<canvas>")[0], ctx = canvas.getContext("2d");
    canvas.width = canvas.height = 32;
    var grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(0,0,255,0.5)");
    grad.addColorStop(1, "rgba(0,0,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    var tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    return tex
  }()}
})(sp.module("resource"));
(function(Object) {
  function vector3(name, def) {
    return{"type":"group", "name":name, "items":{"x":{"type":"float", "name":"x", "_default":def}, "y":{"type":"float", "name":"y", "_default":def}, "z":{"type":"float", "name":"z", "_default":def}}}
  }
  Object.Model.PresentationObject = Backbone.Model.extend({"initialize":function() {
    this.on("change", function(model, options) {
      var changes = options.changes;
      var called = {};
      for(var i in changes) {
        var parts = i.split("/");
        while(parts.pop()) {
          var name = parts.join("/");
          if(!called[name]) {
            called[name] = true;
            this.trigger("change:" + name)
          }
        }
      }
    }, this);
    var defaults = function f(attrs) {
      var result = {};
      for(var i in attrs) {
        var attr = attrs[i];
        if(attr.type === "group") {
          children = f(attr.items);
          for(var j in children) {
            result[attr.name + "/" + j] = children[j]
          }
        }else {
          result[i] = attr._default
        }
      }
      return result
    }(this.constructor.attributes);
    for(var i in defaults) {
      if(this.get(i) === undefined) {
        this.set(i, defaults[i])
      }
    }
  }, "destroy":function() {
    this.trigger("destroy", this, this.collection)
  }, "toJSON":function() {
    var json = Backbone.Model.prototype.toJSON.call(this);
    json.type = this.constructor.type;
    return json
  }}, {"type":"PresentationObject", "attributes":{"position":vector3("position", 0), "rotation":vector3("rotation", 0), "scale":vector3("scale", 1), "name":{"type":"string", "name":"name", "_default":"new Object"}}, "getAttribute":function(fullname) {
    var parts = fullname.split("/"), attr = this.attributes;
    for(var i = 0;i < parts.length;i++) {
      attr = attr[parts[i]];
      if(!attr) {
        return null
      }
    }
    return attr
  }})
})(sp.module("object"));
(function(Object) {
  Object.Model.ImagePlane = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"ImagePlane", "attributes":_.defaults({"image":{"type":"res-texture", "name":"image", "_default":""}, "name":{"type":"string", "_default":"new Image Plane", "name":"name"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.Import = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"Import", "attributes":_.defaults({"texture":{"type":"res-texture", "name":"texture", "_default":""}, "geometry":{"type":"res-geometry", "name":"geometry", "_default":""}, "nolighting":{"type":"bool", "name":"no lighting", "_default":false}, "name":{"type":"string", "_default":"new Import", "name":"name"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.Geometry = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"Geometry", "attributes":_.defaults({"geometry":{"type":"enum", "options":["Cube", "Cylinder", "Sphere", "Torus"], "name":"geometry", "_default":"Cube"}, "color":{"type":"color", "name":"color", "_default":16777215}, "opacity":{"type":"float", "name":"opacity", "_default":1}, "name":{"type":"string", "_default":"new Geometry", "name":"name"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.Text3D = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"Text3D", "attributes":_.defaults({"color":{"type":"color", "name":"color", "_default":8421504}, "name":{"type":"string", "_default":"new Text", "name":"name"}, "content":{"type":"string", "_default":"Text", "name":"content"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.VideoPlane = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"VideoPlane", "attributes":_.defaults({"video":{"type":"string", "name":"Video URL", "_default":""}, "poster":{"type":"res-texture", "name":"Poster", "_default":null}, "starttime":{"type":"float", "name":"Start Time", "_default":0}, "stoptime":{"type":"float", "name":"Stop Time", "_default":9999}, "name":{"type":"string", "_default":"new Video Plane", "name":"name"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.TextPlane = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"TextPlane", "attributes":_.defaults({"name":{"type":"string", "_default":"new Text Plane", "name":"name"}, "content":{"type":"bigString", "_default":"Text", "name":"content"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.CameraPoint = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }, "validate":function(attrs) {
    if(this.collection) {
      var next = this.collection.get(attrs.next);
      if(next && next.constructor.type != "CameraPoint") {
        return"Next must be a Camera Point Object"
      }
    }
  }}, {"type":"CameraPoint", "attributes":_.defaults({"name":{"type":"string", "_default":"new Camera Point", "name":"name"}, "breakpoint":{"type":"bool", "_default":true, "name":"breakpoint"}, "speed":{"type":"enum", "_default":"Medium", "options":["Very Slow", "Slow", "Medium", "Fast", "Very Fast"], "name":"speed"}, "weight":{"type":"float", "name":"weight", "_default":1}, "rotation":{"type":"group", "name":"rotation", "items":{"x":{"type":"float", "name":"x", "_default":0}, "y":{"type":"float", 
  "name":"y", "_default":0}}}, "scale":{}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.Model.Background = Object.Model.PresentationObject.extend({"initialize":function() {
    Object.Model.PresentationObject.prototype.initialize.call(this)
  }}, {"type":"Background", "attributes":_.defaults({"skybox":{"type":"res-texture", "name":"skybox", "_default":""}, "name":{"type":"string", "_default":"new Background", "name":"name"}}, Object.Model.PresentationObject.attributes)})
})(sp.module("object"));
(function(Object) {
  Object.ViewGL.PresentationObject = Backbone.View.extend({"initialize":function() {
    if(!this.obj) {
      this.obj = new THREE.Object3D;
      this.obj.eulerOrder = "YXZ"
    }
    if(!this.uiObj) {
      this.uiObj = new THREE.Object3D;
      this.uiObj.eulerOrder = "YXZ"
    }
    this.on("click", function() {
      if(this.model.collection && this.model.collection.select) {
        this.model.collection.select(this.model)
      }
    });
    this.model.on("destroy", function() {
      this.options.renderer.trigger("remove", this);
      this.options.renderer.trigger("destroy", this)
    }, this);
    this.model.on("select", function() {
      if(this.model.collection) {
        var controller = new Object.ViewGL.Controller(_.defaults({"delegate":this}, this.options));
        controller.on("remove", function() {
          this.obj.remove(controller.obj);
          this.uiObj.remove(controller.uiObj)
        }, this);
        this.obj.add(controller.obj);
        this.uiObj.add(controller.uiObj);
        this.options.renderer.trigger("add", controller, false)
      }
    }, this).on("add", function() {
      this.trigger("add", this)
    }, this).on("remove", function() {
      this.trigger("remove", this)
    }, this);
    this.model.on("change:position", function() {
      this.obj.position.set(this.model.get("position/x"), this.model.get("position/y"), this.model.get("position/z"));
      this.uiObj.position.set(this.model.get("position/x"), this.model.get("position/y"), this.model.get("position/z"))
    }, this);
    this.model.on("change:scale", function() {
      this.obj.scale.set(this.model.get("scale/x") || 1, this.model.get("scale/y") || 1, this.model.get("scale/z") || 1);
      this.uiObj.scale.set(this.model.get("scale/x") || 1, this.model.get("scale/y") || 1, this.model.get("scale/z") || 1)
    }, this);
    this.model.on("change:rotation", function() {
      this.obj.rotation.set(this.model.get("rotation/x") * Math.PI / 180, this.model.get("rotation/y") * Math.PI / 180, this.model.get("rotation/z") * Math.PI / 180);
      this.uiObj.rotation.set(this.model.get("rotation/x") * Math.PI / 180, this.model.get("rotation/y") * Math.PI / 180, this.model.get("rotation/z") * Math.PI / 180)
    }, this);
    this.on("mousedown", this.down, this);
    this.on("mousemove", this.move, this);
    this.on("mouseout", this.moveCommit, this);
    this.on("mouseup", this.moveCommit, this);
    this.model.trigger("change:position");
    this.model.trigger("change:scale");
    this.model.trigger("change:rotation")
  }, "down":function(event) {
    var pos = this.obj.position.clone();
    var n = event.ray.direction.clone();
    pos.subSelf(event.ray.origin);
    var d = pos.dot(event.ray.direction);
    this._moveAnchor = event.ray.origin.clone().addSelf(n.multiplyScalar(d)).subSelf(this.obj.position)
  }, "move":function(event) {
    var intersection, factor, y = this.obj.position.y + this._moveAnchor.y;
    intersection = event.ray.direction.clone();
    factor = (y - event.ray.origin.y) / event.ray.direction.y;
    if(factor > 0) {
      intersection.multiplyScalar(factor);
      intersection.addSelf(event.ray.origin);
      this.obj.position.x = this.uiObj.position.x = intersection.x - this._moveAnchor.x;
      this.obj.position.z = this.uiObj.position.z = intersection.z - this._moveAnchor.z;
      if(this._updatePositionInstantly) {
        this.moveCommit()
      }
      if(this.snappable) {
        this.snap(this.obj.position)
      }
    }
  }, "moveCommit":function(event) {
    if(this.snappable) {
      this.snapCommit()
    }
    this.model.set({"position/x":this.obj.position.x, "position/y":this.obj.position.y, "position/z":this.obj.position.z})
  }, "snap":function(position) {
    var snap = function() {
      var inv = new THREE.Matrix4;
      for(var i in this.options.views) {
        var view = this.options.views[i], planes = view.planes || [];
        for(var j = 0;j < planes.length;j++) {
          var plane = planes[j], localPos = position.clone();
          inv.getInverse(plane.matrixWorld);
          inv.multiplyVector3(localPos);
          if(localPos.y > 0 && localPos.y < 10 && localPos.x < 50 && localPos.x > -50 && localPos.z < 50 && localPos.z > -50) {
            return{"view":view, "index":j, "offset":localPos}
          }
        }
      }
    }.call(this);
    if(snap) {
      snap.view.trigger("snap", snap.index)
    }
    if(this.snapped && (!snap || this.snapped.view != snap.view && this.snapped.index != snap.index)) {
      this.snapped.view.trigger("unsnap", this.snapped.index)
    }
    this.snapped = snap
  }, "snapCommit":function() {
    if(this.snapped) {
      this.snapped.view.trigger("unsnap", this.snapped.index);
      var pos = this.snapped.offset, look = this.snapped.offset.clone(), curXRot = this.model.get("rotation/x") * Math.PI / 180, curYRot = this.model.get("rotation/y") * Math.PI / 180, mat = this.snapped.view.planes[this.snapped.index].matrixWorld;
      pos.y = 0.1 + Math.random() * 0.1;
      mat.multiplyVector3(pos);
      this.model.set({"position/x":pos.x, "position/y":pos.y, "position/z":pos.z});
      function mod(x) {
        return x < 0 ? x % (2 * Math.PI) + 2 * Math.PI : x % (2 * Math.PI)
      }
      look.y = 1;
      mat.multiplyVector3(look);
      look.subSelf(pos);
      var yDir = look.clone(), xDir = look.clone();
      yDir.y = 0;
      yDir.normalize();
      var yRot = Math.acos(yDir.z);
      if(yDir.x < 0) {
        yRot = 2 * Math.PI - yRot
      }
      if(mod(yRot - curYRot + Math.PI / 2) > Math.PI) {
        yRot += Math.PI
      }
      (new THREE.Matrix4).makeRotationY(-yRot).multiplyVector3(xDir);
      xDir.normalize();
      var xRot = Math.acos(xDir.y);
      if(xDir.z < 0) {
        xRot = 2 * Math.PI - xRot
      }
      xRot -= Math.PI / 2;
      if(mod(xRot - curXRot + Math.PI / 2) > Math.PI) {
        xRot += Math.PI
      }
      xRot = mod(xRot) * 180 / Math.PI;
      yRot = mod(yRot) * 180 / Math.PI;
      this.model.set({"rotation/x":xRot, "rotation/y":yRot});
      this.snapped = null
    }
  }})
})(sp.module("object"));
(function(Object) {
  var Resource = sp.module("resource");
  var geometry = new THREE.PlaneGeometry(100, 100);
  Object.ViewGL.ImagePlane = Object.ViewGL.PresentationObject.extend({"initialize":function(key, value) {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.model.on("change:image", function() {
      var res;
      if(this.model.get("image")) {
        res = this.options.resources.get(this.model.get("image"))
      }
      if(this.model.previous("image")) {
        var prevRes = this.options.resources.get(this.model.previous("image"));
        prevRes.off(null, null, this)
      }
      this._material.map = res ? res.getTexture() : Resource.CommonRes.placeholderTexture;
      this._material.needsUpdate = true;
      var im = res ? res.getImage() : null, tex = res ? res.getTexture() : null;
      if(im && im.height && im.width) {
        this._mesh.scale.z = 1 * im.height / im.width
      }else {
        if(!im) {
          this._mesh.scale.z = 1
        }
      }
      if(res) {
        res.on("load", function() {
          this._mesh.scale.z = res.getImage().height / res.getImage().width
        }, this)
      }
    }, this).on("destroy", function() {
      var res = this.options.resources.get(this.model.get("image"));
      if(res) {
        res.off(null, null, this)
      }
    }, this);
    this.on("drop", function(eventGL) {
      Resource.Model.Resource.fromFile(eventGL.originalEvent.originalEvent.dataTransfer.files[0], function(texture) {
        var id = this.options.resources.createID();
        texture.set("id", id);
        this.options.resources.add(texture);
        this.model.set("image", id)
      }, this)
    }, this);
    this.snappable = true
  }, "render":function() {
    var w = h = 1;
    if(this.model.get("image")) {
      var res = this.options.resources.get(this.model.get("image")), im = res ? res.getImage() : null, tex = res ? res.getTexture() : Resource.CommonRes.placeholderTexture;
      if(im && im.height && im.width) {
        h = 1 * im.height / im.width
      }
      res.on("load", function() {
        this._mesh.scale.z = res.getImage().height / res.getImage().width
      }, this)
    }
    this._material = new THREE.MeshPhongMaterial({"map":tex || Resource.CommonRes.placeholderTexture});
    this._material.transparent = true;
    this._mesh = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), this._material);
    this._mesh.scale.set(w, 1, h);
    this._mesh.doubleSided = true;
    this._mesh.pickingId = this.id;
    this._mesh.rotation.x = Math.PI / 2;
    this.obj.add(this._mesh);
    return this
  }})
})(sp.module("object"));
(function(Object) {
  var Resource = sp.module("resource");
  Object.ViewGL.Import = Object.ViewGL.PresentationObject.extend({"initialize":function(key, value) {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.model.on("change:nolighting", function() {
      this.render()
    }, this).on("change:texture", function() {
      if(this._material.map) {
        this._material.map = this.options.resources.get(this.model.get("texture")).getTexture();
        this._material.needsUpdate = true
      }else {
        this._material = new THREE.MeshLambertMaterial({"map":this.model.get("texture") ? this.options.resources.get(this.model.get("texture")).getTexture() : Resource.CommonRes.placeholderTexture});
        this._createMesh()
      }
    }, this).on("change:mesh", function() {
      this._createMesh()
    }, this);
    this.on("drop", function(eventGL) {
      Resource.Model.Resource.fromFile(eventGL.originalEvent.originalEvent.dataTransfer.files[0], function(texture) {
        var id = this.options.resources.createID();
        texture.set("id", id);
        this.options.resources.add(texture);
        this.model.set("texture", id)
      }, this)
    }, this)
  }, "render":function() {
    var constructor = this.model.get("nolighting") ? THREE.MeshBasicMaterial : THREE.MeshPhongMaterial;
    if(this.model.get("texture")) {
      var res = this.options.resources.get(this.model.get("texture"));
      var tex = res.getTexture();
      this._material = new constructor({"map":tex})
    }else {
      this._material = new constructor({"map":Resource.CommonRes.placeholderTexture})
    }
    this._createMesh();
    return this
  }, "_createMesh":function() {
    if(this._mesh) {
      this.obj.remove(this._mesh)
    }
    if(this.model.get("geometry")) {
      var res = this.options.resources.get(this.model.get("geometry"));
      var geometry = res.getGeometry();
      this._mesh = new THREE.Mesh(geometry, this._material);
      this._mesh.pickingId = this.id;
      this.obj.add(this._mesh)
    }
  }})
})(sp.module("object"));
(function(Object) {
  var Resource = sp.module("resource");
  var cube = new THREE.CubeGeometry(100, 100, 100), cylinder = new THREE.CylinderGeometry(100, 100, 100, 32), sphere = new THREE.SphereGeometry(100, 32, 24), plane = new THREE.PlaneGeometry(100, 100), torus = new THREE.TorusGeometry(100, 40, 32, 24), planeMat = new THREE.MeshBasicMaterial({"map":Resource.CommonRes.snappingTexture, "transparent":true});
  Object.ViewGL.Geometry = Object.ViewGL.PresentationObject.extend({"initialize":function() {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.planes = [];
    this.on("snap", function(index) {
      this.planes[index].visible = true
    }, this).on("unsnap", function(index) {
      this.planes[index].visible = false
    }, this);
    this.model.on("change:color", function() {
      this._updateMaterial()
    }, this).on("change:opacity", function() {
      this._updateMaterial()
    }, this).on("change:geometry", function() {
      this._updateMesh()
    }, this)
  }, "render":function() {
    this._material = new THREE.MeshPhongMaterial({"color":this.model.get("color")});
    this._updateMesh();
    return this
  }, "_updateMaterial":function() {
    this._material.color = new THREE.Color(this.model.get("color"));
    if(this.model.get("opacity") < 0.99) {
      this._material.opacity = Math.max(0, this.model.get("opacity"));
      this._material.transparent = true
    }
    this._material.needsUpdate = true
  }, "_updateMesh":function() {
    if(this._mesh) {
      this.obj.remove(this._mesh)
    }
    geometryName = this.model.get("geometry");
    if(geometryName === "Cylinder") {
      this._geometry = cylinder
    }else {
      if(geometryName === "Sphere") {
        this._geometry = sphere
      }else {
        if(geometryName === "Torus") {
          this._geometry = torus
        }else {
          this._geometry = cube
        }
      }
    }
    this._mesh = new THREE.Mesh(this._geometry, this._material);
    this._mesh.pickingId = this.id;
    this.obj.add(this._mesh);
    var p;
    while(p = this.planes.pop()) {
      this.obj.remove(p)
    }
    if(geometryName == "Cube") {
      function newPlane(scope) {
        var p = new THREE.Mesh(plane, planeMat);
        p.visible = false;
        scope.obj.add(p);
        scope.planes.push(p);
        return p
      }
      p = newPlane(this);
      p.position.set(0, 51, 0);
      p = newPlane(this);
      p.position.set(0, -51, 0);
      p.rotation.set(Math.PI, 0, 0);
      p = newPlane(this);
      p.position.set(51, 0, 0);
      p.rotation.set(0, 0, -Math.PI / 2);
      p = newPlane(this);
      p.position.set(-51, 0, 0);
      p.rotation.set(0, 0, Math.PI / 2);
      p = newPlane(this);
      p.position.set(0, 0, 51);
      p.rotation.set(Math.PI / 2, 0, 0);
      p = newPlane(this);
      p.position.set(0, 0, -51);
      p.rotation.set(-Math.PI / 2, 0, 0)
    }
  }})
})(sp.module("object"));
(function(Object) {
  Object.ViewGL.Text3D = Object.ViewGL.PresentationObject.extend({"initialize":function() {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.model.on("change:color", function() {
      this._updateMaterial()
    }, this).on("change:content", function() {
      this._updateMesh()
    }, this).on("destroy", function() {
      if(this._mesh) {
        this.options.renderer.deallocateObject(this._mesh)
      }
    }, this)
  }, "render":function() {
    this._material = new THREE.MeshLambertMaterial({"color":this.model.get("color")});
    this._updateMesh();
    return this
  }, "_updateMaterial":function() {
    this._material.color = new THREE.Color(this.model.get("color"));
    this._material.needsUpdate = true
  }, "_updateMesh":function() {
    if(this._mesh) {
      this.options.renderer.deallocateObject(this._mesh);
      this.obj.remove(this._mesh)
    }
    var text = this.model.get("content");
    if(text) {
      this._geometry = new THREE.TextGeometry(text, {font:"helvetiker", height:50, size:100, bevelEnabled:true, bevelThickness:2, bevelSize:2});
      this._mesh = new THREE.Mesh(this._geometry, this._material);
      this._mesh.pickingId = this.id;
      this.obj.add(this._mesh)
    }
  }})
})(sp.module("object"));
(function(Object) {
  var Resource = sp.module("resource");
  Object.ViewGL.VideoPlane = Object.ViewGL.PresentationObject.extend({"initialize":function(key, value) {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.options.renderer.on("tick", function() {
      if(this._material && this._material.map) {
        var buffered = this._$video[0] && this._$video[0].buffered.length > 0;
        this._material.map.needsUpdate = this.playing && buffered
      }
    }, this);
    function checkplay() {
      var t = this.options.uiStatus.get("pathTime"), mode = this.options.uiStatus.get("mode"), startTime = this.model.get("starttime"), stopTime = this.model.get("stoptime"), newPlaying = t >= startTime && t < stopTime && mode == "play";
      if(newPlaying && !this.playing) {
        this.refresh();
        if(this._$video[0]) {
          this._$video[0].play()
        }
      }else {
        if(!newPlaying && this.playing) {
          if(this._$video[0]) {
            this._$video[0].pause()
          }
        }
      }
      this.playing = newPlaying
    }
    this.options.uiStatus.on("change:pathTime", checkplay, this);
    this.options.uiStatus.on("change:mode", checkplay, this);
    this.model.on("change:video", this.refresh, this);
    this.playing = false;
    this.snappable = true
  }, "refresh":function() {
    if(this._$video) {
      if(this._$video[0]) {
        this._$video[0].volume = 0
      }
      this._$video.remove()
    }
    if(this._mesh) {
      this.obj.remove(this._mesh)
    }
    this.render()
  }, "render":function() {
    if(this.model.get("video")) {
      this._$video = $("<video>");
      this._$video.attr("crossorigin", "anonymous");
      this._$video.attr("src", this.model.get("video"));
      var texture = new THREE.Texture(this._$video[0]);
      texture.needsUpdate = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBFormat;
      texture.generateMipmaps = false;
      this._material = new THREE.MeshBasicMaterial({"map":texture})
    }else {
      this._material = new THREE.MeshBasicMaterial({"map":null})
    }
    var geometry = new THREE.PlaneGeometry(100, 100);
    this._mesh = new THREE.Mesh(geometry, this._material);
    this._mesh.doubleSided = true;
    this._mesh.pickingId = this.id;
    this._mesh.rotation.x = Math.PI / 2;
    this.obj.add(this._mesh);
    return this
  }, "remove":function() {
    if(this._$video) {
      if(this._$video[0]) {
        this._$video[0].volume = 0
      }
      this._$video.remove()
    }
    Object.ViewGL.PresentationObject.prototype.remove.call(this);
    if(this._material && this._material.map) {
      this.options.renderer.deallocateTexture(this._material.map)
    }
  }})
})(sp.module("object"));
(function(Object) {
  var Resource = sp.module("resource");
  var vShader = ["varying vec2 vUv;", "varying vec3 vColor;", "", "void main() {", "  vUv = uv;", "  vColor = color;", "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);", "}"].join("\n");
  var fShader = [THREE.ShaderChunk["fog_pars_fragment"], "uniform sampler2D map;", "varying vec3 vColor;", "varying vec2 vUv;", "", "void main() {", "  vec4 tex = texture2D(map, mod(vUv, 1.0));", "  float alpha;", "  if(vUv.y > 2.0) {", "    alpha = tex.b;", "  } else if(vUv.y > 1.0) {", "    alpha = tex.g;", "  } else {", "    alpha = tex.r;", "  }", "  if(alpha < 0.01) {", "    discard;", "  } else {", "    gl_FragColor = vec4(vColor, alpha);", "  }", THREE.ShaderChunk["fog_fragment"], "}"].join("\n");
  fontMaterial = new THREE.ShaderMaterial({"uniforms":_.defaults({"map":{"type":"t", "value":1, "texture":Resource.BitmapFont.texture}}, THREE.UniformsLib["fog"]), "vertexColors":THREE.VertexColors, "vertexShader":vShader, "fragmentShader":fShader});
  fontMaterial.transparent = true;
  Object.ViewGL.TextPlane = Object.ViewGL.PresentationObject.extend({"initialize":function(key, value) {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.model.on("change:content", function() {
      this._updateMesh()
    }, this).on("change:color", function() {
      this._material.uniforms.color.value = new THREE.Color(this.model.get("color"))
    }, this).on("destroy", function() {
      if(this._mesh) {
        this.options.renderer.deallocateObject(this._mesh)
      }
    }, this);
    this.snappable = true
  }, "render":function() {
    this._updateMesh();
    return this
  }, "_updateMesh":function() {
    if(this._mesh) {
      this.options.renderer.deallocateObject(this._mesh);
      this.obj.remove(this._mesh)
    }
    var content = this.model.get("content");
    if(content) {
      var g = new THREE.Geometry, STEP_SIZE_Y = 15, STEP_SIZE_X = 10, CHAR_WIDTH = 0.667, bold = false, italic = false, underscore = false, defaultColor = new THREE.Color(0), x = 0, y = 0, count = 0;
      function makeChar(char, x, y, count, off, color) {
        g.vertices.push(new THREE.Vector3(STEP_SIZE_X * x, -STEP_SIZE_Y * y, 0));
        g.vertices.push(new THREE.Vector3(STEP_SIZE_X * (x + 1), -STEP_SIZE_Y * y, 0));
        g.vertices.push(new THREE.Vector3(STEP_SIZE_X * (x + 1), -STEP_SIZE_Y * (y - 1), 0));
        g.vertices.push(new THREE.Vector3(STEP_SIZE_X * x, -STEP_SIZE_Y * (y - 1), 0));
        var face = new THREE.Face4(count * 4, count * 4 + 1, count * 4 + 2, count * 4 + 3);
        face.vertexColors[0] = face.vertexColors[1] = face.vertexColors[2] = face.vertexColors[3] = color || defaultColor;
        g.faces.push(face);
        var position = Resource.BitmapFont.getCharPosition(char), texX = position % 32, texY = Math.floor(position / 32) + 1;
        g.faceVertexUvs[0].push([new THREE.UV(32 / 1024 * texX, off + 48 / 1024 * texY + 12 / 1024), new THREE.UV(32 / 1024 * (texX + 1), off + 48 / 1024 * texY + 12 / 1024), new THREE.UV(32 / 1024 * (texX + 1), off + 48 / 1024 * (texY - 1) + 12 / 1024), new THREE.UV(32 / 1024 * texX, off + 48 / 1024 * (texY - 1) + 12 / 1024)])
      }
      function makeTextNode(el) {
        var text = el.text(), fontColor = el.parent().css("color"), color, italic = el.parent().css("font-style") == "italic", bold = el.parent().css("font-weight") > 500;
        if(fontColor) {
          var match = /rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/.exec(fontColor);
          if(match) {
            color = new THREE.Color(256 * 256 * parseInt(match[1]) + 256 * parseInt(match[2]) + parseInt(match[3]))
          }
        }
        for(var i = 0;i < text.length;i++) {
          var off = 0;
          if(bold) {
            off = 1
          }else {
            if(italic) {
              off = 2
            }
          }
          if(text[i] !== " ") {
            makeChar(text[i], x, y, count++, off, color)
          }
          x += CHAR_WIDTH
        }
      }
      var html = $("<div>" + content + "</div>");
      (function f(el) {
        var c = el.contents();
        for(var i = 0;i < c.length;i++) {
          if(c[i].nodeType == 3) {
            makeTextNode($(c[i]))
          }else {
            if(c[i].nodeName == "OL" || c[i].nodeName == "UL" || c[i].nodeName == "P") {
              y += 1;
              x = 0
            }
            if(c[i].nodeName == "LI") {
              makeChar(" ", x, y, count++, 0);
              x += CHAR_WIDTH;
              if(el[0].nodeName == "OL") {
                var s = (i + 1).toString();
                for(var j = 0;j < s.length;j++) {
                  makeChar(s[j], x, y, count++, 0);
                  x += CHAR_WIDTH
                }
                makeChar(".", x, y, count++, 0);
                x += CHAR_WIDTH
              }else {
                makeChar("\u2022", x, y, count++, 0);
                x += CHAR_WIDTH
              }
              makeChar(" ", x, y, count++, 0);
              x += CHAR_WIDTH
            }
            f($(c[i]));
            if(c[i].nodeName == "BR" || c[i].nodeName == "LI" || c[i].nodeName == "DIV" || c[i].nodeName == "P") {
              y += 1;
              x = 0
            }
          }
        }
      })(html);
      html.remove();
      this._mesh = new THREE.Mesh(g, fontMaterial);
      this._mesh.position.y = y * STEP_SIZE_Y;
      this._mesh.doubleSided = true;
      this._mesh.pickingId = this.id;
      this.obj.add(this._mesh)
    }
  }}, {"workaround":function(scene) {
    var g = new THREE.Geometry;
    g.vertices.push(new THREE.Vector3(0, 0, 0));
    g.vertices.push(new THREE.Vector3(0, 0, 0));
    g.vertices.push(new THREE.Vector3(0, 0, 0));
    g.vertices.push(new THREE.Vector3(0, 0, 0));
    var face = new THREE.Face4(0, 1, 2, 3);
    face.vertexColors[0] = face.vertexColors[1] = face.vertexColors[2] = face.vertexColors[3] = new THREE.Color(0);
    g.faces.push(face);
    g.faceVertexUvs[0].push([new THREE.UV(0, 0), new THREE.UV(0, 0), new THREE.UV(0, 0), new THREE.UV(0, 0)]);
    scene.add(new THREE.Mesh(g, fontMaterial))
  }})
})(sp.module("object"));
(function(Object) {
  var camera = new THREE.CubeGeometry(15, 15, 30), cylinder = new THREE.Mesh(new THREE.CylinderGeometry(9, 3, 15, 32)), lineColorMaterial = new THREE.LineBasicMaterial({"vertexColors":THREE.VertexColors}), lineMaterial = new THREE.LineBasicMaterial({"color":16711935}), line = new THREE.Geometry;
  line.vertices.push(new THREE.Vector3(-50, 0, 0));
  line.vertices.push(new THREE.Vector3(50, 0, 0));
  cylinder.position.z = 20;
  cylinder.rotation.x = Math.PI / 2;
  THREE.GeometryUtils.merge(camera, cylinder);
  Object.ViewGL.CameraPoint = Object.ViewGL.PresentationObject.extend({"initialize":function() {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this._updatePositionInstantly = true;
    this.options.uiStatus.on("change:mode", function() {
      var mode = this.options.uiStatus.get("mode");
      THREE.SceneUtils.showHierarchy(this.obj, mode != "play");
      THREE.SceneUtils.showHierarchy(this.uiObj, mode != "play")
    }, this);
    this.model.off("change:rotation", null, this);
    this.model.on("change:rotation", function() {
      this.obj.rotation.set(this.model.get("rotation/x") * Math.PI / 180, this.model.get("rotation/y") * Math.PI / 180, 0);
      this.uiObj.rotation.set(this.model.get("rotation/x") * Math.PI / 180, this.model.get("rotation/y") * Math.PI / 180, 0)
    }, this);
    this.model.off("change:scale", null, this);
    this.obj.scale.set(1, 1, 1);
    this.model.on("change:weight", function() {
      this._lineObj.scale.set(this.model.get("weight"), 1, 1)
    }, this);
    this.model.trigger("change:rotation");
    this.model.trigger("change:scale")
  }, "render":function() {
    var mesh = new THREE.Mesh(camera, new THREE.MeshLambertMaterial({"color":8421504}));
    mesh.position.z = -20;
    this._lineObj = new THREE.Line(line, lineMaterial);
    mesh.pickingId = this.id | 1;
    this.obj.add(mesh);
    this.obj.add(this._lineObj);
    return this
  }, "remove":function() {
    Object.ViewGL.PresentationObject.prototype.remove.call(this);
    this.options.uiStatus.off(null, null, this);
    if(this.model.collection) {
      this.model.collection.off(null, null, this)
    }
  }})
})(sp.module("object"));
(function(Object) {
  var lines = [];
  for(var i = 0;i < 5;i++) {
    lines[i] = new THREE.Geometry
  }
  var red = new THREE.Color(16711680), green = new THREE.Color(65280), blue = new THREE.Color(255), purple = new THREE.Color(16711935), white = new THREE.Color(16777215);
  lines[0].vertices.push(new THREE.Vector3(0, 0, 0));
  lines[0].vertices.push(new THREE.Vector3(40, 0, 0));
  lines[0].colors = [red, red];
  lines[1].vertices.push(new THREE.Vector3(0, 0, 0));
  lines[1].vertices.push(new THREE.Vector3(0, 40, 0));
  lines[1].colors = [green, green];
  lines[2].vertices.push(new THREE.Vector3(0, 0, 0));
  lines[2].vertices.push(new THREE.Vector3(0, 0, 40));
  lines[2].colors = [blue, blue];
  lines[3].vertices.push(new THREE.Vector3(0, 0, 0));
  lines[3].vertices.push(new THREE.Vector3(0, -1, 0));
  lines[3].colors = [purple, purple];
  lines[4].vertices.push(new THREE.Vector3(0, 0, 0));
  lines[4].vertices.push((new THREE.Vector3(1, 1, 1)).normalize().multiplyScalar(40));
  lines[4].colors = [white, white];
  var circles = [new THREE.Geometry, new THREE.Geometry, new THREE.Geometry];
  for(var i = 0;i < 100;i++) {
    var rad = 2 * Math.PI * i / 99;
    circles[0].vertices.push(new THREE.Vector3(0, 40 * Math.sin(rad), 40 * Math.cos(rad)));
    circles[0].colors.push(red);
    circles[1].vertices.push(new THREE.Vector3(40 * Math.sin(rad), 0, 40 * Math.cos(rad)));
    circles[1].colors.push(green);
    circles[2].vertices.push(new THREE.Vector3(40 * Math.sin(rad), 40 * Math.cos(rad), 0));
    circles[2].colors.push(blue)
  }
  var pointers = [], dots = [], spheres = [new THREE.Geometry];
  for(var i = 0;i < 3;i++) {
    pointers[i] = new THREE.Geometry;
    dots[i] = new THREE.Geometry
  }
  dots[3] = new THREE.Geometry;
  (function() {
    function colorize(g, c) {
      for(var i = 0;i < g.faces.length;i++) {
        g.faces[i].color = c
      }
    }
    spheres[0] = new THREE.SphereGeometry(5);
    colorize(spheres[0], white);
    var pointer = new THREE.CylinderGeometry(0, 5, 20, 16, 1);
    var dot = new THREE.SphereGeometry(5, 16, 12);
    colorize(pointer, red);
    colorize(dot, red);
    var tmp = new THREE.Mesh(pointer);
    tmp.position.set(50, 0, 0);
    tmp.rotation.set(0, 0, -Math.PI / 2);
    THREE.GeometryUtils.merge(pointers[0], tmp);
    tmp.geometry = dot;
    tmp.position.set(45, 0, 0);
    THREE.GeometryUtils.merge(dots[0], tmp);
    colorize(pointer, green);
    colorize(dot, green);
    tmp.geometry = pointer;
    tmp.position.set(0, 50, 0);
    tmp.rotation.set(0, 0, 0);
    THREE.GeometryUtils.merge(pointers[1], tmp);
    tmp.geometry = dot;
    tmp.position.set(0, 45, 0);
    THREE.GeometryUtils.merge(dots[1], tmp);
    colorize(pointer, blue);
    colorize(dot, blue);
    tmp.geometry = pointer;
    tmp.position.set(0, 0, 50);
    tmp.rotation.set(Math.PI / 2, 0, 0);
    THREE.GeometryUtils.merge(pointers[2], tmp);
    tmp.geometry = dot;
    tmp.position.set(0, 0, 45);
    THREE.GeometryUtils.merge(dots[2], tmp);
    colorize(dot, white);
    tmp.geometry = dot;
    tmp.rotation.set(0, 0, 0);
    tmp.position = (new THREE.Vector3(1, 1, 1)).normalize().multiplyScalar(45);
    THREE.GeometryUtils.merge(dots[3], tmp)
  })();
  var pointerMat = new THREE.MeshBasicMaterial({"vertexColors":THREE.FaceColors});
  var lineMat = new THREE.LineBasicMaterial({"vertexColors":THREE.VertexColors});
  var tPointerMat = new THREE.MeshBasicMaterial({"vertexColors":THREE.FaceColors, "transparent":true, "opacity":0.5});
  var tLineMat = new THREE.LineBasicMaterial({"vertexColors":THREE.VertexColors, "transparent":true, "opacity":0.5});
  Object.ViewGL.Controller = Object.ViewGL.PresentationObject.extend({"initialize":function() {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.obj.matrixAutoUpdate = false;
    this.uiObj.matrixAutoUpdate = false;
    this.off("click", null, this);
    this.model.off("select", null, this);
    this.model.off("unselect", null, this);
    this.model.off("change:position", null, this);
    this.model.off("change:rotation", null, this);
    this.model.off("change:scale", null, this);
    this.model.on("unselect", function() {
      this.remove();
      this.options.renderer.trigger("remove", this);
      this.options.renderer.trigger("destroy", this);
      this.trigger("remove", this);
      this.trigger("destroy", this)
    }, this);
    this.options.uiStatus.on("change:mode", function() {
      var mode = this.options.uiStatus.get("mode");
      THREE.SceneUtils.showHierarchy(this.obj, mode != "play");
      THREE.SceneUtils.showHierarchy(this.uiObj, mode != "play")
    }, this);
    this.options.uiStatus.on("change:transform", function() {
      this.render()
    }, this);
    this.options.renderer.on("tick", function() {
      var t = this.options.uiStatus.get("transform"), scale = new THREE.Vector3(1, 1, 1), parent = this.options.delegate.obj, parentScale = parent.scale;
      var mat = new THREE.Matrix4;
      parent.updateMatrixWorld();
      mat.getInverse(parent.matrixWorld);
      this.obj.matrix = mat;
      this.uiObj.matrix = mat;
      mat.setPosition(new THREE.Vector3);
      var cam = this.options.camera, camPos = new THREE.Vector3;
      cam.matrixWorld.multiplyVector3(camPos);
      var dist = camPos.subSelf(parent.position).length();
      this._scalar = Math.sqrt(dist) * 0.05;
      mat.scale(new THREE.Vector3(this._scalar, this._scalar, this._scalar));
      if(this._gMesh && this._tgMesh) {
        var y = parent.position.y || 0.001;
        this._gMesh.scale.y = y / this._scalar;
        this._tgMesh.scale.y = y / this._scalar
      }
      if(this._axis) {
        if(t == "rotate") {
          if(this._axis) {
            this._axis[0][0].rotation.set(parent.rotation.x, parent.rotation.y, 0);
            this._axis[1][0].rotation.set(parent.rotation.x, parent.rotation.y, 0);
            this._axis[0][1].rotation.set(0, parent.rotation.y, 0);
            this._axis[1][1].rotation.set(0, parent.rotation.y, 0);
            this._axis[0][2].rotation.set(parent.rotation.x, parent.rotation.y, parent.rotation.z);
            this._axis[1][2].rotation.set(parent.rotation.x, parent.rotation.y, parent.rotation.z)
          }
        }else {
          if(t == "translate") {
            for(var i = 0;i < 3;i++) {
              this._axis[0][i].rotation.set(0, 0, 0);
              this._axis[1][i].rotation.set(0, 0, 0)
            }
          }else {
            for(var i = 0;i < 3;i++) {
              this._axis[0][i].rotation = parent.rotation.clone();
              this._axis[1][i].rotation = parent.rotation.clone()
            }
          }
        }
      }
    }, this)
  }, "render":function() {
    var i = this.obj.children.length - 1;
    var j = this.uiObj.children.length - 1;
    while(i >= 0) {
      this.obj.remove(this.obj.children[i]);
      i--
    }
    while(j >= 0) {
      this.uiObj.remove(this.uiObj.children[j]);
      j--
    }
    var t = this.options.uiStatus.get("transform"), icons, idOffset;
    if(t == "translate") {
      idOffset = 0;
      icons = pointers
    }else {
      if(t == "rotate") {
        idOffset = 3;
        icons = dots
      }
    }
    if(t == "scale") {
      idOffset = 6;
      icons = dots
    }
    this._axis || (this._axis = [[], []]);
    for(var i = 0;i < 3;i++) {
      this._axis[0][i] = new THREE.Object3D;
      this._axis[0][i].eulerOrder = "YXZ";
      this._axis[1][i] = new THREE.Object3D;
      this._axis[1][i].eulerOrder = "YXZ";
      this.obj.add(this._axis[0][i]);
      this.uiObj.add(this._axis[1][i]);
      if(t == "rotate" && _.isUndefined(this.model.constructor.attributes.rotation.items[["x", "y", "z"][i]])) {
        continue
      }
      if(t == "scale" && i > 0 && this.model.constructor.type == "CameraPoint") {
        continue
      }
      var line = new THREE.Line(lines[i], lineMat), tLine = new THREE.Line(lines[i], tLineMat);
      tLine.pickingId = this.id | 0;
      this._axis[0][i].add(line);
      this._axis[1][i].add(tLine);
      var icon = new THREE.Mesh(icons[i], pointerMat), tIcon = new THREE.Mesh(icons[i], tPointerMat);
      tIcon.pickingId = this.id | 1 + i + idOffset;
      this._axis[0][i].add(icon);
      this._axis[1][i].add(tIcon);
      if(t == "rotate") {
        line.rotation = tLine.rotation = icon.rotation = tIcon.rotation = i == 0 ? new THREE.Vector3(0, 0, Math.PI / 2) : i == 1 ? new THREE.Vector3(Math.PI / 2, 0, 0) : new THREE.Vector3(0, Math.PI / 2, 0);
        var circle = new THREE.Line(circles[i], lineMat), tCircle = new THREE.Line(circles[i], tLineMat);
        tCircle.pickingId = this.id | 1 + i + idOffset;
        this._axis[0][i].add(circle);
        this._axis[1][i].add(tCircle)
      }
    }
    if(t == "scale" && this.model.constructor.type != "CameraPoint") {
      var line = new THREE.Line(lines[4], lineMat), tLine = new THREE.Line(lines[4], tLineMat);
      tLine.pickingId = this.id | 0;
      var icon = new THREE.Mesh(dots[3], pointerMat), tIcon = new THREE.Mesh(dots[3], tPointerMat);
      tIcon.pickingId = this.id | 1 + 3 + idOffset;
      this._axis[0][0].add(icon);
      this._axis[0][0].add(line);
      this._axis[1][0].add(tIcon);
      this._axis[1][0].add(tLine)
    }
    var sphere = new THREE.Mesh(spheres[0], pointerMat), tSphere = new THREE.Mesh(spheres[0], tPointerMat);
    tSphere.pickingId = this.id | 0;
    this.obj.add(sphere);
    this.uiObj.add(tSphere);
    this._gMesh = new THREE.Line(lines[3], lineMat);
    this._tgMesh = new THREE.Line(lines[3], tLineMat);
    this.obj.add(this._gMesh);
    this.uiObj.add(this._tgMesh);
    this.obj.position.set(0, 0, 0);
    this.uiObj.position.set(0, 0, 0);
    return this
  }, "down":function(event) {
    var pos = this.options.delegate.obj.position.clone();
    var n = event.ray.direction.clone();
    pos.subSelf(event.ray.origin);
    var d = pos.dot(event.ray.direction);
    this._moveAnchor = event.ray.origin.clone().addSelf(n.multiplyScalar(d)).subSelf(this.options.delegate.obj.position);
    if(this.model.constructor.type == "CameraPoint") {
      this._initialWeight = this.model.get("weight")
    }else {
      this._initialScale = new THREE.Vector3(this.model.get("scale/x"), this.model.get("scale/y"), this.model.get("scale/z"))
    }
  }, "move":function(event) {
    var masked = event.target & 255;
    if(masked === 1 || masked === 2 || masked === 3) {
      var axis = new THREE.Vector3, n = new THREE.Vector3, dir = event.ray.direction, diff = this.options.delegate.obj.position.clone(), pos = this.options.delegate.obj.position;
      if(masked === 1) {
        axis.x = 1
      }else {
        if(masked === 2) {
          axis.y = 1
        }else {
          axis.z = 1
        }
      }
      n.cross(axis, dir);
      n.crossSelf(dir);
      diff.subSelf(event.ray.origin);
      if(masked === 1) {
        this.options.delegate.obj.position.x = this.options.delegate.uiObj.position.x = -diff.dot(n) / n.x + pos.x - 45 * this._scalar
      }else {
        if(masked === 2) {
          this.options.delegate.obj.position.y = this.options.delegate.uiObj.position.y = -diff.dot(n) / n.y + pos.y - 45 * this._scalar
        }else {
          this.options.delegate.obj.position.z = this.options.delegate.uiObj.position.z = -diff.dot(n) / n.z + pos.z - 45 * this._scalar
        }
      }
      if(this.options.delegate.snappable) {
        this.snap(this.options.delegate.obj.position)
      }
      if(this.options.delegate._updatePositionInstantly) {
        this.moveCommit()
      }
    }else {
      if(masked === 4 || masked === 5 || masked === 6) {
        var axis = new THREE.Vector3, parent = this.options.delegate.obj, pos = parent.position, dir = event.ray.direction.clone(), org = event.ray.origin.clone(), rotation = this.options.delegate.obj.rotation;
        org.subSelf(this.options.delegate.obj.position);
        var c;
        if(masked === 4) {
          var m = (new THREE.Matrix4).rotateZ(Math.PI / 2).rotateX(Math.PI / 2).rotateY(-parent.rotation.y);
          m.multiplyVector3(org);
          m.multiplyVector3(dir);
          c = "x"
        }else {
          if(masked === 5) {
            c = "y"
          }else {
            if(masked === 6) {
              var m = (new THREE.Matrix4).rotateY(-Math.PI / 2).rotateX(-Math.PI / 2).rotateX(-parent.rotation.x).rotateY(-parent.rotation.y);
              m.multiplyVector3(org);
              m.multiplyVector3(dir);
              c = "z"
            }
          }
        }
        if(Math.abs(dir.y) > 1E-4) {
          var intersection, factor;
          factor = -org.y / dir.y;
          dir.multiplyScalar(factor);
          dir.addSelf(org);
          dir.normalize();
          var rot = Math.acos(dir.z);
          if(dir.x < 0) {
            rot = 2 * Math.PI - rot
          }
          this.options.delegate.obj.rotation[c] = this.options.delegate.uiObj.rotation[c] = rot;
          if(this.options.delegate._updatePositionInstantly) {
            this.moveCommit()
          }
        }
      }else {
        if(masked === 7 || masked === 8 || masked === 9 || masked === 10) {
          var axis = new THREE.Vector3, n = new THREE.Vector3, dir = event.ray.direction, mat = new THREE.Matrix4, diff = this.options.delegate.obj.position.clone(), pos = this.options.delegate.obj.position, rot = this.options.delegate.obj.rotation;
          if(masked === 7) {
            axis.x = 1
          }else {
            if(masked === 8) {
              axis.y = 1
            }else {
              if(masked === 9) {
                axis.z = 1
              }else {
                axis.x = axis.y = axis.z = 1
              }
            }
          }
          mat.makeRotationY(rot.y).rotateX(rot.x).rotateZ(rot.z).multiplyVector3(axis);
          n.cross(axis, dir);
          n.crossSelf(dir);
          n.normalize();
          diff.subSelf(event.ray.origin);
          var scale = diff.dot(n) / 45 / this._scalar;
          if(this.model.constructor.type == "CameraPoint") {
            this.model.set("weight", -this._initialWeight * scale)
          }else {
            if(masked === 7) {
              this.options.delegate.obj.scale.x = this.options.delegate.uiObj.scale.x = scale * this._initialScale.x
            }else {
              if(masked === 8) {
                this.options.delegate.obj.scale.y = this.options.delegate.uiObj.scale.y = scale * this._initialScale.y
              }else {
                if(masked === 9) {
                  this.options.delegate.obj.scale.z = this.options.delegate.uiObj.scale.z = scale * this._initialScale.z
                }else {
                  this.options.delegate.obj.scale.x = this.options.delegate.uiObj.scale.x = this._initialScale.x * scale;
                  this.options.delegate.obj.scale.y = this.options.delegate.uiObj.scale.y = this._initialScale.y * scale;
                  this.options.delegate.obj.scale.z = this.options.delegate.uiObj.scale.z = this._initialScale.z * scale
                }
              }
            }
          }
          if(this.options.delegate._updatePositionInstantly) {
            this.moveCommit()
          }
        }else {
          var intersection, factor, y = this.options.delegate.obj.position.y + this._moveAnchor.y;
          intersection = event.ray.direction.clone();
          factor = (y - event.ray.origin.y) / event.ray.direction.y;
          if(factor > 0) {
            intersection.multiplyScalar(factor);
            intersection.addSelf(event.ray.origin);
            this.options.delegate.obj.position.x = this.options.delegate.uiObj.position.x = intersection.x - this._moveAnchor.x;
            this.options.delegate.obj.position.z = this.options.delegate.uiObj.position.z = intersection.z - this._moveAnchor.z;
            if(this.options.delegate._updatePositionInstantly) {
              this.moveCommit()
            }
          }
        }
      }
    }
  }, "moveCommit":function(event) {
    if(this.options.delegate.snappable) {
      this.snapCommit()
    }
    this.model.set({"position/x":this.options.delegate.obj.position.x, "position/y":this.options.delegate.obj.position.y, "position/z":this.options.delegate.obj.position.z, "rotation/x":this.options.delegate.obj.rotation.x / Math.PI * 180, "rotation/y":this.options.delegate.obj.rotation.y / Math.PI * 180, "rotation/z":this.options.delegate.obj.rotation.z / Math.PI * 180});
    if(this.model.constructor.type != "CameraPoint") {
      this.model.set({"scale/x":this.options.delegate.obj.scale.x, "scale/y":this.options.delegate.obj.scale.y, "scale/z":this.options.delegate.obj.scale.z})
    }
  }, "remove":function() {
    Object.ViewGL.PresentationObject.prototype.remove.call(this);
    this.options.renderer.off(null, null, this);
    this.options.uiStatus.off(null, null, this)
  }})
})(sp.module("object"));
(function(Object) {
  var Resource = sp.module("resource");
  function loadCubeMap(image) {
    var t = new THREE.Texture;
    t.image = [];
    t.flipY = false;
    var coords = [0, 1 / 3, 1 / 4, 0, 1 / 4, 1 / 3, 1 / 4, 2 / 3, 2 / 4, 1 / 3, 3 / 4, 1 / 3];
    for(var i = 0;i < 6;i++) {
      var c = $("<canvas>")[0], ctx = c.getContext("2d");
      c.width = 128;
      c.height = 128;
      ctx.fillStyle = "#f00";
      ctx.fillRect(0, 0, 128, 128);
      t.image[i] = c
    }
    return t
  }
  var geometry = new THREE.CubeGeometry(1E3, 1E3, 1E3);
  var shader = THREE.ShaderUtils.lib["cube"];
  Object.ViewGL.Background = Object.ViewGL.PresentationObject.extend({"initialize":function(key, value) {
    Object.ViewGL.PresentationObject.prototype.initialize.call(this);
    this.model.on("change:skybox", function() {
      this.obj.remove(this._mesh);
      this.render()
    }, this)
  }, "render":function() {
    var m;
    if(this.model.get("skybox")) {
      var tex = this.options.resources.get(this.model.get("skybox")).getTexture();
      shader.uniforms.tCube.texture = loadCubeMap(this.options.resources.get(this.model.get("skybox")).getImage());
      m = new THREE.ShaderMaterial({"uniforms":shader.uniforms, "vertexShader":shader.vertexShader, "fragmentShader":shader.fragmentShader});
      m.depthWrite = false
    }else {
      m = new THREE.MeshLambertMaterial({"color":2303, "fog":false})
    }
    this._mesh = new THREE.Mesh(geometry, m);
    this._mesh.doubleSided = true;
    this.obj.add(this._mesh);
    return this
  }})
})(sp.module("object"));
(function(Object) {
  var lineColorMaterial = new THREE.LineBasicMaterial({"vertexColors":THREE.VertexColors});
  Object.ViewGL.CameraPath = Backbone.View.extend({"initialize":function() {
    this.obj = new THREE.Object3D;
    this.uiObj = new THREE.Object3D;
    this.options.cameraSequence.on("change", function() {
      this.renderAll()
    }, this);
    this.options.objectList.on("change", function(model) {
      if(model.constructor.type == "CameraPoint") {
        var list = this.options.cameraSequence.get("list"), index = list.indexOf(model.get("id"));
        if(index > 0) {
          this.renderPart(index - 1)
        }
        if(index < list.length - 1) {
          this.renderPart(index)
        }
      }
    }, this);
    this._geometries = [];
    this._curves = [];
    this.renderAll()
  }, "renderAll":function() {
    var list = this.options.cameraSequence.get("list"), scope = this;
    this._modelCache = [];
    this.options.objectList.each(function(model) {
      if(model.constructor.type == "CameraPoint") {
        var index = list.indexOf(model.get("id"));
        if(index >= 0) {
          scope._modelCache[index] = model
        }
      }
    });
    for(var i = 0;i < this.obj.children.length;i++) {
      this.obj.remove(this.obj.children[i])
    }
    this._curves = [];
    for(var i = 0;i < list.length - 1;i++) {
      this.renderPart(i)
    }
  }, "renderPart":function(i) {
    var cur = this._modelCache[i], next = this._modelCache[i + 1], geometry = this._geometries[i];
    if(!geometry) {
      geometry = this._geometries[i] = new THREE.Geometry;
      geometry.vertices = new Array(25);
      geometry.colors = new Array(25)
    }
    var matrixWorldInverse = new THREE.Matrix4;
    this.obj.updateMatrixWorld();
    matrixWorldInverse.getInverse(this.obj.matrixWorld);
    var v1 = new THREE.Vector3(next.get("position/x"), next.get("position/y"), next.get("position/z")), v2 = v1.clone(), v4 = new THREE.Vector3(cur.get("position/x"), cur.get("position/y"), cur.get("position/z")), v3 = v4.clone(), rot = cur.get("rotation/y"), scale = cur.get("weight") * 100, nrot = next.get("rotation/y"), nscale = next.get("weight") * 100, startSpeed = cur.get("speed"), endSpeed = next.get("speed");
    v2.addSelf(new THREE.Vector3(nscale * Math.cos(nrot * Math.PI / 180), 0, -nscale * Math.sin(nrot * Math.PI / 180)));
    v3.subSelf(new THREE.Vector3(scale * Math.cos(rot * Math.PI / 180), 0, -scale * Math.sin(rot * Math.PI / 180)));
    matrixWorldInverse.multiplyVector3(v1);
    matrixWorldInverse.multiplyVector3(v2);
    matrixWorldInverse.multiplyVector3(v3);
    matrixWorldInverse.multiplyVector3(v4);
    var colors = {"Very Slow":65280, "Slow":65535, "Medium":255, "Fast":16776960, "Very Fast":16711680};
    var curve = new THREE.CubicBezierCurve3(v1, v2, v3, v4);
    geometry.vertices[0] = v1;
    geometry.colors[0] = new THREE.Color(colors[startSpeed]);
    geometry.vertices[24] = v4;
    geometry.colors[24] = new THREE.Color(colors[endSpeed]);
    for(var j = 1;j < 24;j++) {
      geometry.vertices[j] = curve.getPoint(j / 25);
      geometry.colors[j] = new THREE.Color;
      geometry.colors[j].r = j / 25 * geometry.colors[0].r + (1 - j / 25) * geometry.colors[24].r;
      geometry.colors[j].g = j / 25 * geometry.colors[0].g + (1 - j / 25) * geometry.colors[24].g;
      geometry.colors[j].b = j / 25 * geometry.colors[0].b + (1 - j / 25) * geometry.colors[24].b
    }
    geometry.verticesNeedUpdate = true;
    geometry.colorsNeedUpdate = true;
    if(this._curves.indexOf(i) == -1) {
      this._curves.push(i);
      this.obj.add(new THREE.Line(geometry, lineColorMaterial))
    }
    return this
  }})
})(sp.module("object"));
(function(Core) {
  Core.Model.ObjectList = Backbone.Collection.extend({"initialize":function() {
    this.selectedObjects = []
  }, "add":function(model) {
    Backbone.Collection.prototype.add.apply(this, arguments);
    model.trigger("add")
  }, "remove":function(model) {
    Backbone.Collection.prototype.remove.apply(this, arguments);
    model.trigger("remove");
    model.destroy()
  }, "select":function(model) {
    if(this.selectedObjects.indexOf(model) < 0) {
      for(var i = 0;i < this.selectedObjects.length;i++) {
        this.selectedObjects[i].trigger("unselect", this.selectedObjects[i]);
        this.selectedObjects[i].off("destroy", null, this)
      }
      this.selectedObjects = [];
      if(model) {
        model.trigger("select", model);
        model.on("destroy", function() {
          model.trigger("unselect", model);
          var index = this.selectedObjects.indexOf(model);
          if(index >= 0) {
            this.selectedObjects.splice(index, 1)
          }
        }, this);
        this.selectedObjects.push(model)
      }
    }
  }, "removeSelected":function() {
    for(var i = 0;i < this.selectedObjects.length;i++) {
      this.remove(this.selectedObjects[i])
    }
  }, "createId":function() {
    var id;
    do {
      id = 256 * (Math.round(Math.random() * 65519) + 16)
    }while(this.get(id));
    return id
  }})
})(sp.module("core"));
(function(Core) {
  var Misc = sp.module("misc");
  Core.Model.UIStatus = Backbone.Model.extend({"initialize":function() {
    this.on("change:mode", function() {
      this.set("darken", false);
      var mode = this.get("mode");
      Misc.URL.setHash("mode", mode)
    }, this);
    this.set("progress", 0);
    var scope = this;
    $.getJSON("/session", function(data) {
      if(data && data.userCtx) {
        scope.set("userCtx", data.userCtx)
      }
    })
  }, "defaults":{"userCtx":null, "mode":"edit", "progress":0, "transform":"translate", "darken":false, "tooltips":false}, "validate":function(attrs) {
    if(attrs.mode == "play" && this.get("mode") != "play") {
      if(this.presentation.cameraSequence.get("list").length <= 1) {
        return"Camera Path too small."
      }
    }
  }})
})(sp.module("core"));
(function(Core) {
  Core.Model.CameraSequence = Backbone.Model.extend({"initialize":function() {
    this.set("list", [])
  }, "startTransaction":function() {
    this.transaction = true
  }, "finishTransaction":function() {
    this.transaction = false;
    this.trigger("change")
  }, "move":function(id, index) {
    var lis = this.get("list"), cur = lis.indexOf(id);
    index >= 0 || (index = 0);
    index >= lis.length || (index = lis.length - 1);
    if(cur >= 0) {
      var el = lis.splice(cur, 1);
      lis.splice(index, 0, el[0]);
      this.transaction || this.trigger("change")
    }
  }, "remove":function(id) {
    var lis = this.get("list"), cur = lis.indexOf(id);
    if(cur >= 0) {
      var el = lis.splice(cur, 1);
      this.transaction || this.trigger("change")
    }
  }, "push":function(id) {
    var lis = this.get("list");
    lis.push(id);
    this.transaction || this.trigger("change")
  }, "toJSON":function() {
    return this.get("list")
  }})
})(sp.module("core"));
(function(Core) {
  var Resource = sp.module("resource"), Misc = sp.module("misc"), Object = sp.module("object");
  Core.Model.Presentation = Backbone.Model.extend({"initialize":function() {
    this.cameraSequence = new Core.Model.CameraSequence;
    this.objectList = new Core.Model.ObjectList;
    this.resources = new Resource.Model.ResourceCollection;
    this.uiStatus = new Core.Model.UIStatus;
    this.uiStatus.presentation = this;
    this.history = new Misc.ChangeHistory(this);
    this.copiedObjects = [];
    this.createNew();
    this.objectList.on("add", function(model) {
      if(model.constructor.type == "CameraPoint") {
        this.cameraSequence.push(model.get("id"))
      }
    }, this).on("remove", function(model) {
      if(model.constructor.type == "CameraPoint") {
        this.cameraSequence.remove(model.get("id"))
      }
    }, this);
    this.set("mode", Misc.URL.hash["mode"] || "edit")
  }, "addObject":function(type, attrs, silent) {
    attrs || (attrs = {});
    attrs.id || (attrs.id = this.objectList.createId());
    var cam = this.uiStatus.get("camera");
    if(cam) {
      cam.updateMatrixWorld();
      var offset = type == "CameraPoint" ? 0 : -500, pos = new THREE.Vector3(0, 0, offset), dir = new THREE.Vector3(0, 0, offset - 10);
      cam.matrixWorld.multiplyVector3(pos);
      cam.matrixWorld.multiplyVector3(dir);
      dir.subSelf(pos);
      dir2 = dir.clone();
      dir.y = 0;
      dir.normalize();
      if(attrs["position/x"] == undefined && attrs["position/y"] == undefined && attrs["position/z"] == undefined) {
        attrs["position/x"] = pos.x;
        attrs["position/y"] = Math.max(pos.y, 0);
        attrs["position/z"] = pos.z
      }
      if(attrs["rotation/y"] == undefined) {
        var rotY = Math.acos(dir.z);
        if(dir.x < 0) {
          rotY = 2 * Math.PI - rotY
        }
        attrs["rotation/y"] = rotY * 180 / Math.PI + (type == "CameraPoint" ? 0 : 180);
        if(!attrs["rotation/x"] && type == "CameraPoint") {
          (new THREE.Matrix4).makeRotationY(-rotY).multiplyVector3(dir2);
          dir2.normalize();
          var rotX = Math.acos(dir2.y);
          if(dir2.z < 0) {
            rotX = 2 * Math.PI - rotX
          }
          attrs["rotation/x"] = rotX * 180 / Math.PI - 90
        }
      }
    }
    var model = new Object.Model[type](attrs);
    this.objectList.add(model, {"silent":silent});
    this.objectList.select(model);
    return model
  }, "copySelected":function() {
    this.copiedObjects = [];
    for(var i = 0;i < this.objectList.selectedObjects.length;i++) {
      this.copiedObjects.push(this.objectList.selectedObjects[i])
    }
  }, "pasteSelected":function() {
    var attrs;
    for(var i = 0;i < this.copiedObjects.length;i++) {
      attrs = this.copiedObjects[i].toJSON();
      attrs.id = this.objectList.createId();
      attrs["rotation/y"] = undefined;
      attrs["position/x"] = undefined;
      attrs["position/y"] = undefined;
      attrs["position/z"] = undefined;
      this.addObject(attrs.type, attrs)
    }
  }, "clear":function(q) {
    var inc = typeof q != "undefined", i = this.objectList.length - 1;
    q || (q = new Misc.Queue({"ctx":this}));
    while(i >= 0) {
      (function() {
        var j = i;
        q = q.queue(function(q) {
          this.objectList.at(j).destroy();
          q.next()
        })
      })();
      i--
    }
    this.history.clearUndo().clearRedo()
  }, "createNew":function() {
    this.set("_id", undefined);
    this.set("_rev", undefined);
    this.set("author", undefined);
    this.set("name", "Unnamed Project");
    this.set("users", {});
    this.set("worldReadable", false);
    this.clear(new Misc.Queue({"ctx":this, "forcebreak":false}));
    this.addObject("Geometry", {"rotation/y":45, "position/x":0, "position/y":100, "position/z":-500});
    this.objectList.select(null)
  }, "openCloud":function(id) {
    this.uiStatus.set("progress", this.uiStatus.set("progress") + 1);
    var scope = this;
    $.getJSON("/db/" + id + "?attachments=true", function(obj) {
      scope.uiStatus.set("progress", scope.uiStatus.set("progress") - 1);
      if(obj) {
        var error = obj.forbidden || obj.reason || obj.error;
        if(error) {
          this.uiStatus.trigger("error", scope, "opening failed: " + error);
          return
        }
      }
      obj._attachments || (obj._attachments = []);
      obj.objects || (obj.objects = []);
      if(obj._revisions) {
        delete obj._revisions
      }
      scope.inflate(obj, new Misc.Queue({"ctx":scope, "forcebreak":false}))
    }).error(function(e) {
      scope.uiStatus.set("progress", scope.uiStatus.set("progress") - 1);
      scope.uiStatus.trigger("error", scope, "opening failed: " + e.statusText)
    })
  }, "inflate":function(obj, q) {
    this.history.setEnabled(false);
    this.uiStatus.set("progress", this.uiStatus.set("progress") + 1);
    q || (q = new Misc.Queue({"ctx":this}));
    this.cameraSequence.startTransaction();
    this.clear(q);
    for(var id in obj._attachments) {
      (function() {
        var local = id;
        q = q.queue(function(q) {
          this.resources.add(Resource.Model.Resource.fromJSON(obj._attachments[local], local));
          q.next()
        })
      })()
    }
    for(var i in obj.objects) {
      (function() {
        var local = i;
        q = q.queue(function(q) {
          this.addObject(obj.objects[local].type, obj.objects[local], true);
          q.next()
        })
      })()
    }
    q.queue(function() {
      delete obj.objects;
      delete obj._attachments;
      this.set(obj);
      this.objectList.each(function(model) {
        this.objectList.trigger("add", model)
      }, this);
      this.objectList.trigger("inflateComplete");
      if(obj.cameraSequence) {
        this.cameraSequence.set("list", obj.cameraSequence)
      }
      this.cameraSequence.finishTransaction();
      this.uiStatus.set("progress", this.uiStatus.set("progress") - 1);
      this.history.setEnabled(true);
      this.history.clearUndo();
      this.history.clearRedo()
    })
  }, "toJSON":function() {
    this.history.clearUndo().clearRedo();
    return _.defaults({"objects":this.objectList, "cameraSequence":this.cameraSequence.toJSON(), "_attachments":this.resources.toJSON(false)}, this.attributes)
  }})
})(sp.module("core"));
(function(Core) {
  Core.View.ObjectListItemCommon = Backbone.View.extend({"tagName":"tr", "template":$("#sp-tpl-objectList").html(), "events":{"mousedown":function() {
    if(this.model.collection && this.model.collection.select) {
      this.model.collection.select(this.model)
    }
  }, "dblclick":function() {
    this.model.trigger("focus", this.model)
  }, "click span":function() {
    this.model.destroy()
  }}, "initialize":function() {
    this.model.on("change", this.render, this);
    this.model.on("destroy", function() {
      if(this.model.constructor.type != "CameraPoint") {
        this.$el.effect("puff", null, null, $.proxy(this.remove, this))
      }
    }, this);
    this.model.on("select", function() {
      this.$el.addClass("ui-state-highlight")
    }, this);
    this.model.on("unselect", function() {
      this.$el.removeClass("ui-state-highlight")
    }, this);
    if(this.model.collection && this.model.collection.selectedObjects.indexOf(this.model) >= 0) {
      this.$el.addClass("ui-state-highlight")
    }
  }, "render":function() {
    var name = this.model.get("name");
    if(name.length > 15) {
      name = name.substring(0, 12) + "..."
    }
    this.$el.html(Mustache.render(this.template, {"name":name}));
    return this
  }});
  Core.View.ObjectListItemCamera = Backbone.View.extend({"tagName":"tr", "template":$("#sp-tpl-objectList").html(), "events":{"mousedown":function() {
    if(this.model.collection && this.model.collection.select) {
      this.model.collection.select(this.model)
    }
  }, "dblclick":function() {
    this.model.trigger("focus", this.model)
  }, "click span":function() {
    this.model.destroy()
  }}, "initialize":function() {
    this.model.on("change", this.render, this);
    this.model.on("destroy", function() {
      this.$el.effect("puff", null, null, $.proxy(this.remove, this))
    }, this);
    this.model.on("select", function() {
      this.$el.addClass("ui-state-highlight")
    }, this);
    this.model.on("unselect", function() {
      this.$el.removeClass("ui-state-highlight")
    }, this)
  }, "render":function() {
    var name = this.model.get("name");
    if(name.length > 15) {
      name = name.substring(0, 12) + "..."
    }
    this.$el.html(Mustache.render(this.template, {"name":name}));
    this.$el.attr("data-id", this.model.get("id"));
    return this
  }});
  Core.View.ObjectList = Backbone.View.extend({"template":$("#sp-tpl-objectList").html(), "initialize":function() {
    var scope = this;
    function addHandler(model) {
      if(model.constructor.type != "CameraPoint") {
        scope.$el.find("#sp-objectList-common tbody").append((new Core.View.ObjectListItemCommon({"model":model})).render().$el)
      }
    }
    this.collection.each(addHandler);
    this.collection.on("add", addHandler);
    this.$el.find("ul li").outerWidth(this.$el.innerWidth() / 2 - 1);
    this.$el.tabs();
    this.$el.find("#sp-objectList-camera tbody").sortable({"stop":function() {
      var list = [];
      $("#sp-objectList-camera tr").each(function() {
        list.push(parseInt($(this).attr("data-id")))
      });
      scope.options.cameraSequence.set("list", list)
    }});
    var camElems = {};
    function resort() {
      var container = scope.$el.find("#sp-objectList-camera tbody"), elems = container.children(), lis = scope.options.cameraSequence.get("list");
      container.empty();
      for(var i = 0;i < lis.length;i++) {
        if(!lis[i]) {
          continue
        }
        var model = scope.collection.get(lis[i]);
        if(model && !camElems[lis[i]]) {
          camElems[lis[i]] = (new Core.View.ObjectListItemCamera({"model":model})).render()
        }
        container.append(camElems[lis[i]].$el);
        camElems[lis[i]].delegateEvents()
      }
      for(var i in camElems) {
        if(lis.indexOf(parseInt(i)) < 0) {
          delete camElems[i]
        }
      }
      container.sortable("refresh")
    }
    this.options.cameraSequence.on("change", resort);
    resort()
  }}, {})
})(sp.module("core"));
(function(Core) {
  Core.View.AttributeList = Backbone.View.extend({"tagName":"tbody", "template":$("#sp-tpl-attributeList").html(), "initialize":function() {
    this.model.on("destroy", this.remove, this);
    this.render()
  }, "render":function() {
    var scope = this;
    var view = {"items":this.model.constructor.attributes, "iterator":function() {
      var list = [];
      for(var key in this.items) {
        if(!this.items[key].type) {
          continue
        }
        var newKey = (this.key ? this.key + "/" : "") + key;
        var item = _.defaults({"key":newKey, "value":scope.model.get(newKey), "iterator":this.iterator, "lang":this.lang}, this.items[key]);
        item["type-" + this.type] = false;
        item["type-" + this.items[key].type] = true;
        list.push(item)
      }
      return list
    }, "lang":window.lang};
    this.$el.html(Mustache.render(this.template, view, {"template":this.template}));
    this.$(".sp-trigger").click(function() {
      $(this).parent().find("ol").slideToggle()
    });
    this.$(".sp-attr-string, .sp-attr-float, .sp-attr-bool, .sp-attr-color").each(function(i, el) {
      var $el = $(el), $input = $el.find("input"), key = $el.attr("data-key");
      function update() {
        if($el.hasClass("sp-attr-color")) {
          var s = this.model.get(key).toString(16);
          while(s.length < 6) {
            s = "0" + s
          }
          $input.val(s)
        }else {
          if($el.hasClass("sp-attr-float")) {
            $input.val(this.model.get(key).toFixed(4))
          }else {
            if($el.hasClass("sp-attr-bool")) {
              $input.attr("checked", this.model.get(key))
            }else {
              $input.val(this.model.get(key))
            }
          }
        }
      }
      $input.change(function() {
        if($el.hasClass("sp-attr-float")) {
          var val = parseFloat($(this).val());
          if(!_.isFinite(val)) {
            update.call(scope)
          }else {
            scope.model.set(key, val)
          }
        }else {
          if($el.hasClass("sp-attr-color")) {
            var val = parseInt($(this).val(), 16);
            if(!_.isFinite(val) || val < 0 || val > 16777215) {
              update.call(scope)
            }else {
              scope.model.set(key, val)
            }
          }else {
            if($el.hasClass("sp-attr-bool")) {
              scope.model.set(key, $(this).attr("checked") === "checked")
            }else {
              scope.model.set(key, $(this).val())
            }
          }
        }
      });
      $input.focus(function() {
        $input.select()
      });
      scope.model.on("change:" + key, function() {
        update.call(scope)
      }, scope);
      if($el.hasClass("sp-attr-color")) {
        var $farb = $el.find(".sp-farbtastic"), picker = $.farbtastic($farb);
        picker.linkTo(function(color) {
          scope.model.set(key, parseInt(color.substring(1), 16))
        });
        scope.model.on("change:" + key, function() {
          picker.setColor("#" + this.model.get(key).toString(16))
        }, scope);
        $farb.hide();
        $input.focus(function() {
          $farb.show("puff");
          function callback($e) {
            if($farb.has($e.target).length <= 0 && !$input.is($e.target)) {
              $farb.hide("puff");
              $(document).unbind("click", callback)
            }
          }
          $(document).bind("click", callback)
        })
      }
      update.call(scope)
    });
    this.$(".sp-attr-object div").buttonset();
    this.$(".sp-attr-object").each(function(i, el) {
      var $el = $(el), $select = $el.find(".sp-select"), $clear = $el.find(".sp-clear"), key = $el.attr("data-key");
      $el.find(".ui-state-default").hover(function() {
        if(!$(this).hasClass("ui-state-disabled")) {
          $(this).addClass("ui-state-hover")
        }
      }, function() {
        $(this).removeClass("ui-state-hover")
      });
      $select.click(function() {
        if($select.hasClass("ui-state-active")) {
          $select.removeClass("ui-state-active");
          $select.text("select");
          scope.model.collection.off("select", null, scope)
        }else {
          if(scope.model.collection) {
            $select.addClass("ui-state-active");
            $select.text("cancel");
            scope.model.collection.on("select", function(model) {
              scope.model.set(key, model.id);
              $select.removeClass("ui-state-active");
              $select.text("select");
              scope.model.collection.off("select", null, scope)
            }, scope)
          }
        }
      });
      function update() {
        if(scope.model.get(key)) {
          $clear.removeClass("ui-state-disabled")
        }else {
          $clear.addClass("ui-state-disabled")
        }
      }
      update();
      scope.model.on("change:" + key, function() {
        update()
      });
      $clear.click(function() {
        if($select.hasClass("ui-state-active")) {
          $select.removeClass("ui-state-active");
          $select.text("select");
          scope.model.collection.off("select", null, scope)
        }
        scope.model.set(key, 0)
      })
    });
    this.$(".sp-attr-bool-unique").each(function(i, el) {
      var $el = $(el), $button = $el.find("span.ui-state-default"), key = $el.attr("data-key");
      function update() {
        if(scope.model.get(key)) {
          $button.addClass("ui-state-disabled")
        }else {
          $button.removeClass("ui-state-disabled")
        }
      }
      update();
      scope.model.on("change:" + key, function() {
        update()
      }, this);
      $button.hover(function() {
        if(!$button.hasClass("ui-state-disabled")) {
          $button.addClass("ui-state-hover")
        }
      }, function() {
        $button.removeClass("ui-state-hover")
      });
      $button.click(function() {
        if(!$button.hasClass("ui-state-disabled")) {
          scope.model.set(key, true);
          if(scope.model.collection) {
            scope.model.collection.each(function(model) {
              if(model != scope.model && model.get(key) === true) {
                model.set(key, false)
              }
            })
          }
        }
      })
    });
    this.$(".sp-attr-bigString").each(function(i, el) {
      var $el = $(el), $button = $el.find(".ui-button"), key = $el.attr("data-key");
      $button.hover(function() {
        $button.addClass("ui-state-hover")
      }, function() {
        $button.removeClass("ui-state-hover")
      });
      $button.click(function() {
        var dialog = (new Core.View.TextAreaDialog({"text":scope.model.get(key), "success":function(text) {
          scope.model.set(key, text)
        }})).render()
      })
    });
    this.$(".sp-attr-res-texture").each(function(i, el) {
      var $el = $(el), $button = $el.find(".ui-button"), key = $el.attr("data-key");
      $button.hover(function() {
        $button.addClass("ui-state-hover")
      }, function() {
        $button.removeClass("ui-state-hover")
      });
      $button.click(function() {
        var dialog = (new Core.View.TextureDialog({"resources":scope.options.resources, "success":function(res) {
          scope.model.set(key, res)
        }})).render()
      })
    });
    this.$(".sp-attr-enum").each(function(i, el) {
      var $el = $(el), $select = $el.find("select"), key = $el.attr("data-key");
      function update() {
        $select.val(scope.model.get(key))
      }
      update();
      $select.change(function() {
        scope.model.set(key, $select.val())
      });
      scope.model.on("change:" + key, function() {
        update()
      })
    });
    return this
  }, "remove":function() {
    Backbone.View.prototype.remove.call(this);
    this.model.off(null, null, this)
  }})
})(sp.module("core"));
(function(Core) {
  Core.View.PreferenceDialog = Backbone.View.extend({"template":$("#sp-tpl-prefDialog").html(), "render":function() {
    var scope = this;
    var rowTemplate = $("#sp-tpl-prefDialogPermissionRow").html();
    var view = {"worldReadable":this.model.get("worldReadable"), "name":this.model.get("name"), "users":[]};
    var userHash = this.model.get("users") || {};
    for(var i in userHash) {
      view.users.push(function() {
        var user = {"name":i, "write":false};
        for(var j = 0;j < userHash[i].roles.length;j++) {
          if(userHash[i].roles[j] === "write") {
            user.write = true
          }
        }
        return user
      }())
    }
    this.$el.html(Mustache.render(this.template, view, {"permissionRow":rowTemplate}));
    this.$el.attr("title", "Preferences");
    this.$("#sp-pref-navigation li, .sp-perm-add, .sp-perm-remove").hover(function() {
      $(this).addClass("ui-state-hover")
    }, function() {
      $(this).removeClass("ui-state-hover")
    });
    function onClick() {
      var j = $(this).index();
      console.debug("onClick " + j);
      $(this).addClass("ui-state-active");
      scope.$("#sp-pref-navigation li").each(function(i) {
        if(i != j) {
          $(this).removeClass("ui-state-active")
        }
      });
      scope.$("#sp-pref-content").children().each(function(i) {
        if(i != j) {
          $(this).hide()
        }else {
          $(this).show()
        }
      })
    }
    onClick.call($("#sp-pref-navigation li")[0]);
    this.$("#sp-pref-navigation li").click(onClick);
    this.$(".sp-perm-add").click(function() {
      var $elem = $(Mustache.render(rowTemplate, {"name":"", "write":false}));
      $elem.find(".sp-perm-remove").click(function() {
        $(this).closest("tr").remove()
      });
      $(this).closest("tr").before($elem)
    });
    this.$(".sp-perm-remove").click(function() {
      $(this).closest("tr").remove()
    });
    this.$el.dialog({"autoOpen":true, "width":750, "height":500, "resizable":false, "modal":true, "buttons":{"Ok":function() {
      scope.applyChanges();
      scope.$el.dialog("close")
    }, "Apply":function() {
      scope.applyChanges()
    }, "Cancel":function() {
      scope.$el.dialog("close")
    }}})
  }, "applyChanges":function() {
    var users = {};
    this.$("#sp-pref-permissions tr").each(function(i) {
      var name = $(this).find(".sp-permission-name").val();
      var write = !_.isUndefined($(this).find(".sp-permission-write").attr("selected"));
      if(name) {
        users[name] = {"roles":[]};
        if(write) {
          users[name].roles.push("write")
        }
      }
    });
    this.model.set("users", users);
    this.model.set("worldReadable", this.$("#sp-pref-permissions-worldReadable").attr("checked") === "checked");
    this.model.set("name", this.$("#sp-pref-general-name").val())
  }})
})(sp.module("core"));
(function(Core) {
  var dialogEvents = _.extend({}, Backbone.Events), $el, editor;
  $(function() {
    var view = {"data":{"title":"Enter Text"}};
    $el = $(Mustache.render($("#sp-tpl-dialog-textarea").html(), view));
    $("#sp-container-body").append($el);
    editor = $el.find("textarea").cleditor({"controls":"bold italic | color | bullets numbering | undo redo", "useCSS":true});
    var _this = this;
    $el.dialog({"autoOpen":false, "modal":true, "width":"auto", "resizable":false, "buttons":{"Ok":function() {
      dialogEvents.trigger("ok");
      $(this).dialog("close")
    }, "Cancel":function() {
      dialogEvents.trigger("cancel");
      $(this).dialog("close")
    }}})
  });
  Core.View.TextAreaDialog = Backbone.View.extend({"render":function() {
    dialogEvents.on("ok", function() {
      if(this.options.success) {
        this.options.success($el.find("textarea").val())
      }
      dialogEvents.off(null, null, this)
    }, this);
    dialogEvents.on("cancel", function() {
      dialogEvents.off(null, null, this)
    }, this);
    $el.find("textarea").val(this.options.text);
    $el.dialog("open");
    $el.find("textarea").cleditor()[0].refresh();
    return this
  }})
})(sp.module("core"));
(function(Core) {
  var Misc = sp.module("misc");
  Core.View.LoginDialog = Backbone.View.extend({"template":$("#sp-tpl-dialogLogin").html(), "initialize":function() {
    var scope = this;
    $(document).bind("keydown", function($e) {
      var keyCode = $e.which || $e.originalEvent.keyCode;
      if(keyCode == 13) {
        console.debug("submit");
        scope.enter()
      }
    })
  }, "render":function() {
    var scope = this;
    var view = {};
    this.$el.html(Mustache.render(this.template, view));
    this.$el.attr("title", "Login");
    this.$(".sp-account-loading").hide();
    this.$(".sp-account-error").hide();
    this.$el.dialog({"autoOpen":true, "resizable":false, "modal":true, "buttons":{"Submit":function() {
      scope.enter()
    }, "Cancel":function() {
      scope.$el.dialog("close")
    }}})
  }, "enter":function() {
    var scope = this;
    scope.$(".sp-account-error").hide();
    scope.$(".sp-account-loading").show();
    var name = scope.$("#sp-login-name").val(), password = scope.$("#sp-login-password").val(), nameEnc = encodeURIComponent(name), nameEnc2 = nameEnc.replace("%", "%" + "%".charCodeAt(0).toString(16));
    (new Misc.Queue).queue(function(q) {
      $.ajax("/session", {"type":"POST", "data":"name=" + name + "&password=" + password}).done(function(data) {
        scope.$(".sp-account-loading").hide();
        var response = $.parseJSON(data);
        q.next(response)
      }).fail(function(jqXHR) {
        scope.$(".sp-account-loading").hide();
        try {
          var json = $.parseJSON(jqXHR.responseText)
        }catch(e) {
        }
        if(json && json.error) {
          scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":json.reason}));
          scope.$(".sp-account-error").show()
        }else {
          scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Login Failed"}));
          scope.$(".sp-account-error").show()
        }
      })
    }).queue(function(q, response) {
      scope.model.set("userCtx", response);
      scope.$el.dialog("close")
    })
  }})
})(sp.module("core"));
(function(Core) {
  var Misc = sp.module("misc");
  Core.View.RegisterDialog = Backbone.View.extend({"template":$("#sp-tpl-dialogRegister").html(), "initialize":function() {
    var scope = this;
    $(document).bind("keydown", function($e) {
      var keyCode = $e.which || $e.originalEvent.keyCode;
      if(keyCode == 13) {
        console.debug("submit");
        scope.enter()
      }
    })
  }, "render":function() {
    var scope = this;
    var view = {};
    this.$el.html(Mustache.render(this.template, view));
    this.$el.attr("title", "Register");
    this.$(".sp-account-loading").hide();
    this.$(".sp-account-error").hide();
    this.$el.dialog({"autoOpen":true, "resizable":false, "modal":true, "buttons":{"Submit":function() {
      scope.enter()
    }, "Cancel":function() {
      scope.$el.dialog("close")
    }}})
  }, "enter":function() {
    console.debug("enter");
    var scope = this;
    scope.$(".sp-account-error").hide();
    var name = scope.$("#sp-register-name").val().toLowerCase(), mail = scope.$("#sp-register-mail").val();
    password = scope.$("#sp-register-password").val();
    password2 = scope.$("#sp-register-password2").val();
    if(!/^[A-Z0-9._-]+$/i.test(name)) {
      scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Invalid username! Only letters, numbers and . _ - are allowed"}));
      scope.$(".sp-account-error").show();
      return
    }else {
      if(!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(mail)) {
        scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Email is not valid!"}));
        scope.$(".sp-account-error").show();
        return
      }else {
        if(password != password2) {
          scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Passwords are not equal!"}));
          scope.$(".sp-account-error").show();
          return
        }else {
          if(password == "") {
            scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Please enter password"}));
            scope.$(".sp-account-error").show();
            return
          }
        }
      }
    }
    scope.$(".sp-account-loading").show();
    var doc = {"name":name, "email":mail, "password":password};
    function onFail(jqXHR) {
      scope.$(".sp-account-loading").hide();
      try {
        var json = $.parseJSON(jqXHR.responseText)
      }catch(e) {
      }
      if(json && json.error == "conflict") {
        scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Username already registered"}));
        scope.$(".sp-account-error").show()
      }else {
        if(json && json.error) {
          scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":json.reason}));
          scope.$(".sp-account-error").show()
        }else {
          scope.$(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":"Login Failed"}));
          scope.$(".sp-account-error").show()
        }
      }
    }
    (new Misc.Queue).queue(function(q) {
      var cd = (new Core.View.CaptchaDialog).render();
      cd.on("submit", function(challenge, response) {
        doc.challenge = challenge;
        doc.response = response;
        q.next(cd)
      })
    }).queue(function(q, cd) {
      $.ajax("/register", {"type":"PUT", "contentType":"application/json", "data":JSON.stringify(doc)}).done(function(data) {
        cd.remove();
        q.next()
      }).fail(function() {
        cd.remove();
        onFail.apply(this, arguments)
      })
    }).queue(function(q) {
      $.ajax("/session", {"type":"POST", "data":"name=" + name + "&password=" + password}).done(function(data) {
        var response = $.parseJSON(data);
        scope.model.set("userCtx", response);
        scope.$el.dialog("close")
      }).fail(onFail)
    }).queue(function(q, response) {
      scope.model.set("userCtx", response);
      scope.$el.dialog("close");
      if(response.roles.indexOf("validated") == -1) {
        (new Core.View.CaptchaDialog({"user":response.name})).render()
      }
    })
  }})
})(sp.module("core"));
(function(Core) {
  var Misc = sp.module("misc");
  var dialogEvents = _.extend({}, Backbone.Events), $el;
  $(function() {
    var view = {};
    $el = $(Mustache.render($("#sp-tpl-dialogCaptcha").html(), view));
    $("sp-container-body").append($el);
    $el.attr("title", "Human Verification");
    $el.dialog({"autoOpen":false, "width":"auto", "resizable":false, "modal":true, "buttons":{"Submit":function() {
      dialogEvents.trigger("submit")
    }, "Cancel":function() {
      dialogEvents.trigger("cancel")
    }}})
  });
  function create() {
    Recaptcha.create(window.config["reCaptchaPublicKey"], "recaptcha-container", {"theme":"white", "callback":Recaptcha.focus_response_field})
  }
  Core.View.CaptchaDialog = Backbone.View.extend({"reload":function(err) {
    Recaptcha.destroy();
    create();
    $el.find(".sp-account-error").html(Mustache.render($("#sp-tpl-accountError").html(), {"error":JSON.stringify(json)}));
    $el.find(".sp-account-error").show()
  }, "remove":function() {
    Backbone.View.prototype.remove.call(this);
    Recaptcha.destroy();
    dialogEvents.off(null, null, this);
    $el.dialog("close")
  }, "render":function() {
    scope = this;
    $el.find(".sp-account-loading").hide();
    $el.find(".sp-account-error").hide();
    $el.dialog("open");
    create();
    dialogEvents.on("submit", function() {
      $el.find(".sp-account-loading").show();
      $el.find(".sp-account-error").hide();
      var challenge = Recaptcha.get_challenge(), response = Recaptcha.get_response();
      this.trigger("submit", challenge, response)
    }, this);
    dialogEvents.on("cancel", function() {
      close();
      this.trigger("fail")
    }, this);
    return this
  }})
})(sp.module("core"));
(function(Core) {
  Core.View.OpenCloudDialog = Backbone.View.extend({"template":$("#sp-tpl-openCloudDialog").html(), "initialize":function() {
    this._offset = 0;
    this._entriesPerPage = 5;
    this._mode = "my"
  }, "render":function() {
    var scope = this;
    this.$el.html(Mustache.render(this.template, {}));
    this.$el.attr("title", "Open from Cloud");
    this.$("#sp-openCloud-navigation li").hover(function() {
      $(this).addClass("ui-state-hover")
    }, function() {
      $(this).removeClass("ui-state-hover")
    });
    this.$("#sp-openCloud-navigation li").each(function(i) {
      $(this).click(function() {
        scope._offset = 0;
        scope._mode = i == 0 ? "my" : i == 1 ? "team" : "open";
        scope.$("#sp-openCloud-navigation li").each(function(j) {
          if(i == j) {
            $(this).addClass("ui-state-active")
          }else {
            $(this).removeClass("ui-state-active")
          }
        });
        scope.queryEntries()
      })
    });
    this.$el.dialog({"autoOpen":true, "width":750, "height":500, "resizable":false, "modal":true, "buttons":{"Cancel":function() {
      scope.$el.dialog("close")
    }}});
    this.queryEntries()
  }, "queryEntries":function() {
    var user = this.model.uiStatus.get("userCtx").name, scope = this, contentTemplate = $("#sp-tpl-openCloudDialogContent").html(), pendingTemplate = $("#sp-tpl-openCloudDialogPending").html(), errorTemplate = $("#sp-tpl-openCloudDialogError").html(), url, query;
    scope.$("#sp-openCloud-content").html(Mustache.render(pendingTemplate, {}));
    $.getJSON("/browse?target=" + this._mode + "&skip=" + this._offset + "&limit=" + this._entriesPerPage, function(data) {
      scope.$("#sp-openCloud-content").html(Mustache.render(contentTemplate, _.defaults(data, {"start":scope._offset, "end":scope._offset + scope._entriesPerPage})));
      scope.$("#sp-openCloud-content .sp-open-project").click(function($e) {
        var id = $($e.target).closest("tr").attr("data-id");
        scope.model.openCloud(id);
        scope.$el.dialog("close")
      });
      scope.$("#sp-openCloud-content span").has(".ui-icon-triangle-1-w").click(function() {
        scope._offset = Math.max(scope._offset - scope._entriesPerPage, 0);
        scope.queryEntries()
      });
      scope.$("#sp-openCloud-content span").has(".ui-icon-triangle-1-e").click(function() {
        scope._offset = scope._offset + scope._entriesPerPage;
        scope.queryEntries()
      })
    }).error(function() {
      scope.$("#sp-openCloud-content").html(Mustache.render(errorTemplate, {}));
      scope.$("#sp-openCloud-content .ui-state-default").click(function() {
        scope.queryEntries()
      });
      scope.$("#sp-openCloud-content .ui-state-default").hover(function() {
        $(this).addClass("ui-state-hover")
      }, function() {
        $(this).removeClass("ui-state-hover")
      })
    })
  }})
})(sp.module("core"));
(function(Core) {
  Core.View.SaveDialog = Backbone.View.extend({"tagName":"div", "template":$("#sp-tpl-dialog-save").html(), "initialize":function() {
  }, "render":function() {
    var bb = new BlobBuilder;
    bb.append(this.options.content);
    var blob = bb.getBlob("application/octet-stream");
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var view = {"data":{"url":url, "title":"Save"}, "lang":window.lang};
    this.$el.html(Mustache.render(this.template, view));
    this.$("div").dialog({"autoOpen":true, "modal":true, "width":400, "buttons":{"Ok":function() {
      $(this).dialog("close");
      (window.URL || window.webkitURL).revokeObjectURL(url)
    }}});
    return this
  }})
})(sp.module("core"));
(function(Core) {
  Core.View.SaveCloudDialog = Backbone.View.extend({"tagName":"div", "template":$("#sp-tpl-dialog-saveCloud").html(), "success":function() {
    this._done.show();
    this._loading.hide()
  }, "error":function(err) {
    this._error.html(Mustache.render($("#sp-tpl-accountError").html(), {"error":err}));
    this._error.show();
    this._loading.hide()
  }, "render":function() {
    var view = {"data":{"title":"Save"}, "lang":window.lang};
    this.$el.html(Mustache.render(this.template, view));
    this._error = this.$(".sp-account-error");
    this._loading = this.$(".sp-account-loading");
    this._done = this.$(".sp-account-done");
    this._error.hide();
    this._done.hide();
    this.$(".sp-progressIndicator").progressbar({"value":100});
    $(this.$("div")[0]).dialog({"autoOpen":true, "modal":true, "buttons":{"Hide":function() {
      $(this).dialog("close")
    }}});
    return this
  }})
})(sp.module("core"));
(function(Core) {
  var Misc = sp.module("misc");
  var Resource = sp.module("resource");
  Core.View.TextureDialog = Backbone.View.extend({"template":$("#sp-tpl-dialogTexture").html(), "initialize":function() {
  }, "render":function() {
    var scope = this;
    var view = {};
    this.$el.html(Mustache.render(this.template, view));
    var resources = this.options.resources;
    this.$el.dialog({"autoOpen":true, "width":500, "resizable":true, "buttons":{"Open File":function() {
      (new Misc.OpenFileDialog(function(files) {
        if(files.length > 0 && scope.options.success) {
          Resource.Model.Resource.fromFile(files[0], function(texture) {
            var id = resources.createID();
            texture.set("id", id);
            resources.add(texture);
            scope.options.success(id)
          }, this)
        }
        this.$el.dialog("close")
      }, scope)).show()
    }}});
    this.$el.click(function($e) {
      if($e.target.nodeName === "IMG") {
        if(scope.options.success) {
          scope.options.success($($e.target).data("id"))
        }
        scope.$el.dialog("close")
      }
    })
  }})
})(sp.module("core"));
(function(Core) {
  var Resource = sp.module("resource");
  var Object = sp.module("object");
  var Misc = sp.module("misc");
  var near = 1, far = 1E4;
  Core.View.Canvas = Backbone.View.extend({"initialize":function() {
    this.clock = new THREE.Clock(true);
    this.renderer = this.options.renderer || new THREE.WebGLRenderer({"canvas":this.el, "antialias":true});
    this.el.addEventListener("webglcontextlost", function(event) {
      console.log("context lost")
    }, false);
    this.el.addEventListener("webglcontextrestored", function(event) {
      console.log("context restored")
    });
    _.extend(this.renderer, Backbone.Events);
    this.renderer.setSize(this.$el.width(), this.$el.height());
    this.camera = this.options.camera || new THREE.PerspectiveCamera(45, 16 / 9, near, far);
    this.model.uiStatus.set("camera", this.camera);
    this.scene = this.options.scene || new THREE.Scene;
    this.sceneUI = this.options.sceneUI || new THREE.Scene;
    this._fpsCounter = 0;
    this._fpsTimer = 0;
    this.mouseX = 0, mouseY = 0;
    var controlObject = this._controlObject = new THREE.Object3D;
    this._prsntControls = new THREE.PrsntControls(controlObject);
    this._prsntControls.listen();
    controlObject.position.z = 200;
    controlObject.position.y = 500;
    controlObject.rotation.x = -Math.PI / 6;
    this._prsntControls.movementSpeed = 100;
    this._prsntControls.rollSpeed = 1;
    this.scene.add(controlObject);
    controlObject.add(this.camera);
    var light = new THREE.PointLight(16777215);
    controlObject.add(light);
    var grid = function() {
      var floorMaterial = new THREE.MeshBasicMaterial({"color":13421772});
      var floorGeometry = new THREE.PlaneGeometry(1E5, 1E5);
      var lineMaterial = new THREE.LineBasicMaterial({"color":16777215});
      var lineGeometry = new THREE.Geometry;
      lineGeometry.type = THREE.LinePieces;
      for(var i = -100;i < 100;i++) {
        lineGeometry.vertices.push(new THREE.Vector3(i * 500, 1, 1E4));
        lineGeometry.vertices.push(new THREE.Vector3(i * 500, 1, -1E4));
        lineGeometry.vertices.push(new THREE.Vector3(1E4, 1, i * 500));
        lineGeometry.vertices.push(new THREE.Vector3(-1E4, 1, i * 500))
      }
      var line = new THREE.Line(lineGeometry, lineMaterial);
      var obj = new THREE.Mesh(floorGeometry, floorMaterial);
      obj.add(line);
      return obj
    }();
    this.scene.add(grid);
    this.model.uiStatus.on("change:mode", function() {
      var mode = this.model.uiStatus.get("mode");
      if(mode == "play") {
        THREE.SceneUtils.showHierarchy(grid, false);
        this.scene.remove(this._displayedPath.obj);
        this.sceneUI.remove(this._displayedPath.uiObj)
      }else {
        THREE.SceneUtils.showHierarchy(grid, true);
        this.scene.add(this._displayedPath.obj);
        this.sceneUI.add(this._displayedPath.uiObj)
      }
    }, this);
    this.scene.fog = new THREE.Fog(16777215, 1, 1E4);
    this.model.resources.renderer = this.renderer;
    this._views = {};
    this.renderer.on("add", function(viewGL, addToScene) {
      var id;
      do {
        id = 256 * (Math.round(Math.random() * 65519) + 16)
      }while(this._views[id]);
      viewGL.id = id;
      viewGL.render();
      this._views[id] = viewGL;
      if(addToScene) {
        this.scene.add(viewGL.obj);
        this.sceneUI.add(viewGL.uiObj)
      }
    }, this);
    this.renderer.on("remove", function(viewGL) {
      this.scene.remove(viewGL.obj);
      this.sceneUI.remove(viewGL.uiObj);
      delete this._views[viewGL.id]
    }, this);
    function handleAdd(model) {
      var options = {"model":model, "resources":this.model.resources, "views":this._views, "renderer":this.renderer, "uiStatus":this.model.uiStatus, "camera":this.camera};
      if(model.constructor.type === "ImagePlane") {
        this.renderer.trigger("add", new Object.ViewGL.ImagePlane(options), true)
      }else {
        if(model.constructor.type === "Geometry") {
          this.renderer.trigger("add", new Object.ViewGL.Geometry(options), true)
        }else {
          if(model.constructor.type === "Text3D") {
            this.renderer.trigger("add", new Object.ViewGL.Text3D(options), true)
          }else {
            if(model.constructor.type === "TextPlane") {
              this.renderer.trigger("add", new Object.ViewGL.TextPlane(options), true)
            }else {
              if(model.constructor.type === "Import") {
                this.renderer.trigger("add", new Object.ViewGL.Import(options), true)
              }else {
                if(model.constructor.type === "VideoPlane") {
                  this.renderer.trigger("add", new Object.ViewGL.VideoPlane(options), true)
                }else {
                  if(model.constructor.type === "CameraPoint") {
                    this.renderer.trigger("add", new Object.ViewGL.CameraPoint(options), true)
                  }else {
                    if(model.constructor.type === "Background") {
                      this.renderer.trigger("add", new Object.ViewGL.Background(options), true)
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    this.model.objectList.on("add", handleAdd, this);
    this.model.objectList.each(handleAdd, this);
    this.model.uiStatus.on("change:mode", function() {
      var prev = this.model.uiStatus.previous("mode"), mode = this.model.uiStatus.get("mode");
      if(mode == "play" && prev != "play") {
        this._prsntControls.unlisten();
        this.model.uiStatus.set("pathTime", 0);
        this.createPath()
      }else {
        if(mode != "play" && prev == "play") {
          this._prsntControls.listen()
        }
      }
    }, this);
    var scope = this;
    this._cameraPointViewModel = null;
    this._cameraPointView = new THREE.PerspectiveCamera(45, 16 / 9, 1, 1E4);
    this._cameraPointView.eulerOrder = "YXZ";
    this.scene.add(this._cameraPointView);
    this._displayedPath = new Object.ViewGL.CameraPath({"cameraSequence":this.model.cameraSequence, "objectList":this.model.objectList});
    this.sceneUI.add(this._displayedPath.uiObj);
    this.scene.add(this._displayedPath.obj);
    function updateCameraPointView() {
      var cam = scope._cameraPointView, model = scope._cameraPointViewModel;
      cam.position.set(model.get("position/x"), model.get("position/y"), model.get("position/z"));
      cam.rotation.set(-model.get("rotation/x") * Math.PI / 180, Math.PI + model.get("rotation/y") * Math.PI / 180, 0)
    }
    this.model.objectList.on("unselect", function(model) {
      if(model.constructor.type == "CameraPoint") {
        model.off("change", updateCameraPointView, this);
        this._cameraPointViewModel = null
      }
    }, this).on("select", function(model) {
      if(model && model.constructor.type == "CameraPoint") {
        this._cameraPointViewModel = model;
        model.on("change", updateCameraPointView, this);
        updateCameraPointView.call(this)
      }
    }, this).on("focus", function(model) {
      var pos = new THREE.Vector3(model.get("position/x"), model.get("position/y"), model.get("position/z"));
      this._prsntControls.animateTo(pos, 1)
    }, this);
    Object.ViewGL.TextPlane.workaround(this.scene);
    this.renderLoop()
  }, "renderLoop":function() {
    var delta = this.clock.getDelta();
    this._fpsTimer += delta;
    this._fpsCounter++;
    if(this._fpsTimer > 1) {
      $("#sp-framerate").text((this._fpsCounter / this._fpsTimer).toFixed(2) + " FPS");
      this._fpsCounter = 0;
      this._fpsTimer = 0
    }
    this.renderer.trigger("tick");
    if(this.model.uiStatus.get("mode") == "play") {
      this._pathControls.update(this.model.uiStatus.get("pathTime"))
    }else {
      this._prsntControls.update(delta)
    }
    var width = this.$el.width(), height = this.$el.height();
    if(this.model.uiStatus.get("darken")) {
      this.renderer.setClearColorHex(0, 1);
      this.renderer.clear(true, false, false)
    }else {
      this.renderer.setClearColorHex(16777215, 1);
      this.renderer.autoClearColor = true;
      this.renderer.render(this.scene, this.camera);
      this.renderer.autoClearColor = false;
      this.renderer.render(this.sceneUI, this.camera);
      if(this._cameraPointViewModel && this.model.uiStatus.get("mode") == "edit") {
        this.renderer.enableScissorTest(true);
        this.renderer.setScissor(Math.floor(width * 2 / 3) - 1, 0, Math.ceil(width * 1 / 3) + 1, Math.floor(height * 1 / 3) + 1);
        this.renderer.setViewport(Math.floor(width * 2 / 3), 0, Math.ceil(width * 1 / 3), Math.floor(height * 1 / 3));
        this.renderer.autoClearColor = true;
        this.renderer.render(this.scene, this._cameraPointView);
        this.renderer.enableScissorTest(false);
        this.renderer.setViewport(0, 0, width, height)
      }
    }
    if(this._fpsCounter % 10 === 0 && this.model.uiStatus.get("mode") != "play" && this.$el.css("cursor") != "move") {
      var id = this.getObjectAtPosition(this.mouseX, this.mouseY);
      if(id > 0) {
        this.$el.css("cursor", "pointer")
      }else {
        this.$el.css("cursor", "default")
      }
    }
    this._requestID = requestAnimationFrame($.proxy(this.renderLoop, this))
  }, "cancelLoop":function() {
    if(this._requestID) {
      cancelAnimationFrame(this._requestID)
    }
  }, "events":{"mousedown":function($e) {
    if(this.model.uiStatus.get("mode") == "play") {
      return
    }
    var x = $e.pageX - $e.target.offsetLeft;
    var y = $e.pageY - $e.target.offsetTop;
    var id = this.getObjectAtPosition(x, y);
    this._mouseDelegate = id;
    var masked = id & 4294967040;
    if(masked > 0 && this._views[masked]) {
      this._views[masked].trigger("mousedown", Misc.EventGL.fromDOMEvent($e, this.camera, {"target":id}))
    }
    this._lastEvent = "mousedown"
  }, "mousemove":function($e) {
    if(this.model.uiStatus.get("mode") == "play") {
      return
    }
    this.mouseX = $e.pageX - $e.target.offsetLeft;
    this.mouseY = $e.pageY - $e.target.offsetTop;
    var masked = this._mouseDelegate & 4294967040;
    if(masked > 0 && this._views[masked]) {
      this.$el.css("cursor", "move");
      this._views[masked].trigger("mousemove", Misc.EventGL.fromDOMEvent($e, this.camera, {"target":this._mouseDelegate}))
    }
    this._lastEvent = "mousemove"
  }, "mouseup":function($e) {
    if(this.model.uiStatus.get("mode") == "play") {
      return
    }
    this.mouseX = $e.pageX - $e.target.offsetLeft;
    this.mouseY = $e.pageY - $e.target.offsetTop;
    var masked = this._mouseDelegate & 4294967040;
    if(masked > 0 && this._views[masked]) {
      var eventGL = Misc.EventGL.fromDOMEvent($e, this.camera, {"target":this._mouseDelegate});
      this._views[masked].trigger("mouseup", eventGL);
      if(this._lastEvent == "mousedown") {
        this._views[masked].trigger("click", eventGL)
      }
    }else {
      if(this._lastEvent == "mousedown") {
        this.model.objectList.select(null)
      }
    }
    this.$el.css("cursor", "default");
    this._mouseDelegate = 0;
    this._lastEvent = "mouseup"
  }, "mouseout":function($e) {
    if(this.model.uiStatus.get("mode") == "play") {
      return
    }
    var masked = this._mouseDelegate & 4294967040;
    if(masked > 0 && this._views[masked]) {
      var event = Misc.EventGL.fromDOMEvent($e, this.camera, {"target":this._mouseDelegate});
      this._views[masked].trigger("mouseout", event)
    }
    this.$el.css("cursor", "default");
    this._mouseDelegate = 0;
    this._lastEvent = "mouseout";
    return false
  }, "dragover":function() {
    return false
  }, "dragenter":function() {
    return false
  }, "drop":function($e) {
    if(this.model.uiStatus.get("mode") == "play") {
      return
    }
    $e.preventDefault();
    $e.stopPropagation();
    var x = $e.originalEvent.clientX - $e.target.offsetLeft;
    var y = $e.originalEvent.clientY - $e.target.offsetTop;
    var id = this.getObjectAtPosition(x, y);
    var masked = id & 4294967040;
    if(masked > 0 && this._views[masked]) {
      this._views[masked].trigger("drop", Misc.EventGL.fromDOMEvent($e, this.camera, {"target":this._mouseDelegate}))
    }else {
      var file = $e.originalEvent.dataTransfer.files[0];
      console.debug("file type: " + file.type);
      if(file.type.match(/image.*/)) {
        Resource.Model.Resource.fromFile(file, function(texture) {
          var id = this.model.resources.createID();
          texture.set("id", id);
          this.model.resources.add(texture);
          this.model.addObject("ImagePlane", {"image":id})
        }, this)
      }else {
        if(file.type.match(/video.*/)) {
          Resource.Model.Resource.fromFile(file, function(texture) {
            var id = this.model.resources.createID();
            texture.set("id", id);
            this.model.resources.add(texture);
            this.model.addObject("VideoPlane", {"video":id})
          }, this)
        }else {
          if(true || file.type == "text/plain") {
            Resource.Model.Resource.fromFile(file, function(mesh) {
              var id = this.model.resources.createID();
              mesh.set("id", id);
              this.model.resources.add(mesh);
              this.model.addObject("Import", {"geometry":id})
            }, this)
          }else {
            var reader = new FileReader, _this = this;
            reader.onload = function(e) {
              var obj = JSON.parse(e.target.result);
              if(obj._attachments && obj.objects) {
                _this.model.clear();
                _this.model.inflate(obj)
              }
            };
            reader.readAsText(file, "utf-8")
          }
        }
      }
    }
    return false
  }}, "getObjectAtPosition":function() {
    var renderTarget = new THREE.WebGLRenderTarget(1, 1), pickingMaterial = new THREE.PickingMaterial;
    renderTarget.generateMipmaps = false;
    return function(x, y) {
      var width = this.$el.width(), height = this.$el.height();
      this.scene.overrideMaterial = pickingMaterial;
      this.sceneUI.overrideMaterial = pickingMaterial;
      this.camera.setViewOffset(width, height, x, y, 1, 1);
      this.renderer.setClearColorHex(0, 1);
      this.renderer.autoClearColor = true;
      this.renderer.render(this.scene, this.camera, renderTarget);
      this.renderer.autoClearColor = false;
      this.renderer.render(this.sceneUI, this.camera, renderTarget);
      this.camera.setViewOffset(width, height, 0, 0, width, height);
      this.scene.overrideMaterial = null;
      this.sceneUI.overrideMaterial = null;
      var pixels = new Uint8Array(4);
      var gl = this.renderer.getContext();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      var id = pixels[0] << 16 | pixels[1] << 8 | pixels[2];
      return id
    }
  }(), "createPath":function() {
    var seq = this.model.cameraSequence.get("list"), points = new Array(3 * seq.length - 2), xRotations = new Array(seq.length), yRotations = new Array(seq.length);
    this.model.objectList.each(function(model) {
      if(model.constructor.type == "CameraPoint") {
        var index = seq.indexOf(model.get("id"));
        if(index >= 0) {
          var v1 = new THREE.Vector3(model.get("position/x"), model.get("position/y"), model.get("position/z"));
          weight = model.get("weight"), rot = model.get("rotation/y");
          points[3 * index] = v1;
          xRotations[index] = model.get("rotation/x");
          yRotations[index] = rot;
          if(index > 0) {
            var v0 = v1.clone();
            v0.addSelf(new THREE.Vector3(100 * weight * Math.cos(rot * Math.PI / 180), 0, 100 * -weight * Math.sin(rot * Math.PI / 180)));
            points[3 * index - 1] = v0
          }
          if(index < seq.length - 1) {
            var v2 = v1.clone();
            v2.subSelf(new THREE.Vector3(100 * weight * Math.cos(rot * Math.PI / 180), 0, 100 * -weight * Math.sin(rot * Math.PI / 180)));
            points[3 * index + 1] = v2
          }
        }
      }
    });
    this._pathControls = new THREE.CameraPathControls(this._controlObject, points, xRotations, yRotations)
  }, "resize":function() {
    this.renderer.setSize(this.$el.width(), this.$el.height())
  }})
})(sp.module("core"));
(function(Core) {
  var Misc = sp.module("misc");
  function upload(json, onFail, onSuccess, scope) {
    json.date = (new Date).getTime();
    $.ajax("/db/" + json._id, {"type":"PUT", "dataType":"json", "contentType":"application/json", "data":JSON.stringify(json)}).success(function(data) {
      scope.model.set("_rev", data.rev);
      scope.model.set("_id", data.id);
      onSuccess()
    }).fail(onFail)
  }
  Core.View.NavigationBar = Backbone.View.extend({"template":$("#sp-tpl-navbar").html(), "events":{"click #sp-navbarNew":function() {
    this.model.createNew();
    (new Core.View.PreferenceDialog({"model":this.model})).render()
  }, "click #sp-navbarOpen":function() {
    (new Misc.OpenFileDialog(function(files) {
      if(files.length <= 0) {
        return
      }
      var file = files[0];
      var reader = new FileReader, scope = this;
      reader.onload = function(e) {
        var obj = JSON.parse(e.target.result);
        if(obj && obj._attachments && obj.objects) {
          scope.model.clear();
          scope.model.inflate(obj)
        }
      };
      reader.readAsText(file, "utf-8")
    }, this)).show()
  }, "click #sp-navbarSave":function() {
    (new Core.View.SaveDialog({"content":JSON.stringify(this.model)})).render()
  }, "click #sp-navbarOpenCloud":function() {
    if(this.$("#sp-navbarOpenCloud").hasClass("ui-state-disabled")) {
      return
    }
    (new Core.View.OpenCloudDialog({"model":this.model})).render()
  }, "click #sp-navbarSaveCloudNew":function() {
    if(this.$("#sp-navbarSaveCloudNew").hasClass("ui-state-disabled")) {
      return
    }
    var dialog = (new Core.View.SaveCloudDialog).render();
    var scope = this;
    function onFail(jqXHR) {
      try {
        var json = $.parseJSON(jqXHR.responseText)
      }catch(e) {
      }
      if(json && json.error) {
        dialog.error("Unable to save (" + json.reason + ").")
      }else {
        dialog.error("Unable to save.")
      }
    }
    function onSuccess() {
      dialog.success()
    }
    $.getJSON("/uuids", function(data) {
      var id;
      if(data && data.uuids) {
        id = data.uuids[0]
      }else {
        onFail(null);
        return
      }
      var json = scope.model.toJSON();
      if(json._rev) {
        delete json._rev
      }
      json._id = id;
      json.author = scope.model.uiStatus.get("userCtx").name;
      upload(json, onFail, onSuccess, scope)
    }).fail(onFail)
  }, "click #sp-navbarSaveCloud":function() {
    if(this.$("#sp-navbarSaveCloud").hasClass("ui-state-disabled")) {
      return
    }
    var dialog = (new Core.View.SaveCloudDialog).render();
    var scope = this;
    function onFail(jqXHR) {
      try {
        var json = $.parseJSON(jqXHR.responseText)
      }catch(e) {
      }
      if(json && json.error) {
        dialog.error("Unable to save (" + json.reason + ").")
      }else {
        dialog.error("Unable to save.")
      }
    }
    function onSuccess() {
      dialog.success()
    }
    upload(scope.model.toJSON(), onFail, onSuccess, scope)
  }, "click #sp-navbarPreferences":function() {
    (new Core.View.PreferenceDialog({"model":this.model})).render()
  }, "click #sp-navbarInsertImagePlane":function() {
    this.model.objectList.select(this.model.addObject("ImagePlane").trigger("select"))
  }, "click #sp-navbarInsertGeometry":function() {
    this.model.objectList.select(this.model.addObject("Geometry").trigger("select"))
  }, "click #sp-navbarInsertText":function() {
    this.model.objectList.select(this.model.addObject("Text3D").trigger("select"))
  }, "click #sp-navbarInsertTextPlane":function() {
    this.model.objectList.select(this.model.addObject("TextPlane"))
  }, "click #sp-navbarInsertVideo":function() {
    this.model.objectList.select(this.model.addObject("VideoPlane", {"video":"assets/videos/Chrome_ImF.webm"}))
  }, "click #sp-navbarInsertCameraPoint":function() {
    var model = this.model.addObject("CameraPoint");
    model.trigger("focus", model);
    this.model.objectList.select(model)
  }, "click #sp-navbarInsertBackground":function() {
    this.model.addObject("Background")
  }, "click #sp-navbarViewScene":function() {
    this.model.uiStatus.set("mode", "edit")
  }, "click #sp-navbarViewPlay":function() {
    this.model.uiStatus.set("mode", "play")
  }, "click #sp-navbarUndo":function() {
    this.model.history.undo()
  }, "click #sp-navbarRedo":function() {
    this.model.history.redo()
  }, "click #sp-navbarHelp":function() {
    this.model.uiStatus.set("tooltips", !this.model.uiStatus.get("tooltips"))
  }}, "render":function() {
    var scope = this;
    var view = {"lang":window.lang, "config":window.config};
    this.$el.html(Mustache.render(this.template, view));
    this.$(".sp-logo img").position({"of":this.$(".sp-logo"), "at":"center center"});
    this.$(".sp-trigger").hover(function() {
      $(this).addClass("ui-state-hover")
    }, function() {
      $(this).removeClass("ui-state-hover")
    });
    $(".sp-menu").find("ul").hide();
    this.$(".sp-trigger").click(function() {
      if($(this).hasClass("ui-state-active")) {
        $(this).removeClass("ui-state-active");
        $(this).parent().find("ul").slideUp()
      }else {
        $(this).addClass("ui-state-active");
        $(this).parent().find("ul").slideDown()
      }
    });
    var scope = this;
    $(document).mouseup(function(e) {
      var elems = scope.$(".sp-trigger.ui-state-active");
      for(var i = 0;i < elems.length;i++) {
        if(!$(elems[i]).is(e.target) && $(elems[i]).has(e.target).length <= 0) {
          $(elems[i]).removeClass("ui-state-active");
          $(elems[i]).parent().find("ul").slideUp()
        }
      }
    });
    function updateUser() {
      var userCtx = this.model.uiStatus.get("userCtx");
      this.$("#sp-login-info").html(Mustache.render($("#sp-tpl-loginInfo").html(), {"user":userCtx ? userCtx.name : null}));
      if(userCtx && userCtx.name) {
        this.$("#sp-login-info a").click(function() {
          $.ajax("/session", {"type":"DELETE"}).done(function() {
            scope.model.uiStatus.set("userCtx", null)
          }).fail(function() {
            scope.model.uiStatus.trigger("error", scope.model, "Unable to logout")
          });
          return false
        })
      }else {
        this.$("#sp-login-info .sp-login").click(function() {
          (new Core.View.LoginDialog({"model":scope.model.uiStatus, "type":"login"})).render();
          return false
        });
        this.$("#sp-login-info .sp-register").click(function() {
          (new Core.View.RegisterDialog({"model":scope.model.uiStatus, "type":"login"})).render();
          return false
        })
      }
    }
    this.model.uiStatus.on("change:userCtx", function() {
      updateUser.call(this)
    }, this);
    updateUser.call(this);
    function updateCloud() {
      var id = this.model.get("_id"), users = this.model.get("users"), author = this.model.get("author"), userCtx = this.model.uiStatus.get("userCtx");
      if(!id || !userCtx || !(author == userCtx.name || users[userCtx.name] && users[userCtx.name].roles.indexOf("write") != -1)) {
        this.$("#sp-navbarSaveCloud").addClass("ui-state-disabled")
      }else {
        this.$("#sp-navbarSaveCloud").removeClass("ui-state-disabled")
      }
      if(!userCtx || !userCtx.name) {
        this.$("#sp-navbarSaveCloudNew").addClass("ui-state-disabled")
      }else {
        this.$("#sp-navbarSaveCloudNew").removeClass("ui-state-disabled")
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
        this.$el.find("#sp-progressIndicator").show()
      }else {
        this.$el.find("#sp-progressIndicator").hide()
      }
    }, this);
    this.$el.find("#sp-progressIndicator").hide();
    return this
  }})
})(sp.module("core"));
(function(Core) {
  var Object = sp.module("object");
  Core.View.PlayBar = Backbone.View.extend({"template":$("#sp-tpl-playBar").html(), "initialize":function() {
    this.model.uiStatus.on("change:mode", function() {
      if(this.model.uiStatus.get("mode") == "play") {
        var seq = this.model.cameraSequence.get("list");
        this._numCameraPoints = seq.length;
        this._cameraBreaks = new Array(this._numCameraPoints);
        this._cameraSpeeds = new Array(this._numCameraPoints);
        var scope = this;
        this.model.objectList.each(function(model) {
          if(model.constructor.type == "CameraPoint") {
            var index = seq.indexOf(model.get("id"));
            if(index >= 0) {
              scope._cameraBreaks[index] = model.get("breakpoint");
              scope._cameraSpeeds[index] = 6 - Object.Model.CameraPoint.attributes.speed.options.indexOf(model.get("speed"))
            }
          }
        })
      }
    }, this)
  }, "events":{"click a":function() {
    this.model.uiStatus.set("mode", "edit")
  }, "click #play-next":function() {
    this.next()
  }, "click #play-prev":function() {
    this.previous()
  }}, "render":function() {
    var view = {"lang":window.lang};
    this.$el.html(Mustache.render(this.template, view));
    this.$el.hover(function() {
      $(this).find("div").show()
    }, function() {
      $(this).find("div").hide("slide", {"direction":"down"})
    });
    this.$("div").position({"of":this.$el, "my":"center bottom", "at":"center bottom"});
    return this
  }, "resize":function() {
  }, "animate":function(target, initial, start) {
    this._animationTarget = target;
    initial || (initial = this.model.uiStatus.get("pathTime"));
    start || (start = (new Date).getTime());
    var s1 = this._cameraSpeeds[initial < target ? Math.floor(initial) : Math.ceil(initial) - 1], s2 = this._cameraSpeeds[initial < target ? Math.floor(initial) + 1 : Math.ceil(initial)], duration = 500 * (s1 + s2);
    var delta = (new Date).getTime() - start;
    var t = (initial < target ? 1 : -1) * delta / duration + initial, f = initial < target ? Math.min : Math.max;
    this.model.uiStatus.set("pathTime", f(t, target));
    scope = this;
    if(target > t && initial < target || target < t && initial > target) {
      this._animationFrame = requestAnimationFrame(function() {
        scope.animate(target, t, start + delta)
      })
    }else {
      this._animationFrame = 0
    }
  }, "next":function() {
    if(this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = 0;
      this.model.uiStatus.set("pathTime", Math.ceil(this.model.uiStatus.get("pathTime")))
    }else {
      var t = Math.floor(this.model.uiStatus.get("pathTime"));
      while(t + 1 < this._numCameraPoints - 1 && !this._cameraBreaks[t + 1]) {
        t++
      }
      if(t + 1 < this._numCameraPoints) {
        this.animate(t + 1)
      }
    }
  }, "previous":function() {
    if(this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = 0;
      this.model.uiStatus.set("pathTime", Math.floor(this.model.uiStatus.get("pathTime")))
    }else {
      var t = Math.ceil(this.model.uiStatus.get("pathTime"));
      while(t - 1 > 0 && !this._cameraBreaks[t - 1]) {
        t--
      }
      if(t - 1 >= 0) {
        this.animate(t - 1)
      }
    }
  }})
})(sp.module("core"));
(function(Core) {
  Misc = sp.module("misc");
  Core.View.Window = Backbone.View.extend({"el":$("#sp-container-body")[0], "template":$("#sp-body").html(), "initialize":function() {
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
        $("body").animate({"background-color":"#000"}, "slow")
      }else {
        this.$("#sp-navbar").show();
        this.$("#sp-sidebarRight").show();
        this.$("#sp-attributeList").show();
        this.$("#sp-playBar").hide();
        if(mode == "edit") {
          this.$el.find("canvas").show();
          this.$el.find("p").hide()
        }else {
          if(mode == "source") {
            this.$("p").html(JSON.stringify(this.model, null, "\t"));
            this.$("p").show();
            this.$("canvas").hide()
          }
        }
        this.layout();
        $("body").animate({"background-color":"#fff"}, "slow")
      }
    }, this);
    this.model.uiStatus.on("error", function(model, error) {
      var $div = $(Mustache.render($("#sp-tpl-errorDialog").html(), {"title":"Error", "content":error}));
      $div.dialog({"modal":true, "buttons":{"OK":function() {
        $(this).dialog("close")
      }}})
    }, this);
    this.model.uiStatus.on("change:tooltips", function() {
      console.debug("toggle");
      console.debug(this.model.uiStatus.get("tooltips"));
      if(this.model.uiStatus.get("tooltips")) {
        this.$("#sp-navbarUndo").tooltip("enable");
        this.$("#sp-navbarRedo").tooltip("enable");
        this.$("#sp-objectList #trigger-tab-1").tooltip("enable");
        this.$("#sp-objectList #trigger-tab-2").tooltip("enable");
        this.$("#sp-transform1").tooltip("enable");
        this.$("#sp-transform2").tooltip("enable");
        this.$("#sp-transform3").tooltip("enable");
        this.$("#sp-project-menu").tooltip("enable");
        this.$("#sp-navbarNew").tooltip("enable");
        this.$("#sp-navbarOpen").tooltip("enable");
        this.$("#sp-navbarSave").tooltip("enable");
        this.$("#sp-navbarOpenCloud").tooltip("enable");
        this.$("#sp-navbarSaveCloud").tooltip("enable");
        this.$("#sp-navbarSaveCloudNew").tooltip("enable");
        this.$("#sp-navbarPreferences").tooltip("enable");
        this.$("#sp-insert-menu").tooltip("enable");
        this.$("#sp-navbarInsertImagePlane").tooltip("enable");
        this.$("#sp-navbarInsertGeometry").tooltip("enable");
        this.$("#sp-navbarInsertText").tooltip("enable");
        this.$("#sp-navbarInsertTextPlane").tooltip("enable");
        this.$("#sp-navbarInsertVideo").tooltip("enable");
        this.$("#sp-navbarInsertCameraPoint").tooltip("enable");
        this.$("#sp-view-menu").tooltip("enable");
        this.$("#sp-navbarViewScene").tooltip("enable");
        this.$("#sp-navbarViewPlay").tooltip("enable");
        this.$("#sp-navbarHelp").tooltip("option", "content", "<b>Deactivate help</b>")
      }else {
        this.$("#sp-navbarUndo").tooltip("disable");
        this.$("#sp-navbarRedo").tooltip("disable");
        this.$("#sp-objectList #trigger-tab-1").tooltip("disable");
        this.$("#sp-objectList #trigger-tab-2").tooltip("disable");
        this.$("#sp-transform1").tooltip("disable");
        this.$("#sp-transform2").tooltip("disable");
        this.$("#sp-transform3").tooltip("disable");
        this.$("#sp-project-menu").tooltip("disable");
        this.$("#sp-navbarNew").tooltip("disable");
        this.$("#sp-navbarOpen").tooltip("disable");
        this.$("#sp-navbarSave").tooltip("disable");
        this.$("#sp-navbarOpenCloud").tooltip("disable");
        this.$("#sp-navbarSaveCloud").tooltip("disable");
        this.$("#sp-navbarSaveCloudNew").tooltip("disable");
        this.$("#sp-navbarPreferences").tooltip("disable");
        this.$("#sp-insert-menu").tooltip("disable");
        this.$("#sp-navbarInsertImagePlane").tooltip("disable");
        this.$("#sp-navbarInsertGeometry").tooltip("disable");
        this.$("#sp-navbarInsertText").tooltip("disable");
        this.$("#sp-navbarInsertTextPlane").tooltip("disable");
        this.$("#sp-navbarInsertVideo").tooltip("disable");
        this.$("#sp-navbarInsertCameraPoint").tooltip("disable");
        this.$("#sp-view-menu").tooltip("disable");
        this.$("#sp-navbarViewScene").tooltip("disable");
        this.$("#sp-navbarViewPlay").tooltip("disable");
        this.$("#sp-navbarHelp").tooltip("option", "content", "<b>Activate help</b>")
      }
    }, this);
    var scope = this;
    $(window).bind("beforeunload", function() {
      if(window.config["warnBeforeUnload"] && !scope.model.history.isEmpty()) {
        return"Are you sure?"
      }
    });
    $(document).bind("keydown", function($e) {
      var mode = scope.model.uiStatus.get("mode");
      var keyCode = $e.which || $e.originalEvent.keyCode;
      var shiftDown = $e.originalEvent.shiftKey;
      var ctrlDown = $e.originalEvent.ctrlKey;
      var tag = $($e.target).prop("nodeName");
      if(tag == "INPUT" || tag == "TEXTAREA") {
        if(keyCode == 116) {
          return false
        }
        return
      }
      if(mode == "play" && (keyCode == 37 || keyCode == 33)) {
        scope.playBar.previous()
      }else {
        if(mode == "play" && (keyCode == 39 || keyCode == 34)) {
          scope.playBar.next()
        }else {
          if(mode == "play" && keyCode == 190) {
            scope.model.uiStatus.set("darken", !scope.model.uiStatus.get("darken"))
          }else {
            if(keyCode == 116) {
              scope.model.uiStatus.set("mode", "play")
            }else {
              if(keyCode == 27) {
                scope.model.uiStatus.set("mode", "edit")
              }else {
                if(shiftDown && keyCode == 77) {
                  scope.model.uiStatus.set("transform", "translate")
                }else {
                  if(shiftDown && keyCode == 82) {
                    scope.model.uiStatus.set("transform", "rotate")
                  }else {
                    if(shiftDown && keyCode == 84) {
                      scope.model.uiStatus.set("transform", "scale")
                    }else {
                      if(keyCode == 46) {
                        scope.model.objectList.removeSelected()
                      }else {
                        if(ctrlDown && keyCode == 67) {
                          scope.model.copySelected()
                        }else {
                          if(ctrlDown && keyCode == 86) {
                            scope.model.pasteSelected()
                          }else {
                            if(ctrlDown && keyCode == 90) {
                              scope.model.history.undo()
                            }else {
                              if(ctrlDown && keyCode == 89) {
                                scope.model.history.redo()
                              }else {
                                return
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      return false
    });
    if(Detector.webgl) {
      this.render();
      this.layout();
      $(window).resize($.proxy(this.layout, this));
      this.model.uiStatus.trigger("change:mode")
    }else {
      this.$el.html(Mustache.render($("#sp-tpl-error-fullpage").html(), {"shortErr":"WebGL Error.", "longErr":$(Detector.getWebGLErrorMessage()).html()}))
    }
  }, "render":function() {
    var scope = this;
    this.$el.html(Mustache.render(this.template, window));
    this.navbar = (new Core.View.NavigationBar({"model":this.model, "el":this.$el.find("#sp-navbar"), "window":this})).render();
    this.playBar = (new Core.View.PlayBar({"model":this.model, "el":this.$el.find("#sp-playBar")})).render();
    this.objectList = new Core.View.ObjectList({"collection":this.model.objectList, "cameraSequence":this.model.cameraSequence, "el":this.$el.find("#sp-objectList")});
    this.canvasView = new Core.View.Canvas({"model":this.model, "el":this.$("#sp-presentation canvas")});
    this.$("#sp-transformSwitcher").buttonset();
    this.$("#sp-transform1").click(function() {
      scope.model.uiStatus.set("transform", "translate")
    });
    this.$("#sp-transform2").click(function() {
      scope.model.uiStatus.set("transform", "rotate")
    });
    this.$("#sp-transform3").click(function() {
      scope.model.uiStatus.set("transform", "scale")
    });
    function updateSwitchers() {
      var i = ["translate", "rotate", "scale"].indexOf(this.model.uiStatus.get("transform"));
      console.debug(i);
      this.$("#sp-transform1, #sp-transform2, #sp-transform3").each(function(j, el) {
        var $el = $(el);
        if(j == i) {
          $el.addClass("ui-state-active")
        }else {
          $el.removeClass("ui-state-active")
        }
      })
    }
    this.model.uiStatus.on("change:transform", updateSwitchers, this);
    updateSwitchers.call(this);
    this.model.objectList.on("unselect", function(model) {
      if(this.attributeList) {
        this.attributeList.remove()
      }
    }, this).on("select", function(model) {
      if(model) {
        this.attributeList = new Core.View.AttributeList({"resources":scope.model.resources, "model":model});
        this.$("#sp-attributeList table").append(this.attributeList.$el)
      }
    }, this);
    this.model.on("change:_id", function() {
      var id = this.model.get("_id");
      Misc.URL.setQuery("p", id)
    }, this);
    if(Misc.URL.query.p) {
      var id = Misc.URL.query.p;
      Misc.URL.setQuery("p", undefined);
      this.model.openCloud(id)
    }
    this.$("#sp-navbarUndo").tooltip({track:true});
    this.$("#sp-navbarUndo").tooltip("option", "content", "Undo last action <b>(Ctrl + Z)</b>");
    this.$("#sp-navbarUndo").tooltip("disable");
    this.$("#sp-navbarRedo").tooltip({track:true});
    this.$("#sp-navbarRedo").tooltip("option", "content", "Redo last action <b>(Ctrl + Y)</b>");
    this.$("#sp-navbarRedo").tooltip("disable");
    this.$("#sp-navbarHelp").tooltip({track:true});
    this.$("#sp-navbarHelp").tooltip("option", "content", "<b>Activate help</b> <br>" + "Many useful hints will appear which helps you get startet.");
    this.$("#sp-objectList #trigger-tab-1").tooltip({track:true});
    this.$("#sp-objectList #trigger-tab-1").tooltip("option", "content", "<b>List of all objects</b> <br>" + "Doubleclick on any object for focusing.");
    this.$("#sp-objectList #trigger-tab-1").tooltip("disable");
    this.$("#sp-objectList #trigger-tab-2").tooltip({track:true});
    this.$("#sp-objectList #trigger-tab-2").tooltip("option", "content", "<b>List of all cameras</b> <br>" + "Sort your cameras. Presentation goes as your camears appear in this list.");
    this.$("#sp-objectList #trigger-tab-2").tooltip("disable");
    this.$("#sp-transform1").tooltip({track:true});
    this.$("#sp-transform1").tooltip("option", "content", "Move object <b>(Ctrl + M)</b>");
    this.$("#sp-transform1").tooltip("disable");
    this.$("#sp-transform2").tooltip({track:true});
    this.$("#sp-transform2").tooltip("option", "content", "Rotate object <b>(Ctrl + R)</b>");
    this.$("#sp-transform2").tooltip("disable");
    this.$("#sp-transform3").tooltip({track:true});
    this.$("#sp-transform3").tooltip("option", "content", "Scale object <b>(Ctrl + T)</b>");
    this.$("#sp-transform3").tooltip("disable");
    this.$("#sp-project-menu").tooltip({track:true});
    this.$("#sp-project-menu").tooltip("option", "content", "The Projectmenu offers all kind of saving options.<br> " + "You can also edit the preferences here!");
    this.$("#sp-project-menu").tooltip("disable");
    this.$("#sp-navbarNew").tooltip({track:true});
    this.$("#sp-navbarNew").tooltip("option", "content", "<b>Create</b> a new empty <b>project</b>. By default, you create " + "a private project nobody else has access to.");
    this.$("#sp-navbarNew").tooltip("disable");
    this.$("#sp-navbarOpen").tooltip({track:true});
    this.$("#sp-navbarOpen").tooltip("option", "content", "<b>Upload</b> an existing presentation from your <b>computer</b>.");
    this.$("#sp-navbarOpen").tooltip("disable");
    this.$("#sp-navbarSave").tooltip({track:true});
    this.$("#sp-navbarSave").tooltip("option", "content", "<b>Save</b> your current presentation on your <b>computer</b>.");
    this.$("#sp-navbarSave").tooltip("disable");
    this.$("#sp-navbarOpenCloud").tooltip({track:true});
    this.$("#sp-navbarOpenCloud").tooltip("option", "content", "<b>Load</b> a presentation from the <b>cloud</b>. " + "You have access to your own presentations, presentations someone gave you access to " + "and open presentation which were made world readable.");
    this.$("#sp-navbarOpenCloud").tooltip("disable");
    this.$("#sp-navbarSaveCloud").tooltip({track:true});
    this.$("#sp-navbarSaveCloud").tooltip("option", "content", "<b>Save</b> your current presentation in the <b>cloud</b>. " + "Before saving, make sure you have set the correct read&write-permissions in the preferences. <b>Warning!</b> Even " + "if you change the presentation's name it will overwrite.");
    this.$("#sp-navbarSaveCloud").tooltip("disable");
    this.$("#sp-navbarSaveCloudNew").tooltip({track:true});
    this.$("#sp-navbarSaveCloudNew").tooltip("option", "content", "<b>Save a new version</b> of your current presentation in the " + "<b>cloud</b>. If you edit a presentation you do not have writing permission, " + "you can still save your own copy in the cloud.");
    this.$("#sp-navbarSaveCloudNew").tooltip("disable");
    this.$("#sp-navbarPreferences").tooltip({track:true});
    this.$("#sp-navbarPreferences").tooltip("option", "content", "<b>Manage your project</b>.<br>" + "Give other users the permission to watch or edit your presentation. You can even make it public.");
    this.$("#sp-navbarPreferences").tooltip("disable");
    this.$("#sp-insert-menu").tooltip({track:true});
    this.$("#sp-insert-menu").tooltip("option", "content", "Add new Objects here.");
    this.$("#sp-insert-menu").tooltip("disable");
    this.$("#sp-navbarInsertImagePlane").tooltip({track:true});
    this.$("#sp-navbarInsertImagePlane").tooltip("option", "content", "A ImagePlane-object is a <b>2D image</b>.<br>" + "After adding, select <i>change</i> under Attributes to upload a image from your computer.<br />" + "<b>Hint:</b> You can also add images by <b>drag & drop</b> from your explorer!");
    this.$("#sp-navbarInsertImagePlane").tooltip("disable");
    this.$("#sp-navbarInsertGeometry").tooltip({track:true});
    this.$("#sp-navbarInsertGeometry").tooltip("option", "content", "After adding you can change the type " + "of this <b>3D object</b> in the Attributes menu.");
    this.$("#sp-navbarInsertGeometry").tooltip("disable");
    this.$("#sp-navbarInsertText").tooltip({track:true});
    this.$("#sp-navbarInsertText").tooltip("option", "content", "This is a <b>3D textobject</b>.<br>" + "After adding you can change the text in the Attributes menu.");
    this.$("#sp-navbarInsertText").tooltip("disable");
    this.$("#sp-navbarInsertTextPlane").tooltip({track:true});
    this.$("#sp-navbarInsertTextPlane").tooltip("option", "content", "This is a <b>2D textobject</b>.<br>" + "After adding you can change the text in the Attributes menu.");
    this.$("#sp-navbarInsertTextPlane").tooltip("disable");
    this.$("#sp-navbarInsertVideo").tooltip({track:true});
    this.$("#sp-navbarInsertVideo").tooltip("option", "content", "This is a <b>2D videoobject</b>.<br>" + "After adding you can change the video in the Attributes menu.");
    this.$("#sp-navbarInsertVideo").tooltip("disable");
    this.$("#sp-navbarInsertCameraPoint").tooltip({track:true});
    this.$("#sp-navbarInsertCameraPoint").tooltip("option", "content", "This is a <b>camera</b>.<br>" + "With cameras you define your presentation - where you want to stop and look at. Or you deactivate the " + "attribute <i>breakpoint</i> and the presentation wont stop there.");
    this.$("#sp-navbarInsertCameraPoint").tooltip("disable");
    this.$("#sp-view-menu").tooltip({track:true});
    this.$("#sp-view-menu").tooltip("option", "content", "Switch between <b>presentation mode</b> " + "and <b>edit mode</b>");
    this.$("#sp-view-menu").tooltip("disable");
    this.$("#sp-navbarViewPlay").tooltip({track:true});
    this.$("#sp-navbarViewPlay").tooltip("option", "content", "Start <b>presentation</b> <br>" + "<b>Hint:</b> You can also press <b>F5</b>!");
    this.$("#sp-navbarViewPlay").tooltip("disable");
    this.$("#sp-navbarViewScene").tooltip({track:true});
    this.$("#sp-navbarViewScene").tooltip("option", "content", "Enter <b>editor</b><br>" + "<b>Hint:</b> If you are in presentation mode, press <b>ESC</b>!");
    this.$("#sp-navbarViewScene").tooltip("disable");
    return this
  }, "layout":function() {
    var availableWidth = this.model.uiStatus.get("mode") == "play" ? $(window).width() : $(window).width() - $("#sp-attributeList").outerWidth(true) - $("#sp-sidebarRight").outerWidth(true) - 30;
    var availableHeight = $(window).height() - this.$("#sp-presentation").offset().top;
    var min = Math.min(availableWidth, availableHeight * 16 / 9);
    this.canvasView.$el.width(min);
    this.canvasView.$el.height(Math.floor(min * 9 / 16));
    this.$("#sp-presentation").height(availableHeight - 2);
    this.$("#sp-objectList #tab-1, #sp-objectList #tab-2").outerHeight($(window).innerHeight() - this.$("#sp-objectList").offset().top - this.$("#sp-objectList ul").outerHeight());
    this.$("#sp-attributeList").height(availableHeight - 2);
    this.canvasView.resize();
    this.canvasView.$el.position({"of":this.$("#sp-presentation"), "my":"center center", "at":"center center"});
    this.playBar.resize();
    return this
  }})
})(sp.module("core"));

