// JSON Bookmark Viewer

var app = (function () {
	"use strict";

	var drop, db, folders, bookmarks,
		current = null; // Element corresponding to the current folder

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

	var getPathUp = function(el) {
		/// <summary>
		/// Gets the path from a given node up to the root of the tree.
		/// </summary>
		/// <param type="DOM element" name="el">Clicked tree node.</param>
		/// <returns type="Array">Array of tree node ids containing the path form
		/// given node up to the root.</returns>
		var p, path = [el.data('id')];

		while (true) {
			path.push(el.data('parent'));

			p = el.parent();
			if (!p.hasClass('container')) {
				// Top of the tree
				break;
			}

			el = p.prev(); // should always exist
		}

		return path;
	};

	var findFolder = function(path) {
		/// <summary>
		/// Gets the children of the end node of given path.
		/// </summary>
		/// <param type="Array" name="path">A path in the tree [node, ... , root].</param>
		/// <returns type="Array">Contents of end node of given path.</returns>
		var folder = db.children, i, n,
			k = path.length - 2; // start one below root

		while (k >= 0) {
			n = folder.length;

			for (i = 0; i < n; i += 1) {
				if (folder[i].id == path[k]) {
					folder = folder[i].children;
					break;
				}
			}

			k -= 1;
		}

		return folder;
	};

	var findBookmarks = function(text, root) {
		/// <summary>
		/// Search all bookmark nodes of the subtree for given text.
		/// </summary>
		/// <param type="String" name="text">String to search for.</param>
		/// <param type="Object" name="root">Node to begin the search at.</param>
		/// <returns type="Array">All bookmark nodes which title or uri contain the
		/// given text.</returns>
		var items = [], c, b, i, n,
			re = new RegExp(text, 'i'),
			stack = [root]; // push root onto stack

		// Loop as long there are children on the stack (this is a
		// depth-first search of the subtree)
		while (stack.length > 0) {
			c = stack.pop();

			// Current node has children
			if (c.children) {
				n = c.children.length;

				for (i = 0; i < n; i += 1) {
					b = c.children[i];

					if (b.uri) {
						if (re.test(b.uri)) {
							items.push(b);
						} else if (b.title && re.test(b.title)) {
							items.push(b);
						}
					} else if (b.children) {
						// Push child node onto stack
						stack.push(b);
					}
				}
			}
		}

		return items;
	};

	var search = function(text) {
		/// <summary>
		/// Find all bookmarks with given text.
		/// </summary>
		/// <param type="String" name="text">String to search for.</param>
		var items = findBookmarks(text, db);

		// Show the bookmarks
		displayBookmarks(items);
	};

	var handleClick = function(el) {
		/// <summary>
		/// Handle click on a bookmarks folder to open or close the subtree.
		/// </summary>
		/// <param type="DOM element" name="el">Clicked tree node.</param>
		var folder, items, path = getPathUp(el);

		folder = findFolder(path);

		if (el.next().hasClass('container')) {
			// A subtree exists, so close folder
			items = getBookmarks(folder);
			displayBookmarks(items);

			// TODO: instead of removing elements from the DOM on folder close
			// and re-add on opening a second time, one could just hide the
			// subtree and then check if it already exists and show again...

			el.next().remove();
			el.removeClass('active');
		} else {
			// No subtree, so append folder
			items = appendFolder(el, folder, path.length - 1);
			displayBookmarks(items);
		}

		if (current) {
			// Remove current selection
			current.removeClass('selected');
		}

		// Update selection
		el.addClass('selected');
		current = el;
	};

	var countSubFolders = function(folder) {
		/// <summary>
		/// Count the subfolders of given folder.
		/// </summary>
		/// <param type="Object" name="folder">A bookmarks folder.</param>
		var i, n, count = 0, uris = 0, children = folder.children;

		if (!children) {
			return 0;
		}

		n = children.length;

		for (i = 0; i < n; i += 1) {
			if (children[i].children) {
				count++;
			} else if (children[i].uri) {
				uris++;
			}
		}
		return count;
	};

	var getBookmarks = function(children) {
		/// <summary>
		/// Get bookmarks in given collection.
		/// </summary>
		/// <param type="Array" name="children">The children contained in
		/// current folder.</param>
		var i, n = children.length, items = [], b;

		for (i = 0; i < n; i += 1) {
			b = children[i];

			if (b.uri) {
				items.push(b);
			}
		}

		return items;
	};

	var displayBookmarks = function(items) {
		/// <summary>
		/// Display bookmarks of current folder.
		/// </summary>
		/// <param type="Array" name="items">Bookmarks of current folder.</param>
		var i, n = items.length, b, ul = $('<ul>'), li, link;
		
		for (i = 0; i < n; i += 1) {
			b = items[i];

			link = $('<div class="uri"></div>');
			link.append($('<a href="' + b.uri + '">' + b.uri + '</a>'));

			li = $('<li class="bookmark"></li>');
			li.append($('<div class="title">' + b.title + '</div>'));
			li.append(link);
			ul.append(li);
		}

		bookmarks.find('ul').remove();
		bookmarks.append(ul);
	};

	var appendFolder = function(parent, children, level) {
		/// <summary>
		/// Display the next level of folders.
		/// </summary>
		/// <param type="DOM element" name="parent">Clicked node.</param>
		/// <param type="Array" name="children">Subfolders of current folder.</param>
		/// <param type="Integer" name="level">Level of current folder (depth of path
		/// in the tree).</param>
		/// <returns type="Array">Bookmarks in current folder.</returns>
		var el, b, i, n = children.length, sub,
			container, items = [];
		
		// Create a new container node for folder.
		container = $('<div class="container L'+ level +'">');

		for (i = 0; i < n; i += 1) {
			b = children[i];

			if (b.uri) {
				// Child is a bookmark
				items.push(b);
			} else if (b.title != "") {
				// Child is a folder
				sub = countSubFolders(b);

				// Create new folder element
				el = $('<div class="folder">' + b.title + '</div>');
				el.data('id', b.id);
				el.data('parent', b.parent);
				el.data('count', sub);

				if (sub > 0) {
					el.append('<span class="count">' + sub + '</span>');
				} else {
					el.addClass('empty');
				}

				container.append(el);
			}
		}

		// Set parent to active and append subfolders.
		if (parent.data('count') != 0) {
			parent.addClass('active');
			parent.after(container);
		}

		return items;
	};

	var loadRoot = function() {
		/// <summary>
		/// Display all folders of the tree root.
		/// </summary>
		var children, i, n, sub, el, b;

		// Check Firefox bookmarks format
		if (!(db.id == 1 && db.root)) {
			showError("Error: somethings wrong with the JSON file.");
			return;
		}

		children = db.children;
		n = children.length;

		for (i = 0; i < n; i += 1) {
			b = children[i];
			sub = countSubFolders(b);

			el = $('<div class="folder">' + b.title + '</div>');
			el.data('id', b.id);
			el.data('parent', b.parent);
			el.data('count', sub);

			if (sub > 0) {
				el.append('<span class="count">' + sub + '</span>');
			}

			folders.append(el);
		}

	};

	var loadBookmarksCallback = function(json) {
		/// <summary>
		/// Callback for loading functions (local file reader or ajax).
		/// </summary>
		/// <param type="JSON object" name="json">Bookmarks in JSON format.</param>
		db = json;

		// Clear lists
		folders.empty();
		bookmarks.find('ul').remove();

		loadRoot();
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


	var toggleAbout = function() {
		var left, top, about = $('#about');

		if (!about.is(':visible')) {
			left = ($(document).width() - about.width()) / 2;
			top = ($(document).height() - 40 - about.height()) / 2;

			about.css('left', left + 'px');
			about.css('top', top + 'px');
		}

		$('#about').toggle();
	};

	var toggleSearch = function() {
		var search = $('#search');

		search.toggle();
		
		if (search.is(':visible')) {
			search.find('input').focus();
		}
	};

	var showError = function(message) {
		if (message) {
			var el = $('#error');
			el.text(message);
			el.show();
		}
	};

	var resize = function() {
		var h = $(document).height() - $('#header').height() - 20;

		folders.height(h);
		bookmarks.height(h);
    };

	var init = function(url) {

		folders = $('#folders');
		bookmarks = $('#bookmarks');

		resize();

		// Delegate click event on folders
		folders.on('click', '.folder', function(ev) {
			handleClick($(ev.currentTarget));
		});

		// Toggle search box
		$('a.search').click(function(e) {
			toggleSearch();
			e.preventDefault();
		});

		// Toggle about box
		$('a.about').click(function(e) {
			toggleAbout();
			e.preventDefault();
		});

		// Close about box
		$('#about .close').click(function(e) {
			$('#about').hide();
			e.preventDefault();
		});
		
		// Search box key bindings
		$('#search input').keyup(function(e) {
			if (e.keyCode === 13) { // Enter
				var text = $('#search input').val();
				if (text !== '') {
					search(text);
				}
			} else if (e.keyCode === 27) { // Esc
				toggleSearch();
			}
		});

		// Close any error message on click
		$('body').click(function(e) {
			$('#error').hide('fast');
		});

		// Enable dropping JSON mesh files
		if (window.File && window.FileReader) {
			// File API supported
			drop = new DropTarget('body', function(files) {
				loadBookmarksLocal(files);
			});
		}

		if (url) { // Load bookmarks file
			loadBookmarksAjax(url);
		}
	};

	return {
		init: init
	};
})();