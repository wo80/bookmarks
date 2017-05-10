;(function(exports) {
	"use strict";


	// WebKit uses a few special root folders, which need to be mapped manually
	//
	// [0]	roots.bookmark_bar
	// [1]	roots.custom_root.userRoot
	// [2]	roots.other
	//
	// Ignore:
	// [3]	roots.custom_root.shared
	// [4]	roots.custom_root.unsorted
	// [5]	roots.synced
	// [6]	roots.trash
	//
	// Ignore: roots.custom_root.userRoot._reading_list_

	var findFolder = function(data, path) {
		var i, k, n = path.length, folder, o, p = [];

		// Special root folder mapping
		if (path[0] === 0) {
			o = data.roots.bookmark_bar;
		} else if (path[0] === 1) {
			o = data.roots.custom_root.userRoot;
		} else if (path[0] === 2) {
			o = data.roots.other;
		} else {
			throw new Error("Invalid path: unsupported root mapping");
		}

		folder = o.children;
		p.push(o.name);

		if (path.length > 1) {
			for (i = 1; i < n; i += 1) {
				k = path[i];
				p.push(folder[k].name);
				folder = folder[k].children;
				if (!folder) {
					throw new Error("Invalid path: element has no children");
				}
			}
		}

		return { content: folder, path: p };
	};

	var WebKitBookmarks = function(json) {
		this.data = json;
	};

	WebKitBookmarks.prototype = {
		isBookmark: function(obj) {
			return (obj.type && obj.type === "url");
		},
		isFolder: function(obj) {
			return (obj.type && obj.type === "folder");
		},
		isSeperator: function(obj) {
			return false;
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
			// Get top level folders (see special path mapping).
			var o, sub = [], roots = this.data.roots;

			o = roots.bookmark_bar;
			if (o) {
				sub.push({ title: o.name, path: [0], count: this.countItems(o) });
			}

			/* No longer used in latest Chrome versions? */
			if (roots.custom_root) {
				o = roots.custom_root.userRoot
				if (o) {
					sub.push({ title: o.name, path: [1], count: this.countItems(o) });
				}
			}

			o = roots.other;
			if (o) {
				sub.push({ title: o.name, path: [2], count: this.countItems(o) });
			}

			return sub;
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
						title: o.name,
						uri: o.url
					});
				} else if (this.isFolder(o)) {
					if (o.name === "_reading_list_") {
						continue;
					}
					p = path.clone();
					p.push(i);

					sub.push({
						title: o.name,
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
			return { count: 0 }; // not implemented
		}
	};

	WebKitBookmarks.validate = function(data) {
		return data.checksum && data.roots && data.version === 1;
	};

	exports.WebKitBookmarks = WebKitBookmarks;
	
}(typeof exports === 'object' && exports || this));