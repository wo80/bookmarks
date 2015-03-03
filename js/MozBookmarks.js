;(function(exports) {
	"use strict";

	// Search all bookmark nodes of the subtree for given text.
	// @param (type="String" name="text") String to search for.
	// @param (type="Object" name="root") Node to begin the search at.
	// @returns (type="Array") All bookmark nodes which title or uri contain the given text.
	var findBookmarks = function(text, root) {
		var b, c, f, i, k = 0, n, s, items, o = [], path = [],
			regex = new RegExp(text, 'i'),
			stack = [{ folder: root, level: 0 }]; // push root onto stack

		// Loop as long there are children on the stack (this is a
		// depth-first search of the subtree)
		while (stack.length > 0) {
			c = stack.pop();
			f = c.folder;

			// Current node has children
			if (f.children) {
				n = f.children.length;

				path.length = c.level;
				path.push(f.title);

				items = [];

				for (i = 0; i < n; i += 1) {
					b = f.children[i];
					s = b.title || "";

					if (b.uri) {
						if (regex.test(s) || regex.test(b.uri)) {
							items.push({ title: s, uri: b.uri });
						}
					} else if (b.children) {
						// Push child node onto stack
						stack.push({ folder: b, level: c.level + 1 });
					}
				}

				if (items.length > 0) {
					k += items.length;
					o.push({ items: items, path: path.clone() });
				}
			}
		}

		return { count: k, folders: o };
	};

	// Gets the children of the end node of given path.
	var findFolder = function(data, path) {
		var i, k, n = path.length, folder = data.children, p = [];

		if (path.length > 0) {
			for (i = 0; i < n; i += 1) {
				k = path[i];
				p.push(folder[k].title);
				folder = folder[k].children;
				if (!folder) {
					throw new Error("Invalid path: element has no children");
				}
			}
		}

		return { content: folder, path: p };
	};

	var MozBookmarks = function(json) {
		this.data = json;
	};

	MozBookmarks.prototype = {
		isBookmark: function(obj) {
			return (obj.title && obj.uri);
		},
		isFolder: function(obj) {
			return (obj.title && obj.children);
		},
		isSeperator: function(obj) {
			return (obj.type && obj.type === "text/x-moz-place-separator");
		},
		countItems: function(folder) {
			var i, n, cb = 0, cf = 0, children = folder.children;
			
			n = children.length;

			for (i = 0; i < n; i += 1) {
				if (this.isBookmark(children[i])) {
					cb += 1;
				} else if (this.isFolder(children[i])) {
					cf += 1;
				}
			}

			return { bookmarks: cb, folders: cf };
		},
		getRoot: function() {
			return this.getFolder([]).folders;
		},
		getFolder: function(path) {
			var i, n, o, p, items, sub = [], bmk = [],
				folder = findFolder(this.data, path);

			items = folder.content;
			n = items.length;

			for (i = 0; i < n; i += 1) {
				o = items[i];

				if (this.isBookmark(o)) {
					bmk.push({
						title: o.title,
						uri: o.uri
					});
				} else if (this.isFolder(o)) {
					p = path.clone();
					p.push(i);

					sub.push({
						title: o.title,
						path: p,
						count: this.countItems(o)
					});
				}
			}

			return {
				folders: sub,
				bookmarks: bmk,
				path: folder.path
			};
		},
		search: function(text) {
			return findBookmarks(text, this.data);
		}
	};

	MozBookmarks.validate = function(data) {
		return data.guid && data.root === "placesRoot" && data.id === 1;
	};

	exports.MozBookmarks = MozBookmarks;

}(typeof exports === 'object' && exports || this));