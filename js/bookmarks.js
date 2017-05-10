;(function(exports) {

	"use strict";
	
	var drop, db, folders, listview, jsp,
		current = null; // Element corresponding to the current folder

	if (!Array.prototype.clone) {
		Array.prototype.clone = function() {
			return this.slice(0);
		};
	}

	var handleClick = function(el) {
		/// <summary>
		/// Handle click on a bookmarks folder to open or close the subtree.
		/// </summary>
		/// <param type="DOM element" name="el">Clicked tree node.</param>
		var folder, items, i, n, ul, path = el.data("path");

		folder = db.getFolder(path);

		if (el.next().hasClass('container')) {
			// A subtree exists, so close folder
			el.next().remove();
			el.removeClass('active');

			// TODO: instead of removing elements from the DOM on folder close
			// and re-add on opening a second time, one could just hide the
			// subtree and then check if it already exists and show again...
		} else {
			// No subtree, so append folder
			appendFolder(el, folder.folders, path.length);
		}

		ul = $('<ul>');
		createBookmarks(ul, folder.bookmarks);
		listview.empty().append(ul);

		if (current) {
			// Remove current selection
			current.removeClass('selected');
		}

		// Set path information
		updatePath($("#path"), folder.path);

		// Update selection
		el.addClass('selected');
		current = el;
	};

	var updatePath = function(el, path) {
		var ul, i, n = path.length;

		if (n > 0) {
			el.empty();
			for (i = 0; i < n; i += 1) {
				el.append('<li class="item">' + path[i] + '</li>');
			}
		}
	};

	var createBookmarks = function(container, items) {
		/// <summary>
		/// Display bookmarks of current folder.
		/// </summary>
		/// <param type="Array" name="items">Bookmarks of current folder.</param>
		var i, n = items.length, b, li, link;
		
		for (i = 0; i < n; i += 1) {
			b = items[i];

			link = $('<div class="uri"></div>');
			link.append($('<a href="' + b.uri + '">' + b.uri + '</a>'));

			li = $('<li class="bookmark"></li>');
			li.append($('<div class="title">' + b.title + '</div>'));
			li.append(link);

			container.append(li);
		}
	};

	var appendFolder = function(parent, folders, level) {
		/// <summary>
		/// Display the next level of folders.
		/// </summary>
		/// <param type="DOM element" name="parent">Clicked node.</param>
		/// <param type="Array" name="children">Subfolders of current folder.</param>
		/// <param type="Integer" name="level">Level of current folder (depth of path
		/// in the tree).</param>
		/// <returns type="Array">Bookmarks in current folder.</returns>
		var el, i, count, n = folders.length, container, item;
		
		// Create a new container node for folder.
		container = $('<div class="container L'+ level +'">');

		for (i = 0; i < n; i += 1) {
			item = folders[i];

			// Create new folder element
			el = $('<div class="folder">' + item.title + '</div>');
			el.data('path', item.path);

			count = item.count;

			if (count.bookmarks > 0) {
				el.append('<span class="count">' + count.bookmarks + '</span>');
			}
			
			if (count.folders === 0) {
				el.addClass('empty');
			}

			container.append(el);
		}

		// Set parent to active and append subfolders.
		parent.addClass('active');
		parent.after(container);
	};

	var loadRoot = function(json) {
		/// <summary>
		/// Display all folders of the tree root.
		/// </summary>
		var i, n, el, folder, items, count;

		// Check Firefox bookmarks format
		if (MozBookmarks.validate(json)) {
			db = new MozBookmarks(json);
		} else if (WebKitBookmarks.validate(json)) {
			db = new WebKitBookmarks(json);
		} else {
			showError("Unknown JSON format");
			return;
		}

		items = db.getRoot();
		n = items.length;

		for (i = 0; i < n; i += 1) {
			folder = items[i];

			el = $('<div class="folder">' + folder.title + '</div>');
			el.data('path', folder.path);

			count = folder.count;

			if (count.bookmarks > 0) {
				el.append('<span class="count">' + count.bookmarks + '</span>');
			}
			
			if (count.folders === 0) {
				el.addClass('empty');
			}

			folders.append(el);
		}
	};

	var loadBookmarksCallback = function(json) {
		/// <summary>
		/// Callback for loading functions (local file reader or ajax).
		/// </summary>
		/// <param type="JSON object" name="json">Bookmarks in JSON format.</param>

		// Clear lists
		folders.empty();
		listview.find('ul').remove();

		loadRoot(json);

		jsp.reinitialise();
	};
	
	var loadBookmarksAjax = function(url) {
		/// <summary>
		/// Load JSON from given url.
		/// </summary>
		/// <param type="String" name="url">Url to load.</param>
		$.getJSON(url, function(json) {
			loadBookmarksCallback(json);
		}).error(function() {
			showError("Error loading JSON from url.");
		});
	};

	var loadBookmarksLocal = function(files) {
		/// <summary>
		/// Load JSON from local file.
		/// </summary>
		/// <param type="Array" name="files">List of files (dropped onto browser
		/// window).</param>
		var file, reader = new FileReader();
		reader.onloadend = function(ev) {
			try {
				loadBookmarksCallback(JSON.parse(this.result));
			} catch(ex) {
				showError("Error loading local JSON file.");
			}
		};

		file = files[0];

		if (!file || !file.name) {
			return;
		}

		if (file.name.substr(file.name.lastIndexOf('.') + 1) == 'json') {
			reader.readAsText(file);
		} else {
			showError("Error loading file (only JSON supported).");
		}
	};

	var showError = function(message) {
		if (message) {
			var el = $('#error');
			el.text(message);
			el.show();
		}
	};

	var search = function(text) {
		var i, n, folder, ul, result;

		if (text.length < 1) {
			return;
		}

		listview.empty();
		result = db.search(text);

		if (result.count === 0) {
			return;
		}

		updatePath($("#path"), ["Search Results"]);

		ul = $('<ul>');
		n = result.folders.length;
		for (i = 0; i < n; i += 1) {
			folder = result.folders[i];
			createBookmarks(ul, folder.items, folder.path); // TODO: visualize folder path
		}
		listview.append(ul);
		
		//listview.unhighlight()
		//listview.highlight(text);
	};

	var init = function(url) {
		folders = $('#folders');
		listview = $('.listview');

		jsp = $('.scroll-container').jScrollPane({
			maintainPosition: true
		}).data('jsp');

		// Delegate click event on folders
		folders.on('click', '.folder', function(ev) {
			handleClick($(ev.currentTarget));
			jsp.reinitialise();
		});

		// Search box key bindings
		$('input.search').keyup(function(e) {
			if (e.keyCode === 13) { // Enter
				var text = $(this).val();
				if (text !== '') {
					search(text);
				}
			}
		});

		// Close any error message on click
		$('body').click(function(e) {
			$('#error').hide('fast');
		});

		// Enable dropping JSON mesh files
		if (window.File && window.FileReader) {
			// File API supported
			new DropTarget('body', function(files) {
				loadBookmarksLocal(files);
			});
		}

		if (url) { // Load bookmarks file
			loadBookmarksAjax(url);
		}
	};

	var app = {
		init: init
	};
	exports.app = app;

}(typeof exports === 'object' && exports || this));