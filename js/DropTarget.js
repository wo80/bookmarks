;(function(exports) {
	"use strict";

	function DropTarget(selector, callback) {
		/// <summary>
		/// Helper class for handling dropping of files onto the
		/// browser window.
		/// </summary>
		var el = document.querySelector(selector);

		this.dummy = function(e) {
			e.stopPropagation();
			e.preventDefault();
		};

		this.drop = function(e) {
			e.stopPropagation();
			e.preventDefault();

			callback(e.dataTransfer.files, e);
		};

		el.addEventListener('dragenter', this.dummy, false);
		el.addEventListener('dragover', this.dummy, false);
		el.addEventListener('dragleave', this.dummy, false);
		el.addEventListener('drop', this.drop, false);
	}

	exports.DropTarget = DropTarget;

}(typeof exports === 'object' && exports || this));