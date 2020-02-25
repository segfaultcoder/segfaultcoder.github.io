function iJavaCompiler() {
	var parser = new iJavaParser();
	var sandbox = null;
	var errorHandler = null;
	var outputHandler = null;
	var controlHandler = null;
	var inputStream = null;
	
	this.parse = function(source) {
		var tree;
		var errors = [];
		try {
			tree = parser.parse(source);
		} catch (e) {
			errors.push(e);
			return errors;
		}
		return parser.getWarnings();
	}
	
	this.hasErrors = function(source) {
		
		var tree;		
		try {
			tree = parser.parse(source);
		} catch (e) {
			return true;
		}
		return false;
	}
	
	this.getKeyPoints = function(source) {	  
	  this.parse(source);
		return parser.getKeyPoints();
	}
	
	this.getIcon = function(source) {
	  this.parse(source);
		var io = ['print', 'println', 'readInteger', 'readDouble', 'readString', 'readChar'];
		var animation = ['loop', 'exit', 'animate'];
		var math = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'log'];
		var graph = ['stroke', 'strokeWeight', 'noStroke', 'noFill', 'background', 'line', 'ellipse', 'point', 'triangle', 'rect', 'text', 'textSize', 'color', 'alpha', 'red', 'green', 'blue', 'brightness', 'saturation', 'blendColor', 'lerpColor', 'getColor', 'image'];
		var tags = {
			graph: 0,
			animation: 0,
			io: 0,
			math: 0
		};
		var functions = parser.getUsedFunctions();
		tags.animation = (functions.indexOf('loop') >= 0 || (functions.indexOf('animate') >= 0));		
		for ( var i = 0 ; i < io.length ; i++ ) {
			if (functions.indexOf(io[i]) >= 0) {
				tags.io = 1;
				break;
			}
		}
		for ( var i = 0 ; i < math.length ; i++ ) {
			if (functions.indexOf(math[i]) >= 0) {
				tags.math = 1;
				break;
			}
		}
		for ( var i = 0 ; i < graph.length ; i++ ) {
			if (functions.indexOf(graph[i]) >= 0) {
				tags.graph = 1;
				break;
			}
		}
		return tags.graph + tags.animation*2 + tags.io*4 + tags.math*8;		
	}
	
	//NEW Added by Juan Antonio <juanantonio@um.es> 
	this.hasImage = function(source) {
		  this.parse(source);
			var graph = ['stroke', 'strokeWeight', 'noStroke', 'fill', 'noFill', 'background', 'line', 'ellipse', 'point', 'triangle', 'rect', 'text', 'textWidth', 'textSize', 'image', 'getColor', 'red', 'green', 'blue'];
			var functions = parser.getUsedFunctions();
			var hasAnimation = (functions.indexOf('loop') >= 0 || (functions.indexOf('animate') >= 0));		
			if (hasAnimation) return true;
			for ( var i = 0 ; i < graph.length ; i++ ) {
				if (functions.indexOf(graph[i]) >= 0) {
					return true;
				}
			}
			return false;		
		}
	//END NEW Added by Juan Antonio <juanantonio@um.es> 
	// Marcos
	
	this.getCode = function(source) {
		
		var tree;
		try {
			tree = parser.parse(source);
		} catch (e) {
			return null;
		}
		
		var traductor = new iJava2Javascript(tree);
		var code = traductor.doIt();
		
		return code;
	};

	// Devuelve null si no llega a compilar el código
	this.run = function(source, canvasid, showjs) {
		var tree;
		try {
			tree = parser.parse(source);
		} catch (e) {
			errorHandler.manage(e);
			return null;
		}
		var traductor = new iJava2Javascript(tree);
		var code = traductor.doIt();
		if (showjs) {
			return code;
		} else {
			sandbox = new iJavaSandbox(canvasid);
			if (inputStream != null) {
				sandbox.setInputStream(inputStream);
			}
			sandbox.setOutputHandler(outputHandler);
			sandbox.setErrorHandler(errorHandler);
			sandbox.setControlHandler(controlHandler);
			var usedImages = parser.getUsedImages();
			for ( var i = 0 ; i < usedImages.length ; i++ ) {
				sandbox.preloadImage(usedImages[i]);
			}
			outputHandler.clear();
			sandbox.run(code);
			var functions = parser.getUsedFunctions();
			return (functions.indexOf('loop') >= 0 || (functions.indexOf('animate') >= 0));		
		}
	}
	
	this.runTest = function(source, inputStream) {
		var tree;
		try {
			tree = parser.parse(source);
		} catch (e) {
			errorHandler.manage(e);
			return null;
		}
		var functions = parser.getUsedFunctions();
		if (functions.indexOf('loop') >= 0 || (functions.indexOf('animate') >= 0) ) {
			errorHandler.manage({
				line:0,
				message: "No se pueden usar las funciones de animación para resolver esta prueba."
			});
			return null;		
		}
		var output = "";			
		var oh = {
			print: 
			function(msg) {
				output += msg;
			},
			clear:
			function() {
			},
			show:
			function() {
			},
			hide: 
			function() {
			}	
		};
		var exitWithErrors = false;
		var eh = {
			manage:
			function(e) {
				errorHandler.manage(e);
				exitWithErrors = true;
			},
			clear: 
			function() {
				errorHandler.clear();
			},
			show:
			function() {
				errorHandler.show();
			},
			hide:
			function() {
				errorHandler.hide();
			}
		};
		
		var traductor = new iJava2Javascript(tree);
		var code = traductor.doIt();
		var sandboxTest = new iJavaSandboxTest();
		if (inputStream != null) {
			sandboxTest.setInputStream(inputStream);
		}
		sandboxTest.setOutputHandler(oh);
		sandboxTest.setErrorHandler(eh);
		sandboxTest.run(code);
		if ( exitWithErrors ) return null;
		var md5Image = sandboxTest.md5Image();
		return {
			output: output,
			image: md5Image,
			hash: md5(output) + "-" + md5Image
		}			
	}
	
	this.stop = function() {
		if (sandbox) sandbox.stop();
		sandbox = null;
	}
	
	this.setInputStream = function(iostream) {
		inputStream = iostream;
	}
	
	this.setOutputHandler = function(oh) {
		outputHandler = oh;
	}
	
	this.setErrorHandler = function(eh) {
		errorHandler = eh;
	}

	this.setControlHandler = function(ch) {
		controlHandler = ch;
	}
	
	this.getMD5Image = function() {
		return sandbox.md5Image();
	}
}