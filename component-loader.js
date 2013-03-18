/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
module.exports = function(source) {
	this.cacheable();
	var content = JSON.parse(source);
	var main = content.main || "index.js";
	var fieldBindings = JSON.parse(this.query.substr(1));
	var result = [];
	Object.keys(fieldBindings).forEach(function(fieldBinding) {
		var binding = fieldBindings[fieldBinding];
		if(Array.isArray(content[fieldBinding])) {
			content[fieldBinding].forEach(function(item) {
				result.push("require(" + JSON.stringify(binding.replace(/\[file\]/g, "./" + item)) + ");");
			});
		}
	});
	result.push("module.exports = require(" + JSON.stringify("./" + main) + ");");
	return result.join("\n");
};