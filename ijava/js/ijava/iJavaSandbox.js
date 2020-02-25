function iJavaSandbox(canvasid) {
	var canvas = null;
	var context = null;
	
	var runtime = null;
	
	var outputHandler = null;
	var errorHandler = null;
	var controlHandler = null;
	
	var fillStyle = "rgb(255,255,255)";
	var fillAlpha = 1;
	var strokeStyle = "rgb(0,0,0)";
	var strokeAlpha = 1;
	var fontStyle = "normal 14pt arial";
	
	var lineWidth = 1;
	
	var eventHandlers = [];

	var key = new __String(""); // NullObject; // Objeto de tipo String (o null) que contendrá la tecla pulsada
	var keys = {};
	var keyPressed = false;
	var keysPressed = 0;
	var keyStack = []; // Pila de teclas pulsadas para actualizar key al ir soltando teclas

	// Para que los defina el usuario
	var onKeyPressed = null;
	var onKeyReleased = null;
	
	var mousePressed = false;
	var mouseButton = 0; // 1 LEFT 2 CENTER 3 RIGHT
	var mouseX = 0;
	var mouseY = 0;
	
	var running = false;
	var exiting = false;
	
	var startTime = new Date();
	var intervalStarted = false;
	var looping = null;
	var timeSinceLastFPS = null;
	var framesSinceLastFPS = 0;
	var frameRate = 0;

	var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;

	// Variables para el precargador de imágenes
	var imagesCached = {};	
	var startPrecarga = null;
	var pendingImages = 0;
	var totalImages = 0;
	var pendingCode = null;	
	
	// Variable autoreferencia
	var self = this;
	
	// Variable para simular entrada de texto desde BBDD
	self.standardInput = null;
	self.sipointer = 0;
	internalPrompt = window.prompt;

	var init = function() {
		canvas = document.getElementById(canvasid);	
		if (!canvas) {
			console.log("Error canvas");
		}	
		// Setup tabindex in order to set canvas focusable
		if (!canvas.getAttribute("tabindex")) canvas.setAttribute("tabindex", 0);
		canvas.focus();
		context = canvas.getContext("2d");	
		if (!context) {
			console.log("Error context");
		}
		context.strokeStyle = strokeStyle;
		context.globalAlpha = 1;
		context.fillStyle = fillStyle;
		context.lineCap ="butt";//square||round
		context.lineJoin ="miter";//bevel||round
		context.lineWidth = lineWidth;
		context.font = fontStyle;
		background(51,51,51);
		if (document.defaultView && document.defaultView.getComputedStyle) {
		  stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)["paddingLeft"], 10) || 0;
		  stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)["paddingTop"], 10) || 0;
		  styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)["borderLeftWidth"], 10) || 0;
		  styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)["borderTopWidth"], 10) || 0;
		}
	};
	
	// Keyboard
	var isCoded = function(e) {
		return (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey);
	};

	var updateSpecialKeys = function(e) {
		if (e.shiftKey) {
			if (!keys['shift']) keysPressed++;
		} else {
			if (keys['shift']) keysPressed--;
		}
		if (e.ctrlKey) {
			if (!keys['control']) keysPressed++;
		} else {
			if (keys['control']) keysPressed--;
		}
		if (e.altKey) {
			if (!keys['alt']) keysPressed++;
		} else {
			if (keys['alt']) keysPressed--;
		}
		if (e.metaKey) {
			if (!keys['meta']) keysPressed++;
		} else {
			if (keys['meta']) keysPressed--;
		}
		keys['shift'] = e.shiftKey;
		keys['ctrl'] = e.ctrlKey;
		keys['alt'] = e.altKey;
		keys['meta'] = e.metaKey;
		if (isCoded(e)) keyPressed = true;
	};

	var getKeyCode = function(e) {
		var code = 	e.key || e.keyCode || e.wich;
		if (typeof code == 'string') {
			switch ( code ) {
				case "ArrowLeft": return "left";
				case "ArrowRight": return "right";
				case "ArrowUp": return "up";
				case "ArrowDown": return "down";
			}
			return code;
		}
		switch (code) {
			case 16: return "shift";
			case 17: return "control";
			case 18: return "alt";
			case 8: return "backspace";
			case 9: return "tab";
			case 10: return "enter";
			case 13: return "return";
			case 27: return "esc";
			case 127: return "delete";
			case 20: return "capslk";
			case 33: return "pgup";
			case 34: return "pgdn";
			case 35: return "end";
			case 36: return "home";
			case 37: return "left";
			case 38: return "up";
			case 39: return "right";
			case 40: return "down";		
			case 91: return "left-meta";		
			case 93: return "right-meta";		
		}
		if (code >= 32 && code < 127) return String.fromCharCode(code).toLowerCase();
	};

	function suppressKeyEvent(e) {
	  if (typeof e.preventDefault === "function") e.preventDefault();
	  else if (typeof e.stopPropagation === "function") e.stopPropagation();
	  return false;
	}

	var handleKeydown = function(e) {
		var k = getKeyCode(e);
		if (k) {
			keyPressed = true;
			if (!keys[k]) {
				keysPressed++;
				keys[k] = true;
				key = new __String(k);
				keyStack[keysPressed-1] = k;
				/* Los eventos los genera el canvas por lo que al generarse una excepción no la captura el try 
				del eval que se hace en la función execute. Por eso hay que ponerlo aquí */
				try {
					if (onKeyPressed !== null) onKeyPressed(key);
				} catch (e) {
					error(e);
				}
			}
		}
		return suppressKeyEvent(e);	
	};

	var handleKeypress = function(e) {
		return suppressKeyEvent(e);	
	};
	
	var handleKeyup = function(e) {
		var k = getKeyCode(e);
		if (k) {
			if (keys[k]) { 
				keysPressed--;
				keys[k] = false;
				if (keysPressed === 0) {
					keyPressed = false;
					key = NullObject;
				} else {
					// Elimino de la pila la tecla soltada que puede no ser la última y 
					// actualizo key a la última que haya pulsada de la pila.
				  for ( var i = 0 ; i < keysPressed ; i++ ) {
				    if (keyStack[i] == k) {
				      for ( var j = i ; j < keysPressed ; j++ ) {
				        keyStack[j] = keyStack[j+1];
				      }
				      break;
				    }
				  }
				  key = new __String(keyStack[keysPressed-1]);
				}
				/* Los eventos los genera el canvas por lo que al generarse una excepción no la captura el try 
				del eval que se hace en la función execute. Por eso hay que ponerlo aquí */
				try {
					if (onKeyReleased !== null) onKeyReleased(new __String(k)); // Pasamos la tecla que se ha soltado
				} catch (e) {
					error(e);
				}
			}
		}
		return suppressKeyEvent(e);	
	};
	
	// Mouse
	
	/*
	var updateMousePosition = function(curElement, event) {
		console.log(event);
	  if (event.layerX || event.layerX == 0) { // Firefox
	    mouseX = event.layerX;
	    mouseY = event.layerY;
	  } else if (event.offsetX || event.offsetX == 0) { // Opera
	    mouseX = event.offsetX;
	    mouseY = event.offsetY;
	  }
	  console.log(mouseX, mouseY);
	}
	*/
	
	function calculateOffset(curElement, event) {
	  var element = curElement,
	  offsetX = 0,
	  offsetY = 0;
	  if (element.offsetParent) {
	    do {
	      offsetX += element.offsetLeft;
	      offsetY += element.offsetTop;
	    } while ( !! (element = element.offsetParent));
	  }
	  element = curElement;
	  do {
	    offsetX -= element.scrollLeft || 0;
	    offsetY -= element.scrollTop || 0;
	  } while ( !! (element = element.parentNode));
	  offsetX += stylePaddingLeft;
	  offsetY += stylePaddingTop;
	  offsetX += styleBorderLeft;
	  offsetY += styleBorderTop;
	  offsetX += window.pageXOffset;
	  offsetY += window.pageYOffset;
	  return {
	    "X": offsetX,
	    "Y": offsetY
	  };
	}
	
	function updateMousePosition(curElement, event) {
	  // http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
	  var rect = canvas.getBoundingClientRect();
      mouseX = Math.round(((event.clientX - rect.left) * 320) / rect.width);
      mouseY = Math.round(((event.clientY - rect.top) * 320) / rect.height);
        /*
	  var offset = calculateOffset(curElement, event);
	  mouseX = (event.pageX - offset.X)*320/curElement.width;
	  mouseY = (event.pageY - offset.Y)*320/curElement.width;
	  */
	}
	
	/*
	// http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
	function updateMousePosition(element, event) {
		var rect = element.getBoundingClientRect();
		mouseX = event.clientX - rect.left,
		mouseY = event.clientY - rect.top
	}
	*/
	var handleMouseMove = function(e) {
	  updateMousePosition(canvas, e);
	};
	
	var handleMouseOut = function(e) {
	};
	
	var handleMouseOver = function(e) {
	  updateMousePosition(canvas, e);
	};
	
	var handleMouseDown = function(e) {
	  mousePressed = true;
	  switch (e.which) {
	  case 1:
	    mouseButton = LEFTBUTTON;
	    break;
	  case 2:
	    mouseButton = MIDDLEBUTTON;
	    break;
	  case 3:
	    mouseButton = RIGHTBUTTON;
	    break;
	  }
	};
	
	var handleMouseup = function(e) {
	  mousePressed = false;
	};
	
	// Event handlers helpers
	
	var attachEventHandler = function(elem, type, fn) {
      if (elem.addEventListener) elem.addEventListener(type, fn, false);
      else elem.attachEvent("on" + type, fn);
      eventHandlers.push({
        elem: elem,
        type: type,
        fn: fn
      });
    };
    
    var detachEventHandler =  function(eventHandler) {
      var elem = eventHandler.elem;
      var type = eventHandler.type;
      var fn = eventHandler.fn;
      if (elem.removeEventListener) elem.removeEventListener(type, fn, false);
      else if (elem.detachEvent) elem.detachEvent("on" + type, fn);
    };
   
///////////////////////////// iJava libraries
	// Constants
	
	var PI = Math.PI;
	var E = Math.E;
	var LEFTBUTTON = 1;
	var MIDDLEBUTTON = 2;
	var RIGHTBUTTON = 3;

	// RunTime library
	
	function Runtime() {
		this.deep = -1;
		this.timeLimit = [];
		this.lastUpdate = [];
		this.nIterations = [];	
		this.calls = {};
	}
	
	Runtime.prototype.startLoop = function() {
		this.deep++;
		this.lastUpdate[this.deep] = new Date();
		this.timeLimit[this.deep] = 20000;
	};
	
	Runtime.prototype.updateLoop = function(line) {
		if (this.deep < 0) return;
		this.nIterations[this.deep]++;
		var now = new Date();
		var elapsed = now-this.lastUpdate[this.deep];
		if (elapsed > this.timeLimit[this.deep]) {
			var res = window.confirm("Parece que el programa tarda demasiado. Pulsa 'ok' si crees que es normal. Pulsa 'cancel' para detener el programa si crees que puede ser debido a un bucle infinito generado por un error en el programa.");
			if (res)	{
				this.lastUpdate[this.deep] = new Date();
				this.timeLimit[this.deep] *= 2;					
			} else {
				throw {
					message:"Programa cancelado debido a un posible bucle infinito en la línea " + line + ".", 
					line: line
				};
			}
		}
	};
	
	Runtime.prototype.stopLoop = function() {
		this.lastUpdate[this.deep] = null;
		this.nIterations[this.deep] = 0;
		this.timeLimit[this.deep] = 0;
		this.deep--;
	};
	
	Runtime.prototype.docall = function(fname, line) {
		if (!this.calls[fname+"__"+line]) {
			this.calls[fname+"__"+line] = 0;
		}
		this.calls[fname+"__"+line]++;
	};
	
	Runtime.prototype.doreturn = function(fname, line) {
		this.calls[fname+"__"+line]--;
	};
	
	Runtime.prototype.findMostCalledFunction = function() {
		var name = null;
		var line = 0;
		var max = 0;
		for (var key in this.calls) {
			if (this.calls[key] > max) {
				max = this.calls[key];
				name = key;
			}
		}		
		if (name != null) {
			var n = name.indexOf("__");
			var str = name.substring(n+2);
			line = parseInt(str);
			name = name.substring(0,n);
			return {
				name: name,
				line: line,
				times: max
			};
		} else {
			return null;
		}
	};
	// Arrays y Strings

	let stillsame = false;
	let canvasdata = null;
	
	function sizeOf(array, dimension) {	
		if (array instanceof __Object && array.isNull()) {
			throw {
				message:"Error al intentar usar la función sizeOf sobre 'null'.", 
				line: 1
			};
		}
		if (array instanceof MyArray) {
			return array.sizeOf(dimension || 1);
		} else
		if (array instanceof __String) {
			return array.__length__0();
		}
	}
	
	function charArrayToString(array) {
		return (new __String()).__Constructor__1(array);
	}
	
	function stringToCharArray(string) {
		if (string instanceof __Object && string.isNull()) return string;
		return string.__toCharArray__0();
	}

	function charAt(string, index) {
		if (string instanceof __Object && string.isNull()) {
			throw {
				message:"Error al intentar usar la función charAt sobre 'null'.", 
				line: 1
			};
		}
		return string.__charAt__0(index);
	}

	function concat(string1, string2) {
		if (string1 instanceof __Object && string1.isNull() && string2 instanceof __Object && string2.isNull()) {
			throw {
				message:"Error al intentar usar la función concat con dos valores parámetros a 'null'.", 
				line: 1
			};
		}
		if (string1 instanceof __Object && string1.isNull()) {
			return (new __String()).__Constructor__2(string2);
		}
		return string1.__concat__0(string2);
	}

	function compare(string1, string2) {
		if (string1 instanceof __Object && string1.isNull() || string2 instanceof __Object && string2.isNull()) {
			throw {
				message:"Error al intentar usar la función compare cuando alguno de los dos parámetros es igual a 'null'.", 
				line: 1
			};
		}
		return string1.__compareTo__0(string2);
	}

	function indexOf(string, character) {
		if (string instanceof __Object && string.isNull()) {
			throw {
				message:"Error al intentar usar la función indexo sobre 'null'.", 
				line: 1
			};
		}
		return string.__indexOf__0(character);
	}
	
	// Time
   
	function year() {
		return new Date().getFullYear();
	}
	
	function month() {
		return new Date().getMonth()+1;
	}
	
	function day() {
		return new Date().getDate();
	}
	
	function hour() {
		return new Date().getHours();
	}
	
	function minute() {
		return new Date().getMinutes();
	}
	
	function second() {
		return new Date().getSeconds();
	}
	
	function millis() {
		return (new Date().getTime()) - startTime.getTime();
	}
	
	// Math
	
	function sqrt(value) {
		return Math.sqrt(value);
	}
	
	function random() {
		if (arguments.length === 0) return Math.random();
		if (arguments.length === 1) return Math.random()*arguments[0];
		if (arguments.length === 2) {
			a = arguments[0];
			b = arguments[1];
			return Math.random()*(b-a)+a;
		}
	}
	
	function floor(x) {
		return Math.floor(x);
	}
	
	function ceil(x) {
		return Math.ceil(x);
	}
	
	function round(x) {
		return Math.round(x);
	}

	function sin(x) {
		return Math.sin(x);
	}
	
	function cos(x) {
		return Math.cos(x);
	}
	
	function tan(x) {
		return Math.tan(x);
	}
	
	function asin(x) {
		return Math.asin(x);
	}
	
	function acos(x) {
		return Math.acos(x);
	}
	
	function atan(x) {
		return Math.atan(x);
	}
	
	function sqrt(x) {
		return Math.sqrt(x);
	}
	
	function abs(x) {
		return Math.abs(x);
	}
	
	function log(x) {
		return Math.log(x);
	}

	function pow(b,e) {
		return Math.pow(b,e);
	}

	// Input/Output
	
	function error(e) {
		if (exiting) return;		
		// En principio nos quedamos con el error
		var err = e;
		if (errorHandler) errorHandler.manage(err);
		else console.log(err);
		noLoop();
		removeHandlers();
		running = false;
	}

	function print(msg) {
		if (msg === undefined) msg = "";
		if (msg instanceof __Object) {
			msg = msg.__toString__0();
		}
		if (outputHandler) outputHandler.print(msg);
		else console.log(msg);
	}

	function println(msg) {
		if (msg === undefined) msg = "";
		if (msg instanceof __Object) {
			msg = msg.__toString__0();
		}	
		print(msg+"\n");
	}
	
	function isInt(n) {
	   return n % 1 === 0;
	} 
	
	function readInteger(msg) {
		if (!msg) msg = "Introduce un número entero";
	  	while (true) {
			var n = internalPrompt(msg, 0);
			if (n == null || n == "") throw {
				line: 0,
				message: "Programa cancelado a petición del usuario"
			};
			if ((n !== "") && isFinite(n) && isInt(n)) return parseInt(n);    	
		}
	}
	
	function readDouble(msg) {
		if (!msg) msg = "Introduce un número real";
		while (true) {
			var n = internalPrompt(msg, 0.0);
			if (n == null || n == "") throw {
				line: 0,
				message: "Programa cancelado a petición del usuario"
			};
			if ((n !== "") && isFinite(n)) return parseFloat(n);    	
		}
	}
	
	function readString(msg) {
		if (!msg) msg = "Introduce una cadena de texto";
		var str = internalPrompt(msg, "");
		if (str == null) throw {
			line: 0,
			message: "Programa cancelado a petición del usuario"
		};
		return new __String(str);
	}
	
	function readChar(msg) {
		if (!msg) msg = "Introduce un carácter";
	  var c = null;
		do {
			c = internalPrompt(msg);//readString(msg);
			if (c == null || c == "") throw {
				line: 0,
				message: "Programa cancelado a petición del usuario"
			};
		} while (c.length != 1 );
		return c[0];
	}
	
	function key(id) {
		return keys[id.toUpperCase()];
	}
	
	// Drawing
	function point(x,y) {
		if (strokeStyle === null) return;
		context.beginPath();
		if (lineWidth > 1) {
			context.fillStyle = strokeStyle;
		  context.arc(x, y, lineWidth / 2, 0, 6.283185307179586, false);
		  context.fill();
			context.fillStyle = fillStyle;
		} else {
			context.fillStyle = strokeStyle;
			context.fillRect(x, y, 1, 1);
			context.fillStyle = fillStyle;
		}
		context.closePath();
		stillsame = false;
	}
	
	// Para evitar antialiasing en líneas con grosores impares 
	// (http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/)
	function line(x1,y1,x2,y2) {
		if (lineWidth % 2 == 1) context.translate(0.5,0.5);
		context.beginPath();
		context.moveTo(x1,y1);
		context.lineTo(x2,y2);
		context.closePath();
		if (strokeStyle !== null) {
			context.globalAlpha = strokeAlpha;
			context.stroke();
		}
		if (lineWidth % 2 == 1) context.translate(-0.5,-0.5);
		stillsame = false;
	}	
	// http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
	function ellipse(x,y,w,h) {
		w = w >= 0 ? w : 0;
		h = h >= 0 ? h : 0;
		context.beginPath();
		if (w == h) {
			context.arc(x,y,w / 2, 0, 6.283185307179586, false);
		} else {
			var w2 = w/2;
			var h2 = h/2;
			x -= w2;
			y -= h2;
			var kappa = 0.5522848,
			ox = (w2) * kappa, // control point offset horizontal
			oy = (h2) * kappa, // control point offset vertical
			xe = x + w,           // x-end
			ye = y + h,           // y-end
			xm = x + w2,       // x-middle
			ym = y + h2;       // y-middle
			 
			context.moveTo(x, ym);
			context.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
			context.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
			context.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
			context.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);			      			      
		}
		context.closePath();
		context.globalAlpha = 0.5;
		if (fillStyle !== null) {
			context.globalAlpha = fillAlpha;
			context.fill();
		}
		if (strokeStyle !== null) {
			context.globalAlpha = strokeAlpha;
			context.stroke();
		}
		stillsame = false;
	}
	
	function triangle(x1,y1,x2,y2,x3,y3) {
		if (lineWidth % 2 == 1) context.translate(0.5,0.5);
		context.beginPath();
		context.moveTo(x1,y1);
		context.lineTo(x2,y2);
		context.lineTo(x3,y3);
		context.lineTo(x1,y1);
		context.closePath();
		if (fillStyle !== null) {
			context.globalAlpha = fillAlpha;
			context.fill();
		}
		if (strokeStyle !== null) {
			context.globalAlpha = strokeAlpha;
			context.stroke();
		}
		if (lineWidth % 2 == 1) context.translate(-0.5,-0.5);
		stillsame = false;
	}
	
	// Para evitar antialiasing en líneas con grosores impares 
	// (http://www.mobtowers.com/html5-canvas-crisp-lines-every-time/)
	function rect(x,y,w,h) {
		w = w >= 0 ? w : 0;
		h = h >= 0 ? h : 0;
		if (lineWidth % 2 == 1) context.translate(0.5,0.5);
		context.beginPath();
		context.rect(x,y,w,h);
		context.closePath();
		if (fillStyle !== null) {
			context.globalAlpha = fillAlpha;
			context.fill();
		}
		if (strokeStyle !== null) {
			context.globalAlpha = strokeAlpha;
			context.stroke();
		}
		if (lineWidth % 2 == 1) context.translate(-0.5,-0.5);
		stillsame = false;
	}
	
	function text(msg,x,y) {
		if (fillStyle !== null) {
			if (msg === undefined) msg = "";
			if (msg instanceof __Object) {
				msg = msg.__toString__0();
			}		
			context.globalAlpha = fillAlpha;
			context.fillText(msg.toString(),x,y);
			stillsame = false;
		}
	}
	
	function textWidth(msg) {
		if (msg === undefined) msg = "";
		if (msg instanceof __Object) {
			msg = msg.__toString__0();
		}		
		return context.measureText(msg).width;
	}
	
	function textSize(h) {
		h = h >= 0 ? h : 0;		
		fontStyle = "normal "+h+"pt arial";
		context.font = fontStyle;
	}
	
	function strokeWeight(w) {
		w = w >= 0 ? w : 0;
		lineWidth = w;
		context.lineWidth = lineWidth;
	}
	
	function background(r,g,b,a) {	
		r = r || 0;
		g = g || 0;
		b = b || 0;
		a = a || 1;
		if (arguments.length == 1) {
			b = g = r;
		}

		context.fillStyle = "rgb("+r+","+g+","+b+")";		
		context.globalAlpha = parseFloat(a);
		context.fillRect(0,0,320,320);
		stillsame = false;
		context.fillStyle = fillStyle;
		context.globalAlpha = 1;
	}
	
	// Color
	
	function stroke(r,g,b,a) {
		r = r || 0;
		g = g || 0;
		b = b || 0;
		a = a || 1;
		if (arguments.length == 1) {
			b = g = r;
		}
		strokeStyle = "rgb("+r+","+g+","+b+")";
		context.strokeStyle = strokeStyle;
		strokeAlpha = parseFloat(a);
		// + ((colorInt >> 16) & 255) + "," + ((colorInt >> 8) & 255) + "," + (colorInt & 255) + "," + ((colorInt >> 24) & 255) / 255 + ")"	
	}
	
	function noStroke() {
		strokeStyle = null;
		context.strokeStyle = "none";
	}
	
	function fill(r,g,b,a) {
		r = r || 0;
		g = g || 0;
		b = b || 0;
		a = a || 1;
		if (arguments.length == 1) {
			b = g = r;
		}
		fillStyle =  "rgb("+r+","+g+","+b+")";
		context.fillStyle = fillStyle;
		fillAlpha = parseFloat(a);
	}
	
	function noFill() {
		fillStyle = null;
		context.fillStyle = "none";
	}

	
	
	function getColor(x,y) {
		x = x || 0;
		y = y || 0;
		x = x > 319 ? 319 : x;
		y = y > 319 ? 319 : y;
		x = parseInt(x);
		y = parseInt(y);
		/* Esto hace que getColor sea muy lento. Pero es necesario porque algunos navegadores no conservan
		el mismo array todo el tiempo. Se podría cachear pero para eso el rendimiento de las funciones que
		dibujan bajaría pues habría que hacer que allí marcaran como sucio el cache.
		*/
		var canvasArray = canvasdata;
		if (!stillsame) {
			try {
				canvasArray = context.getImageData(0,0,320,320).data;
				canvasdata = canvasArray;
			} catch (e) {
				// Nothing to do
			}
			stillsame = true;
		}
		var r = canvasArray[((320 * y) + x) * 4];
	    var g = canvasArray[((320 * y) + x) * 4 + 1];
	    var b = canvasArray[((320 * y) + x) * 4 + 2];
	    var a = canvasArray[((320 * y) + x) * 4 + 3];
	    return r << 16 & 16711680 | g << 8 & 65280 | b & 255;
//    return a << 24 & 4278190080 | r << 16 & 16711680 | g << 8 & 65280 | b & 255
	}
	
	function red(color) {
		return color >> 16 & 255;
	}

	function green(color) {
		return color >> 8 & 255;
	}
	
	function blue(color) {
		return color & 255;
	}

	function color(r,g,b,a) {	
		return a << 24 & 4278190080 | r << 16 & 16711680 | g << 8 & 65280 | b & 255
	}

	function lerp(val1, val2, grade) {
		return (val2*grade + val1*(1-grade));
	}

	function map(s, a1, a2, b1, b2) {
		return (b1+(s-a1)*(b2-b1)/(a2-a1));
	}

	function dist(x1, y1, z1, w1, x2, y2, x2, w2) {
		return sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) + (z1-z2)*(z1-z2) + (w1-w2)*(w1-w2));
	}

	function atan2(y, x) {
		let u = atan(y/x);
    if( x < 0.0 ) {
			if( u > 0.0 )
				u -= PI;
			else
				u += PI;
    }
    return u;
	}

	function max(a, b) {
		return a>b?a:b;
	}

	function min(a, b) {
		return a<b?a:b;
	}

	let tmpmillis = 0;
	let tmpkeypressed = false;
	let tmpmousepressed = false;

	function pupdate() {
		tmpmillis = millis();
		tmpkeypressed = keyPressed;
		tmpmousepressed = mousePressed;
	}

	function pmillis() {
		return tmpmillis;
	}

	function pkeyPressed() {
		return tmpkeypressed;
	}

	function pmousePressed() {
		return tmpmousepressed;
	}

	// Images
	/**
	  * Las imágenes que se hayan indicado en llamadas a image en el código fuente serán precargadas antes 
	  * de ejecutar el programa. Se guardan en el diccionario imagesCached como objetos de tipo Image
	  * indexadas por su URL. Por lo tanto, lo único que necesita la función image para dibujarlas es la url
	  * y con ella obtiene el objeto Image que usa en el contexto.
	  */
	function image(str, x,y, w,h) {
		w = w >= 0 ? w : 0;
		h = h >= 0 ? h : 0;
		var img = imagesCached[str.toString()];
		if (img && img.ready) {
			context.drawImage(img, x,y, w,h);	
		}
	}
	
	///////////////////
	
    /**
     * El parámetro t determina los milisegundos a esperar entre frames con un límite inferior de 10ms
    */
	function animate(f, t) {
        t = t || 40;
		loop(f,t);
	}
	
	function exit() {
		exiting = true;
		noLoop();
		removeHandlers();
		running = false;
	}
	
	function loop(draw, t) {
	  if (intervalStarted === true) noLoop();
	  timeSinceLastFPS = Date.now();
	  framesSinceLastFPS = 0;
	  looping = window.setInterval(function() {
	    try {
				var sec = (Date.now() - timeSinceLastFPS) / 1E3;
				framesSinceLastFPS++;
				var fps = framesSinceLastFPS / sec;
				if (sec > 0.5) {
				  timeSinceLastFPS = Date.now();
				  framesSinceLastFPS = 0;
				  frameRate = fps;
				}
				draw();
	    } catch(e) {
	      error(e);
	    }
	  },
	  t);
	  intervalStarted = true;
	}	
	
	function noLoop() {
		if (intervalStarted) {
			window.clearInterval(looping);
			intervalStarted = false;
			looping = null;
		}
	}
	
	function installHandlers() {
		console.log("Hola");
		if (intervalStarted) noLoop();
	  	var element = canvas ? canvas :  window;
		attachEventHandler(element, "keydown", handleKeydown);
		attachEventHandler(element, "keypress", handleKeypress);
		attachEventHandler(element, "keyup", handleKeyup);
		
		attachEventHandler(element, "mousemove", handleMouseMove);
		attachEventHandler(element, "mouseout", handleMouseOut);
		attachEventHandler(element, "mouseover", handleMouseOver);
		
		element.onmousedown = function() {
		  element.focus();
		  return false;
		};

		attachEventHandler(element, "mousedown", handleMouseDown);
		attachEventHandler(element, "mouseup", handleMouseup);

		attachEventHandler(element, "touchstart", handleMouseDown);
		attachEventHandler(element, "touchsend", handleMouseup);
		
		attachEventHandler(element, "contextmenu", function(e) {
			e.preventDefault();
			e.stopPropagation();
		});
		
		runtime = new Runtime();		
	}
	
	function removeHandlers() {
		for ( var i = 0 ; i < eventHandlers.length ; i++ ) {
			detachEventHandler(eventHandlers[i]);
		}
		runtime = null;
		// Esto es lo último que se ejecuta haya habido o no un bucle de animación
		// Incluso si se para por exit o error también se ejecuta esto.
		if ( controlHandler ) controlHandler.onProgramStopped();
	}
	
	/**
	 * Función que chequéa cada 250ms si las imágenes que se necesitan para el programa que se va a ejecutar
	 * están ya cargadas o no. Cada imagen debe cargarse en menos de 10s o de lo contrario se inicia el
	 * programa sin ella.
	 * La hago función normal y no miembro del objeto porque va a ser llamada por window en el setTimeout.
	 */
	var executeAfterLoadingImages = function() {
		var now = new Date();
		var elapsed = now-startPrecarga;
		if (pendingImages > 0 && elapsed < 10000) {
			// Aún quedan imágenes por cargar y no han pasado los 10s de margen
			// Mostrar estado de la carga
			background(0,0,0);
			noFill();
			stroke(255,255,255);
			rect(10,150, 300,20);
			fill(255,255,255);
			var percent = ((totalImages-pendingImages)/totalImages)*100;
			rect(10,150, 3*percent, 20);			
			text("Cargando: " + Math.round(percent) + "%", 130,130);
			window.setTimeout(executeAfterLoadingImages, 250);
		} else {
			// Todas las imágenes cargadas
			background(51,51,51);
			startPrecarga = null;
			execute(pendingCode);
		}
	};
	
	var execute = function(code) {		
		pendingCode = null;
		installHandlers();
//		console.log("--------------\n");		
		var thecode = "running = true;\n exiting = false;\nvar __main = null;\nvar __draw = null;\nvar __onKeyPressed = null;\nvar __onKeyReleased = null;\n" + code + "\nonKeyPressed = __onKeyPressed;\nonKeyReleased = __onKeyReleased;\n try {\n  if (__main) __main();\n  else stop();\n} catch (e) {\n error(e);\n}\n\n"
		eval(thecode);
	};
	
	// iJava Public Interface 
	
	this.stop = function() {
		if ( pendingCode != null ) return;
		noLoop();
		removeHandlers();
		running = false;
	};	
	
	this.setOutputHandler = function(oh) {
		outputHandler = oh;
	};
	
	this.setErrorHandler = function(eh) {
		errorHandler = eh;
	};
	
	this.setControlHandler = function(ch) {
		controlHandler = ch;
	};
	
	this.preloadImage = function(src) {
		var img = new Image();
		img.ready = false;
		img.onload = function() {
			// Cada vez que se carga una imagen reseteo el contador de tiempo máximo para la siguiente
			startPrecarga = new Date();
			this.ready = true;
			pendingImages--;
		};
		img.src = src;
		img.id = src;
		imagesCached[img.id] = img;
		pendingImages++;
		totalImages++;
	};
	
	this.run = function(code) {
		if (running) return;		
		pendingCode = code;
		startPrecarga = new Date();
		executeAfterLoadingImages();
	};
	
	/**
	Define una nueva función para leer datos a través de las funciones
	read*() para evitar que se pregunten al usuario.
	*/
	this.setInputStream = function(iostream) {
		self.standardInput = iostream;
		if (iostream == null) {
			internalPrompt = window.prompt;
		}
		else {
			internalPrompt = function(msg, initial) {
				var strs = self.standardInput.split("\n");
				if (self.sipointer >= strs.length) {
					throw {
						message: "Se ha llegado al final de los datos de entrada sin encontrar el tipo de dato buscado."
					};
				}
				var str = strs[self.sipointer];
				self.sipointer++;
				return str;			
			};
		}
	};

	init();
	
}
