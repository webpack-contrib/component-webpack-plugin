# component for webpack

## Usage

see an example here: [webpack/webpack/examples/component](https://github.com/webpack/webpack/tree/master/examples/component]

``` javascript
var ComponentPlugin = require("component-webpack-plugin");
module.exports = {
	plugins: [
		new ComponentPlugin();
	]
}
```

## Advanced usage

``` javascript
var ComponentPlugin = require("component-webpack-plugin");
module.exports = {
	plugins: [
		new ComponentPlugin({
			// Load coffee field in component.json
			coffee: true,
			// This is equal to: coffee: "[file]"
			
			// Load coffee field with the coffee-loader
			coffee: "!coffee-loader![file]",
			
			// This is default:
			// styles: "!style-loader!css-loader![file]"
		}, [
			// Lookup paths
			"component"
		]);
	]
}
```


## License

MIT (http://www.opensource.org/licenses/mit-license.php)