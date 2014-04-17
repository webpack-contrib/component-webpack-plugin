/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

function ComponentPlugin(fieldBindings, lookupPaths, componentFile) {
	this.fieldBindings = fieldBindings || {};
	this.lookupPaths = lookupPaths || ["components"];
	this.componentFile = componentFile || "component.json";
	if(typeof this.fieldBindings.styles === "undefined") {
		this.fieldBindings.styles = "!" + require.resolve("style-loader") + "!" + require.resolve("css-loader") + "![file]";
	}
}
module.exports = ComponentPlugin;

ComponentPlugin.prototype.apply = function(compiler) {
	var fieldBindings = this.fieldBindings;
	var lookupPaths = this.lookupPaths;
	var componentFile = this.componentFile;
	compiler.resolvers.normal.plugin("module", function(request, finalCallback) {
		if(request.request.indexOf("/") >= 0) return finalCallback();

		function callback() {
			if(finalCallback.log) {
				finalCallback.log("resolve component " + request.request + " in " + request.path);
				logData.forEach(finalCallback.log, finalCallback);
			}
			finalCallback.apply(this, arguments);
		}
		var logData = [];
		function log(msg) {
			logData.push("  " + msg);
		}

		var fs = this.fileSystem;

		// 1. Find next component.json file and read it
		var componentPath = request.path + "/";
		var componentFileContent, componentFilePath;
		(function next() {
			var idx = componentPath.lastIndexOf("/");
			if(idx < 0) idx = componentPath.lastIndexOf("\\");
			if(idx < 0) return callback();
			componentFilePath = componentPath.substr(0, idx + 1) + componentFile;
			componentPath = componentPath.substr(0, idx);
			fs.readFile(componentFilePath, function(err, content) {
				if(err) return next.call(this);
				try {
					componentFileContent = JSON.parse(content);
				} catch(e) {
					return callback(componentFilePath + " parsing failed: " + e);
				}
				findModule.call(this);
			}.bind(this));
		}.call(this));

		// 2. get the full name for the module
		// i. e. "emitter" -> "sokra/emitter"
		function findModule() {
			var modules = componentFileContent.local ? componentFileContent.local : [];
			if(componentFileContent.dependencies) {
				modules = modules.concat(Object.keys(componentFileContent.dependencies));
			}
			if(componentFileContent.development) {
				modules = modules.concat(Object.keys(componentFileContent.development));
			}
			var fullName, requestName = request.request;
			for(var i = 0; i < modules.length; i++) {
				var name = modules[i];
				if(name.replace("/", "-") === requestName) {
					fullName = modules[i];
					break;
				}
				var idx = name.indexOf("/");
				if(idx >= 0) name = name.substr(idx+1);
				if(requestName === name) {
					fullName = modules[i];
					break;
				}
			}
			if(!fullName) {
				log(componentFilePath + " doesn't contain a dependency matching " + requestName);
				return callback();
			}
			log(componentFilePath + " contains a dependency " + fullName);
			findInDirectories.call(this, fullName);
		}

		// 3. find all lookup directories and check if the module is there
		function findInDirectories(fullName) {
			componentPath += "/";
			(function next() {
				var idx = componentPath.lastIndexOf("/");
				if(idx < 0) idx = componentPath.lastIndexOf("\\");
				if(idx < 0) return callback();
				var componentFilePath = componentPath.substr(0, idx + 1) + componentFile;
				componentPath = componentPath.substr(0, idx);
				fs.readFile(componentFilePath, function(err, content) {
					if(err) return next.call(this);
					try {
						componentFileContent = JSON.parse(content);
					} catch(e) {
						return callback(componentFilePath + " parsing failed: " + e);
					}
					var paths = componentFileContent.paths ? componentFileContent.paths : [];
					paths = paths.concat(lookupPaths);
					this.forEachBail(paths, function(path, callback) {
						var modulesFolderPath = this.join(componentPath, path);
						var modulePath = this.join(modulesFolderPath, fullName.replace(/\//g, "-"));
						fs.stat(modulePath, function(err, stat) {
							if(err || !stat) {
								log(modulePath + " doesn't exist");
								return callback();
							}
							if(!stat.isDirectory()) {
								log(modulePath + " is not a directory");
								return callback();
							}
							return callback(null, {
								path: this.join(modulePath, componentFile),
								query: request.query,
								resolved: true
							});
						}.bind(this));
					}.bind(this), function(err, result) {
						if(err) return callback(err);
						if(result) return callback(null, result);
						return next.call(this);
					}.bind(this));
				}.bind(this));
			}.call(this));
		}
	});
	compiler.plugin("normal-module-factory", function(nmf) {
		nmf.plugin("after-resolve", function(data, callback) {
			if(data.userRequest.indexOf("!") >= 0) return callback(null, data);
			if(!new RegExp("[\\\\\\/]" + escapeRegExpString(componentFile) + "$").test(data.userRequest)) return callback(null, data);
			data.loaders = [path.join(__dirname, "component-loader.js") + "?" + JSON.stringify(fieldBindings)];
			var componentName = data.resource.substr(0, data.resource.length - componentFile.length - 1);
			data.request = componentName + " component";
			data.userRequest = componentName + " (component)";
			callback(null, data);
		});
	});
};
function escapeRegExpString(str) { return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"); }
function pathToRegExp(p) { return new RegExp("^" + escapeRegExpString(p)); }
