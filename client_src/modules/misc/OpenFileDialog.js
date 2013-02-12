/**
 * Opens a 'open file' dialog and returns selected file to callback.
 */
(function(Misc) {
	
	Misc.OpenFileDialog = function(callback, context) {
		this.callback = callback;
		this.context = context || this;
	};
	
	Misc.OpenFileDialog.prototype = {
		"show" : function() {
			var $el = $("<input type=\"file\">"),
			scope = this;
			$el.change(function() {
				if(scope.callback) {
					scope.callback.call(scope.context, $el[0].files);
				}
			});
			$el.click();
		}
	};
	
}(sp.module("misc")));