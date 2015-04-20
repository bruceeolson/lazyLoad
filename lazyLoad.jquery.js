/*!
* Thanks to codebase from Riloadr.js 1.3.2 (c) 2012 Tubal Martin - MIT license
*
* Riloadr.js was modified to become an extensible lazy load plugin.
* The mkLazyLoad object must be instantiated with a function, fn.  When a DOM node is within foldDistance pixels of the active viewport
* fn is called.  The html returned by fn overwrites the innerHtml of node.

Notice that the node is passed as a parameter to fn.

Example:

	The page has lots of nodes that looks like this:
	<div class="mk-miniPoster" data-json='{"caseNumber":"1234567","seqNum":1,"orgPrefix":"NCMEC"}'></div>
	
For this example, the nodes have a data-json attribute that is referenced by the user defined fn.
	
		
	// instantiate a mkLazyLoad object when jQuery is ready
	$(function() {
		
		var miniPoster = new mkLazyLoad({
			name : 'mk-miniPoster',
			foldDistance : 100,
			fn : function (node) {
					$(node).html('<p>'+$(node).data('json').toSource()+'</p>');
				}
			});
			
	})
			
	// now run it
	miniPoster.lazyload();
	
	As .mk-miniPoster nodes approach the bottom of the viewport the fn will be fired

*/
!function(definition) {
    if (typeof define === 'function' && define.amd) {
        // Register as an AMD module.
        define(['jquery'], definition);
    } else {
        // Browser globals
        window.bgLazyLoad = definition(jQuery);
    }
}(function($) {
    
    'use strict';
    
    var ON = 'on'
      , TRUE = !0
      , FALSE = !1
      , DELAY = 250
      , NULL = null
      , LOAD = 'load'
      , CALL = 'call'
      , APPLY = 'apply'
      , ERROR = 'error'
      , EMPTYSTRING = ''
      , LENGTH = 'length'
      , SCROLL = 'scroll'
      , RESIZE = 'resize'
      , ONLOAD = ON+LOAD
      , ONERROR = ON+ERROR
      , RETRIES = 'retries'
      , COMPLETE = 'complete'
      , RILOADED = 'riloaded'
      , FALLBACK = 'fallback'
      , CLASSNAME = 'className'
      , PROTOTYPE = 'prototype'
      , ONCOMPLETE = ON+COMPLETE
      , LOADIMAGES = 'loadImages'
      , ORIENTATION = 'orientation'
      , EVENTLISTENER = 'EventListener'
      , ADDEVENTLISTENER = 'add'+EVENTLISTENER
      , ORIENTATIONCHANGE = ORIENTATION+'change'
      
      , $win, body
      , win = window
      , doc = win.document
      , docElm = doc.documentElement
      , setTimeout = win.setTimeout
      
        // Event model
      , w3c = ADDEVENTLISTENER in doc
      , pre = w3c ? EMPTYSTRING : ON
      , add = w3c ? ADDEVENTLISTENER : 'attachEvent'
      , rem = w3c ? 'remove'+EVENTLISTENER : 'detachEvent'

        // REGEXPS
      , QUESTION_MARK_REGEX = /\?/
      
        // Feature support
      , orientationSupported = ORIENTATION in win && ON+ORIENTATIONCHANGE in win
      
        // Screen info
      , viewportWidth
      , screenWidth = win.screen.width
      , devicePixelRatio = win.devicePixelRatio || 1
      
        // Bandwidth info (bool)
      , hasLowBandwidth = hasLowBandwidth()

        // Other uninitialized vars
      , lastOrientation;
      
    
    // Remove "no-js" class from <html> element, if it exists:
    docElm[CLASSNAME] = docElm[CLASSNAME].replace(/(^|\s)no-js(\s|$)/, '$1$2');
    
    
    /*
* Constructor: Riloadr
* Creates a Riloadr object
* Parameters:
* options - Object containing configuration options
*/
    function NodeLoader(options) {
        
        // PRIVATE PROPERTIES
        // ------------------
        
        var instance = this
            
            // Base path
          , base = options.base || EMPTYSTRING
                        
            // Group name: a name to identify images that must be processed by Riloadr.
            // Specified in the 'class' attribute of 'img' tags.
          , className = options.name || 'lazyload'
          , classNameRegexp = new RegExp('(^|\\s)'+className+'(\\s|$)')
        
            // Defer load: disabled by default, if enabled falls back to "load".
            // Possible values: 'belowfold' & 'load'.
          //, deferMode = options.defer && (options.defer).toLowerCase() || FALSE
          , deferMode = 'belowfold'

            // Setting foldDistance to n causes image to load n pixels before it is visible.
            // Falls back to 100px
          , foldDistance = options.foldDistance || 100

            // Set to true to deliver Hi-Res images despite connection speed.
            // Defaults to false, meaning connection speed is not ignored so
            // Hi-Res images will only be requested if connection speed is fast enough.
          , ignoreLowBandwidth = options.ignoreLowBandwidth || FALSE
          
            // # of times to retry to load an image if initial loading failed.
            // Falls back to 0 (no retries)
          , retries = options[RETRIES] || 0
          
            // Id of a DOM node where Riloadr must look for 'responsive' images.
            // Falls back to body if not set.
          , root = options.root || NULL
            
            // 'belowfold' defer mode?
          , belowfoldEnabled = deferMode === 'belowfold'
          
            // Reduce by 5.5x the # of times loadImages is called when scrolling
          , scrollListener = belowfoldEnabled && throttle(function() {
                instance[LOADIMAGES]();
            }, DELAY)

            // Reduce to 1 the # of times loadImages is called when resizing
          , resizeListener = belowfoldEnabled && debounce(function() {
                instance[LOADIMAGES]();
            }, DELAY)

            // Reduce to 1 the # of times loadImages is called when orientation changes.
          , orientationchangeListener = belowfoldEnabled && debounce(function(){
                if (win[ORIENTATION] !== lastOrientation) {
                    lastOrientation = win[ORIENTATION];
                    instance[LOADIMAGES]();
                }
            }, DELAY)

            // Static list (array) of images.
          , images = []

            // # of images not completely loaded
          , imagesPendingLoad = 0
		  
		  , lazyloadFn = options.fn || function(node) { return '<p>Something to load</p>';};
            
        
        // PRIVATE METHODS
        // ---------------
        
        /*
* Adds event listeners if defer mode is 'belowfold'
* React on scroll, resize and orientationchange events
*/
        function addBelowfoldListeners() {
            addEvent(win, SCROLL, scrollListener);
            addEvent(win, RESIZE, resizeListener);

            // Is orientationchange event supported? If so, let's try to avoid false
            // positives by checking if win.orientation has actually changed.
            if (orientationSupported) {
                lastOrientation = win[ORIENTATION];
                addEvent(win, ORIENTATIONCHANGE, orientationchangeListener);
            }
        }


        /*
* Removes event listeners if defer mode is 'belowfold'
*/
        function removeBelowfoldListeners() {
            removeEvent(win, SCROLL, scrollListener);
            removeEvent(win, RESIZE, resizeListener);

            // Is orientationchange event supported? If so, remove the listener
            orientationSupported && removeEvent(win, ORIENTATIONCHANGE, orientationchangeListener);
        }
        
        
        /*
* Loads an image.
*/
        function loadImage(img, idx) {
                    					
            // run the lazy load fn		
			lazyloadFn(img)
			            
            // Reduce the images array for shorter loops
            images.splice(idx, 1);
        }
		        
        
 
        // PUBLIC PRIVILEGED METHODS
        // -------------------------
               
        /*
* Collects and loads all 'responsive' images from the DOM node specified.
* If no DOM node is specified, it falls back to body.
* Notes:
* - Friendly with other scripts running.
* - Must be publicly accesible but should not be called directly.
*/
        instance[LOADIMAGES] = function(update) {
            // Schedule it to run after the current call stack has cleared.
            defer(function(current, i){
                // If initial collection is not done or
                // new images have been added to the DOM, collect them.
                if (!images[LENGTH] || update === TRUE) {
                    // Add event listeners
                    belowfoldEnabled && addBelowfoldListeners();

                    $('.'+className, root).each(function(idx, elm) {
                        // If we haven't processed this image yet and it is a responsive image
                        if (elm && !elm[RILOADED]) {
                            // Flag to avoid reprocessing
                            elm[RILOADED] = TRUE;
                            // Add image to the list
                            images.push(elm);
                            // Increment counter
                            imagesPendingLoad++;
                        }
                    });
                }
                
                // Load images
                if (images[LENGTH]) {
                    i = 0;
                    while (current = images[i]) {
                        if (current &&
                            (!belowfoldEnabled || belowfoldEnabled &&
                             !isBelowTheFold(current, foldDistance))) {
                            loadImage(current, i);
                            i--;
                        }
                        i++;
                    }
                }

                // No more images to load? remove event listeners
                belowfoldEnabled && !images[LENGTH] && removeBelowfoldListeners();

                // Clean up
                current = NULL;
            });
        };
        
        // INITIALIZATION
        // --------------
        
        onDomReady(function(){
            $win = $(win);
            body = doc.body;
            root = root && $('#'+root) || body;
            viewportWidth = viewportWidth || getViewportWidthInCssPixels();
            
            if (!deferMode || belowfoldEnabled) {
                // No defer mode: load all images now! OR
                // 'belowfold' mode enabled: Load initial "above the fold" images
                instance[LOADIMAGES]();
            } else {
                // defer mode = 'load': Load all images after window is loaded OR
                // 'belowfold' not supported: 'load' fallback
                onWindowReady(instance[LOADIMAGES]);
            }
        });
    }
    
    // PUBLIC STATIC PROPERTIES
    // ------------------------
    
    // Versioning guidelines: http://semver.org/
    NodeLoader.version = '1.0';
    
    // PUBLIC METHODS (SHARED)
    // ------------------------
    
    /*
* The "riload" method allows you to load responsive images inserted into the
* document after the DOM is ready or after window is loaded (useful for AJAX
* content & markup created dynamically with javascript).
* Call this method after new markup is inserted into the document.
*/
    NodeLoader[PROTOTYPE].lazyload = function() {
        this[LOADIMAGES](TRUE);
    };
    
    // HELPER FUNCTIONS
    // ----------------
    

    
    
    /*
* Returns the layout viewport width in CSS pixels.
* To achieve a precise result the following meta must be included at least:
* <meta name="viewport" content="width=device-width">
* See:
* - http://www.quirksmode.org/mobile/viewports2.html
* - http://www.quirksmode.org/mobile/tableViewport.html
* - https://github.com/h5bp/mobile-boilerplate/wiki/The-Markup
*/
    function getViewportWidthInCssPixels() {
        var math = Math
          , widths = [docElm.clientWidth, docElm.offsetWidth, body.clientWidth]
          , screenWidthFallback = math.ceil(screenWidth / devicePixelRatio)
          , l = widths[LENGTH]
          , i = 0
          , width;
        
        for (; i < l; i++) {
            // If not a number remove it
            if (isNaN(widths[i])) {
                widths.splice(i, 1);
                i--;
            }
        }
        
        if (widths[LENGTH]) {
            width = math.max[APPLY](math, widths);
            
            // Catch cases where the viewport is wider than the screen
            if (!isNaN(screenWidthFallback)) {
                width = math.min(screenWidthFallback, width);
            }
        }
        
        return width || screenWidthFallback || 0;
    }
    
    
    /*
* Tells if an image is visible to the user or not.
*/
    function isBelowTheFold(img, foldDistance) {
        return $win.height() + $win.scrollTop() <= $(img).offset().top - foldDistance;
    }
    

    /*
* Tells whether user's device connection is slow or not.
* Fast connection assumed if not detected or offline.
* Based on the Network Api:
* - MDN: https://developer.mozilla.org/en/DOM/window.navigator.connection
* - W3C Working draft: http://www.w3.org/TR/netinfo-api/
* - W3C Editor's draft: http://dvcs.w3.org/hg/dap/raw-file/tip/network-api/Overview.html
* List of device bandwidths: http://en.wikipedia.org/wiki/List_of_device_bandwidths#Mobile_telephone_interfaces
*/
    function hasLowBandwidth() {
        var navigator = win.navigator
          , connection = navigator.connection || navigator.mozConnection ||
                navigator.webkitConnection || navigator.oConnection ||
                navigator.msConnection || {}
          , type = connection.type || 'unknown' // polyfill
          , bandwidth = +connection.bandwidth || Infinity; // polyfill
        
        // 2G, 3G and KB/s < 100 are considered slow connections.
        // Offline mode is considered fast connection (bandwidth = 0 or type = none).
        // According to the W3C, 'bandwidth' is reported in MB/s.
        // 0.09765625 MB/s = 100 KB/s = 800 kbps. Let's round up to 0.1 MB/s.
        return bandwidth > 0 && bandwidth < 0.1 || /^[23]g|3|4$/.test(type + EMPTYSTRING);
    }

    
    /*
* Thanks to underscore.js and lodash.js
* Returns a function, that, when invoked, will only be triggered at most once
* during a given window of time.
*/
    function throttle(func, wait) {
        var args
          , result
          , thisArg
          , timeoutId
          , lastCalled = 0;

        function trailingCall() {
            lastCalled = new Date;
            timeoutId = NULL;
            func[APPLY](thisArg, args);
        }

        return function() {
            var now = new Date
              , remain = wait - (now - lastCalled);

            args = arguments;
            thisArg = this;

            if (remain <= 0) {
                lastCalled = now;
                result = func[APPLY](thisArg, args);
            } else if (!timeoutId) {
                timeoutId = setTimeout(trailingCall, remain);
            }
            return result;
        };
    }
    
    
    /*
* Thanks to underscore.js and lodash.js
* Returns a function, that, as long as it continues to be invoked, will not
* be triggered. The function will be called after it stops being called for
* N milliseconds. If `immediate` is passed, trigger the function on the
* leading edge, instead of the trailing.
*/
    function debounce(func, wait, immediate) {
        var args
          , result
          , thisArg
          , timeoutId;

        function delayed() {
            timeoutId = NULL;
            if (!immediate) {
                func[APPLY](thisArg, args);
            }
        }

        return function() {
            var isImmediate = immediate && !timeoutId;
            args = arguments;
            thisArg = this;

            clearTimeout(timeoutId);
            timeoutId = setTimeout(delayed, wait);

            if (isImmediate) {
                result = func[APPLY](thisArg, args);
            }
            return result;
        };
    }
    
    
    /*
* Thanks to underscore.js and lodash.js
* Defers a function, scheduling it to run after the current call stack has cleared.
*/
    function defer(func) {
        var args = Array[PROTOTYPE].slice[CALL](arguments, 1);
        setTimeout(function(){ return func[APPLY](NULL, args); }, 1);
    }
    
    
    /*
* Error reporting function
*/
    function error(msg) {
        throw new Error( 'Riloadr: ' + msg );
    }


    /*
* Simple event attachment/detachment
* Since we attach listeners to the window scroll, resize and
* orientationchange events, native functions are 6x faster than jQuery's
* event handling system.
*/
    function addEvent(elem, type, fn) {
        elem[add](pre + type, fn, FALSE);
    }
    

    function removeEvent(elem, type, fn) {
        elem[rem](pre + type, fn, FALSE);
    }
    
    
    /*
* Wrapper to DOMContentLoaded event
*/
    function onDomReady(fn) {
        $(fn);
    }
    
    
    /*
* Wrapper to attach load event handlers to the window
* Notes:
* - Compatible with async script loading
*/
    function onWindowReady(fn) {
        // Catch cases where onWindowReady is called after
        // the browser event has already occurred.
        if (doc['readyState'] === COMPLETE) {
            fn();
        } else {
            var _fn = function() {
                removeEvent(win, LOAD, _fn);
                fn();
            };
            addEvent(win, LOAD, _fn);
        }
    }

    
    return NodeLoader;
        
});