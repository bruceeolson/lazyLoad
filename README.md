# bgLazyLoad.jquery.js

This jQuery plugin enables lazy-loading of DOM nodes.

The basic idea is that a lazy load event is triggered when pre-defined DOM elements approach the viewport as a user scrolls the page.

## Example

Let's consider the following html in your page:

	<body>
		<div class="lazyNodes">
			<div class="lazyNode">Here is the first lazy node</div>
		</div>
	</body>
	
As the .lazyNode approaches the bottom of the viewport additional nodes are added to the .lazyNodes container.
	 
We instantiate a lazyLoad object as follows:

    // instantiate a lazyLoad object
    var lazyObject = new bgLazyLoad({
              name : 'lazyNode',
              foldDistance : 20,
              fn : function (node) {  
                var   $node = $(node)
					, $container = $node.parent()
					, index = $container.find('.lazyNode').length+1
					, $newNode = $('<div class="lazyNode">Here is node #'+index+'</div>')
					;
				$newNode.appendTo($container);
				lazyObject.lazyload();
            }
      });
  
The **name** field refers to the class lazyNode in the sample html.

The **foldDistance** field determines when to trigger the load function.  In this case the function is triggered when a lazyNode comes within 20px of the viewport.

The **fn** field defines a function that is executed on a lazy load event.

The lazy load event passes a node parameter to the function we defined.  This is the node that is approaching the viewport causing the lazy load event to fire.  Our function adds another .lazyNode and reinitializes the lazyObject.

To activate our lazyLoad object after the DOM is ready we use the following:

	$(function() { lazyObject.lazyload(); });
	
Here is the entire example:

```
	<html>
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
			<title>bgLazyLoad Example</title>
		
			<style>
			.lazyNode { height: 100px; padding:40px; border: 1px solid #ddd; margin: 20px;}
			</style>
		
			<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js" type="text/javascript"></script>
			<script src="lazyLoad.jquery.js" type="text/javascript"></script>
			<script>
			
			// instantiate a lazyLoad object
			var lazyObject = new bgLazyLoad({
					  name : 'lazyNode',
					  foldDistance : 20,
					  fn : function (node) {  
						var   $node = $(node)
							, $container = $node.parent()
							, index = $container.find('.lazyNode').length+1
							, $newNode = $('<div class="lazyNode">Here is node #'+index+'</div>')
							;
						$newNode.appendTo($container);
						lazyObject.lazyload();
					}
			  });
			
			// turn on lazy load when document ready
			$(function() { lazyObject.lazyload(); });
			</script>
		</head>
		
		<body>
			<h2>This page dynamically adds nodes</h2>
			<div>
				<div class="lazyNode">Here is the first lazy node</div>
			</div>
		</body>
	</html>
```

## Notes

If you dynamically insert lazy nodes into your DOM AFTER activating your lazy load object then you will need to execute lazyload() again so that it can can pick them up as is demonstrated in the example.  (e.g. `lazyObject.lazyload()`)

## Credits
The mkLazyLoad plugin is derived from the responsive image loader (riloadr) plugin [Riloadr](https://github.com/tubalmartin/riloadr#readme)
