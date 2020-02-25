function iJavaSandboxTest() {
	var runtime = null;
	var canvas = [];
	var color = 0;
	var strokeStyle = 0;
	var fillStyle = 255 << 16 | 255 << 8 | 255;
	
	var outputHandler = null;
	var errorHandler = null;
	var controlHandler = null;
		
	var eventHandlers = [];

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
	
	// Variable autoreferencia
	var self = this;
	
	// Variable para simular entrada de texto desde BBDD
	self.standardInput = null;
	self.sipointer = 0;
	internalPrompt = window.prompt;

	var init = function() {
		background(192,192,192);
	};
	
	// Keyboard
   
///////////////////////////// iJava libraries
	// Constants
	
	var PI = Math.PI;
	var E = Math.E;

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
		this.timeLimit[this.deep] = 8000;
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
		console.log(e);
		if (exiting) return;		
		// En principio nos quedamos con el error
		var err = e;
		// Buscar dentro de runtime si hay alguna función muy llamada
		var mcf = runtime.findMostCalledFunction();
		console.log(runtime);
		console.log(mcf);
		if (mcf && mcf.times > 100) {
			err = {
				message: "Se ha producido un error durante la ejecución del programa. Probablemente se deba a que la función '"+mcf.name+"' es recursiva y no tiene bien definido su caso base por lo que se está llamando a sí misma desde la línea " + mcf.line + " sin parar.",
				line: mcf.line
			};
		}
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
			if (n == null) throw {
				message: "Programa cancelado a petición del usuario"
			};
			if ((n !== "") && isFinite(n) && isInt(n)) return parseInt(n);    	
		}
	}
	
	function readDouble(msg) {
		if (!msg) msg = "Introduce un número real";
		while (true) {
			var n = internalPrompt(msg, 0.0);
			if (n == null) throw {
				message: "Programa cancelado a petición del usuario"
			};
			if ((n !== "") && isFinite(n)) return parseFloat(n);    	
		}
	}
	
	function readString(msg) {
		if (!msg) msg = "Introduce una cadena de texto";
		var str = internalPrompt(msg, "");
		if (str == null) throw {
			message: "Programa cancelado a petición del usuario"
		};
		return new __String(str);
	}
	
	function readChar(msg) {
		if (!msg) msg = "Introduce un carácter";
	  var c = null;
		do {
			c = internalPrompt(msg);//readString(msg);
			if (c == null) throw {
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
		if ( strokeStyle < 0 ) return;
		if ( x >= 0 && x < 320 && y >= 0 && y < 320 ) {
//			var desp = y << 6 + y << 8 + x; // y*320 + x
			canvas[ y*320+x ] = strokeStyle;
		}
	}
	
	// https://es.wikipedia.org/wiki/Algoritmo_de_Bresenham
	function line(x0,y0,x1,y1) {
		if ( strokeStyle < 0 ) return;
		x0 = x0 | 0;
		y0 = y0 | 0;
		x1 = x1 | 0;
		y1 = y1 | 0;
		var x, y, dx, dy, p, incE, incNE, stepx, stepy;
		dx = (x1 - x0);
		dy = (y1 - y0);
		
		/* determinar que punto usar para empezar, cual para terminar */
		 if (dy < 0) { 
		   dy = -dy; 
		   stepy = -1; 
		 } 
		 else {
		   stepy = 1;
		 }
		
		if (dx < 0) {  
		  dx = -dx;  
		  stepx = -1; 
		} 
		else {
		  stepx = 1;
		}
		
		x = x0;
		y = y0;
		point(x0,y0);
		/* se cicla hasta llegar al extremo de la línea */
		if(dx>dy){
		  p = 2*dy - dx;
		  incE = 2*dy;
		  incNE = 2*(dy-dx);
		  while (x != x1){
		    x = x + stepx;
		    if (p < 0){
		      p = p + incE;
		    }
		    else {
		      y = y + stepy;
		      p = p + incNE;
		    }
		    point(x, y);
		  }
		}
		else{
		  p = 2*dx - dy;
		  incE = 2*dx;
		  incNE = 2*(dx-dy);
		  while (y != y1){
		    y = y + stepy;
		    if (p < 0){
		      p = p + incE;
		    }
		    else {
		      x = x + stepx;
		      p = p + incNE;
		    }
		    point(x, y);
		  }
		}
	}	

	// https://sites.google.com/site/ruslancray/lab/projects/bresenhamscircleellipsedrawingalgorithm/bresenham-s-circle-ellipse-drawing-algorithm
	function ellipse(xc,yc,width,height) {
		width /= 2;
		height /= 2;
		xc = xc | 0;
		yc = yc | 0;
	    var a2 = width * width;
	    var b2 = height * height;
	    var fa2 = 4 * a2, fb2 = 4 * b2;
	    var x, y, sigma;
		var oss = strokeStyle;
	    /* first half */
	    /* first half */
	    x = 0;
	    y = height;
	    sigma = 2*b2+a2*(1-2*height); 
	    while ( b2*x <= a2*y )
	    {
	    	if ( fillStyle >= 0 ) {
		    	strokeStyle = fillStyle;
		        line (xc-x, yc+y, xc+x, yc+y);
		        line (xc-x, yc-y, xc+x, yc-y);
	    	}
	    	strokeStyle = oss;
	    	if ( strokeStyle >= 0) {
		        point (xc + x, yc + y);
		        point (xc - x, yc + y);
		        point (xc + x, yc - y);
		        point (xc - x, yc - y);
	    	}
	        if (sigma >= 0)
	        {
	            sigma += fa2 * (1 - y);
	            y--;
	        }
	        sigma += b2 * ((4 * x) + 6);
	        x++;
	    }
			
	    /* second half */
	    x = width;
	    y = 0; 
	    sigma = 2*a2+b2*(1-2*width); 
	    while ( a2*y <= b2*x )
	    {
	    	if ( fillStyle >= 0 ) {
		    	strokeStyle = fillStyle;
		        line (xc-x, yc+y, xc+x, yc+y);
		        line (xc-x, yc-y, xc+x, yc-y);
	    	}
	    	strokeStyle = oss;
	    	if ( strokeStyle >= 0) {
		        point (xc + x, yc + y);
		        point (xc - x, yc + y);
		        point (xc + x, yc - y);
		        point (xc - x, yc - y);
	    	}
	        if (sigma >= 0)
	        {
	            sigma += fb2 * (1 - x);
	            x--;
	        }
	        sigma += a2 * ((4 * y) + 6);
	        y++;
	    }
	    strokeStyle = oss;
	}
	
	function triangle(x1,y1,x2,y2,x3,y3) {
		if ( fillStyle >= 0 ) {
			var oss = strokeStyle;
		   	strokeStyle = fillStyle;
		    if (y1 > y2)
		    {
		        var t = x1;
		        x1 = x2;
		        x2 = t;
		        t = y1;
		        y1 = y2;
		        y2 = t;
		    }
		    if (y2 > y3)
		    {
		        var t = x2;
		        x2 = x3;
		        x3 = t;
		        t = y2;
		        y2 = y3;
		        y3 = t;
		        if (y1 > y2)
		        {
		            var t = x1;
		            x1 = x2;
		            x2 = t;
		            t = y1;
		            y1 = y2;
		            y2 = t;
		        }
		    }
		    var xl = x1; // x izquierda
		    var xr = x1;
		    var dxl = (x2-x1)/(y2-y1); // Incremento iquierdo
		    var dxr = (x3-x1)/(y3-y1);
		    var y = y1; // altura inicial
		    // Primera mitad del triángulo
		    y2 = floor(y2); // Para no pasarnos de la mitad exacta en pixels
		    while ( y < y2 )
		    {
		        line(xl, y, xr, y);
		        xl += dxl;
		        xr += dxr;
		        y = y + 1;
		    }
		    xl = x2;
		    // Segunda mitad del triángulo
		    dxl = (x3-xl)/(y3-y);
		    dxr = (x3-xr)/(y3-y);
		    while ( y < y3 )
		    {
		        line( xl, y, xr, y);
		        xl += dxl;
		        xr += dxr;
		        y = y + 1;
		    }
		    strokeStyle = oss;
		}
		if ( strokeStyle >= 0 ) {
		    line(x1,y1, x2,y2);
		    line(x2,y2, x3,y3);
		    line(x3,y3, x1,y1);
		}
	}
	
	function rect(x,y,w,h) {
		x = x | 0;
		y = y | 0;
		w = w | 0;
		h = h | 0;
		var oss = strokeStyle;
		if ( fillStyle >= 0 ) {
			strokeStyle = fillStyle;
			for ( var filas = 0 ; filas < h ; filas++ ) {
				line(x,y+filas, x+w-1, y+filas);
			}
		}
		strokeStyle = oss;
		if ( strokeStyle >= 0 ) {
			h--;
			w--;
			line(x,y, x+w, y);
			line(x,y+h, x+w, y+h);
			line(x,y, x,y+h);
			line(x+w,y, x+w, y+h);
		}
	}
	
	function text(msg,x,y) {
	}
	
	function textWidth(msg) {
	}
	
	function textSize(h) {
	}
	
	function strokeWeight(w) {
	}
		
	function background(r,g,b,a) {	
		//r << 16 & 16711680 | g << 8 & 65280 | b & 255
		var c = r << 16 | g << 8 | b;
		for ( var i = 0 ; i < 320*320 ; i++ ) canvas[i] = c;
	}
	
	// Color
	
	function stroke(r,g,b,a) {
		strokeStyle = r << 16 | g << 8 | b;
	}
	
	function noStroke() {
		strokeStyle = -1;
	}
	
	function fill(r,g,b,a) {
		fillStyle = r << 16 | g << 8 | b;
	}
	
	function noFill() {
		fillStyle = -1;
	}
	
	function getColor(x,y) {
		if ( x >= 0 && x < 320 && y >= 0 && y < 320 ) {
			var desp = y << 6 + y << 8 + x; // y*320 + x
			return canvas[ desp ];
		}
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

	// Images
	/**
	  * Las imágenes que se hayan indicado en llamadas a image en el código fuente serán precargadas antes 
	  * de ejecutar el programa. Se guardan en el diccionario imagesCached como objetos de tipo Image
	  * indexadas por su URL. Por lo tanto, lo único que necesita la función image para dibujarlas es la url
	  * y con ella obtiene el objeto Image que usa en el contexto.
	  */
	function image(str, x,y, w,h) {
	}
	
	///////////////////
	
    /**
     * El parámetro t determina los milisegundos a esperar entre frames con un límite inferior de 10ms
    */
	function animate(f, t) {
	}
	
	function exit() {
	}
	
	function loop(draw, t) {
	}	
	
	function noLoop() {
	}
	
	function installHandlers() {
		
		runtime = new Runtime();		
	}
	
	function removeHandlers() {
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
	
	var execute = function(code) {
		installHandlers();
//		console.log("--------------\n");		
		var thecode = "running = true;\n exiting = false;\nvar __main = null;\nvar __draw = null;\nvar __onKeyPressed = null;\nvar __onKeyReleased = null;\n" + code + "\nonKeyPressed = __onKeyPressed;\nonKeyReleased = __onKeyReleased;\n try {\n  if (__main) __main();\n  else stop();\n} catch (e) {\n error(e);\n}\n\n"
		eval(thecode);
		removeHandlers();
	};
	
	// iJava Public Interface 
	
	this.stop = function() {
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
	
	this.setControlHandler = function(eh) {
		controlHandler = eh;
	};
	
	this.preloadImage = function(src) {
	};
	
	this.run = function(code) {
		if (running) return;
		execute(code);
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
				var strs = self.standardInput.split("\\n");
				if (self.sipointer >= strs.length) {
					throw {
						line:0,
						message: "Se ha llegado al final de los datos de entrada sin encontrar el tipo de dato buscado."
					};
				}
				var str = strs[self.sipointer];
				self.sipointer++;
				return str;			
			};
		}
	};

	this.md5Image = function( showResult ) {
		if ( showResult ) {
			var context = document.getElementById("mycanvas").getContext("2d");	
			var data = null;
			var imageData = null;
			try {
				imageData = context.getImageData(0,0, 320,320);
				data = imageData.data;
			} catch (e) {
				console.log(e);
				// Nothing to do
			}
			for ( var i = 0 ; i < 320*320 ; i++ ) {
				var r = (canvas[i] >> 16) & 255;
				var g = (canvas[i] >> 8) & 255;
				var b = (canvas[i]) & 255;
				data[i*4] = r;
				data[i*4+1] = g;
				data[i*4+2] = b;
				data[i*4+3] = 255;
			}
			context.putImageData(imageData, 0,0);
		}
		var cadena = "";
		for ( var i = 0 ; i < 320*320 ; i++ ) {
			cadena += canvas[i];
		}
		var firma = md5(cadena);
		return firma;
	}
	
	init();
	
}
