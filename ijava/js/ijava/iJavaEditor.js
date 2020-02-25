function iJavaEditor(textAreaEditorId, canvasId, outputTextareaId, errorDivId, gui, height) {
	var editor = null;
	var compiler = null;
	var output = null;
	var compileroutput = null;
	var running = false;
	var modified = false;
	var typingTime = 0;
	var startTyping = null;
	var self = this;
	height = height ? height : "480px";
	
	output = document.getElementById(outputTextareaId);
	compileroutput = document.getElementById(errorDivId);

	var iJavaLinter = function(s,cm) {		
		if ( startTyping != null ) {
			var end = new Date()-1200;
			var editing = 0;
			if (end-startTyping > 0) {
				editing = end-startTyping;
			}
			typingTime += editing;
			startTyping = null;
		}

		var annotations = [];
		var errors = [];
		// Por si se llama a iJavalinter antes de estar cargado el editor (raro pero paso)
		if (!editor || !compiler) return annotations;
		errors = compiler.parse(editor.getValue());		
		outputHandler.clear();
		errorHandler.clear();
		for ( var i = 0 ; i < errors.length  ; i++ ) {
			var e = errors[i];
			annotations.push({
				from: CodeMirror.Pos(e.line-1, 0),
				to: CodeMirror.Pos(e.line-1, 0),
				severity: e.severity,
				message: e.message
			});
			errorHandler.manage(errors[i]);
		}
		if (annotations.length > 0) {
			outputHandler.hide();
		}
		/*
		if (annotations.length === 0 && running) {
			compiler.stop();
			compiler.run(editor.getValue(), canvasId);
		}
		*/
		return annotations;
	};
	/*
	var colorPickerActive = false;
	var taeditor = document.getElementById("colorpicker-div");
	var cphthml = "<div style='display:none; position:absolute; z-index:30;' id='dialogo'><input type='text' id='colorPicker'></div>";
	$(cphthml).insertBefore(taeditor);
	taeditor = document.getElementById(textAreaEditorId);
*/

	var colorPickerActive = false;
	var colorPickerId = "colorPicker-" + textAreaEditorId;
	var colorPickerDiv = document.getElementById( "colorpicker-div");
	var cphthml = "<div style='display:none; position:absolute; z-index:30;' class='dialogo'><input type='text' id='" + colorPickerId + "'></div>";
	$(cphthml).insertBefore( colorPickerDiv );
	var taeditor = document.getElementById(textAreaEditorId);



	editor = CodeMirror.fromTextArea(taeditor, {
	  lineNumbers: true,
	  matchBrackets: true,
	  autoCloseBrackets: true,
	  styleActiveLine:true,
	  tabSize:2,
	  indentUnit:2,
	  mode: "text/x-ijava",
	  gutters: ["CodeMirror-lint-markers"],
	  lint: {
	        getAnnotations: iJavaLinter,
	        delay: 1200
	  },
	  theme: "neat"
	});
	 	
	editor.setSize("100%", height);
	editor.setOption("theme", "neat");  	
	editor.textAreaId = textAreaEditorId;
	
	editor.getDoc().on("change", function(doc, change) {
		modified = true;
		if ( startTyping == null ) {
			startTyping = new Date();
		}
		// Guardar doc en localstorage
        gui.onCodeChange();         
	});
	self.editor = editor;
	function parseColors(line) {
		// Saltar espacios
		var i = 0;
		var L = line.length;
		var colors = ["", "", "", ""];
		var base = ["0", "0", "0", "1"];
		var nColors = 0;
		while (i < L && line[i] === " ") i++;
		if (line[i] === "(") {
			i++;
			var opens = 1;
			while (i < L) {
				if (line[i] == "(") opens++;
				if (line[i] == ")") opens--;
				if (opens === 0 || line[i] == ",") break;				
				colors[nColors] += line[i];
				i++;
			}
			if (i < L && line[i] == ",") {
				nColors++;
				i++;
				while (i < L) {
					if (line[i] == "(") opens++;
					if (line[i] == ")") opens--;
					if (opens === 0 || line[i] == ",") break;				
					colors[nColors] += line[i];
					i++;
				}
				if (i < L && line[i] == ",") {
					nColors++;
					i++;
					while (i < L) {
						if (line[i] == "(") opens++;
						if (line[i] == ")") opens--;
						if (opens === 0 || line[i] == ",") break;				
						colors[nColors] += line[i];
						i++;
					}
					if (i < L && line[i] == ",") {
						nColors++;
						i++;
						while (i < L) {
							if (line[i] == "(") opens++;
							if (line[i] == ")") opens--;
							if (opens === 0 || line[i] == ",") break;				
							colors[nColors] += line[i];
							i++;
						}
						if (i < L && line[i] !== ")") console.log("error raro");
					}
				}
			}
		}
		for ( var j = 0 ; j < 4 ; j++ ) {
			colors[j] = colors[j].trim();
			if (colors[j] === "") colors[j] = base[j];
		}
		return {
			call: line.substring(0,i+1),
			colors: colors
		};
	}
	
	editor.on("mousedown", function (cm, event) {
	    if (colorPickerActive) {
		    $('.dialogo').css({
		        display: "none"
		    });			
	    	colorPickerActive = false;
	        return false;
	    }
		var coords = cm.coordsChar({left:event.pageX, top:event.pageY});
		var token = cm.getTokenAt(coords);
	    var line = editor.getLine(coords.line);
	    if (token.string === "fill" || token.string === "background" || token.string === "stroke") {
	        var currentColor = "0,0,0";
	        var current = parseColors(line.substring(token.end));
	        if (current) {
	            var r = isNaN(current.colors[0]) ? "0" : current.colors[0];
	            var g = isNaN(current.colors[1]) ? "0" : current.colors[1];
	            var b = isNaN(current.colors[2]) ? "0" : current.colors[2];
	            var a = 1;
	            if (current.colors[3] !== "") a = isNaN(current.colors[3]) ? "0" : current.colors[3];
	            currentColor = "" + r + "," + g + "," + b + "," + a;
	        }
	        console.log(colorPickerId, editor)
		    $('.dialogo').css({
		        top: event.pageY,
		        left: event.pageX,
		        display: "block"
		    });
		    colorPickerActive = true;
	        var from = {
	            line: coords.line,
	            ch: token.start + token.string.length
	        };
	        var to = {
	            line: coords.line,
	            ch: token.start + token.string.length + current.call.length
	        };
	        $("#" + colorPickerId).spectrum.from = from;
	        $("#" + colorPickerId).spectrum.to = to;
	        // TODO: sacar rgba sólo cuando interese, para básicos sacar rgb
	        $("#" + colorPickerId).spectrum('set', 'rgba(' + currentColor + ')');
	    }
	    return false;
	});

	$("#" + colorPickerId).spectrum({
		flat: true,
	    showInput: false,
	    showInitial: true,
	    chooseText: "Elegir",
	    cancelText: "Cancelar",
	    showAlpha: true,
	    
	    change: function (c) {
	        var color = c.toRgb(),
	            from = $("#" + colorPickerId).spectrum.from,
	            to = $("#" + colorPickerId).spectrum.to;
	        var str = "(" + color.r + "," + color.g + "," + color.b;
	        if (color.a < 1.0) str += "," + color.a;
	        str += ")";
	        console.log("Aqui", editor, self);
	        if (from) {
	            self.editor.getDoc().replaceRange(str, from, to);
	        }
		    $('.dialogo').css({
		        display: "none"
		    });			
	    	colorPickerActive = false;
	    	
	    }
	});
 
	function addErrorEvent(element, line) {
		if(element.addEventListener){
			element.addEventListener("click", function() {
				editor.scrollIntoView({line:line-1,ch:0});
			});
		} else {
			element.attachEvent("click", function() {
				editor.scrollIntoView({line:line-1,ch:0});
			});
		}
	}
	
	function addErrorLine(error) {
		var par = document.createElement("p");
		var msg = document.createTextNode(error.message);
        if (error.line)
        {
            var line = document.createElement("a");
            line.innerHTML = "Línea " + error.line + ": ";
            addErrorEvent(line, error.line);
            par.appendChild(line);
        }
        par.appendChild(msg);
		compileroutput.appendChild(par);
	}
	 
	var errorHandler = {
		manage:
		function(e) {
			console.log(e.message);
			addErrorLine(e);
		},
		clear: 
		function() {
			if (compileroutput)	compileroutput.innerHTML = "";
		},
		show:
		function() {
			if (compileroutput) compileroutput.style.display = "block";
		},
		hide:
		function() {
			if (compileroutput)	compileroutput.style.display = "none";
		}
	};
		
	var outputHandler = {
		print: 
		function(msg) {
			if (output) {
				if ( output.style.display == "none" ) {
					outputHandler.show();
				}
				output.innerHTML += msg;//.replace("\n", "<br/>");
				output.scrollTop = output.scrollHeight - output.clientHeight;
			}
		},
		clear:
		function() {
			if (output) output.innerHTML = "";
		},
		show:
		function() {
			if (output) output.style.display = "block";
		},
		hide: 
		function() {
			if (output) output.style.display = "none";
		}	
	};
	
	var controlHandler = {
		onProgramStopped:
		function() {
			gui.onProgramStopped();
			running = false;
		}
	};
	
	compiler = new iJavaCompiler();
	compiler.setOutputHandler(outputHandler);
	compiler.setErrorHandler(errorHandler);
	compiler.setControlHandler(controlHandler);
	
	this.hasErrors = function() { 
	    return compiler.hasErrors(editor.getValue());
	};
	
	this.run = function() {
		if (running) {
			this.stop();
		} else {
			outputHandler.hide();
			outputHandler.clear();
			errorHandler.clear();
			running = compiler.run(editor.getValue(), canvasId, false);
			if ( running != null ) gui.onProgramStarted();
			if (running) {
				running = true;
			} else {
				if ( running != null ) gui.onProgramStopped();				
			}
		}
	};

	this.getcode = function() {
		return compiler.run(editor.getValue(), canvasId, true);
	};
	
	this.runTestCase = function( inputStream ) {
		if (running) {
			this.stop();
		} else {
			/*
			var exitWithErrors = false;
			outputHandler.hide();
			errorHandler.clear();
			var oh = Object.create( outputHandler );
			var output = "";
			oh.print = function( msg ) {
				output += msg;
			};
			var eh = Object.create( errorHandler );
			eh.manage = function( e ) {
				errorHandler.manage(e);
				exitWithErrors = true;
			};
			compiler.setInputStream( inputStream) ;
			compiler.setOutputHandler( oh );				
			compiler.setErrorHandler( eh );				
	        running = compiler.runTest( editor.getValue() );
	        if (running) {
	        	// Error porque no deben haber bucles draw en las pruebas
	        	compiler.stop();
	        	return null;
	            running = true;
	        }
			compiler.setErrorHandler( errorHandler );				
			compiler.setOutputHandler( outputHandler );	
			compiler.setInputStream( null );
			if ( exitWithErrors ) return null;
			return {
				output: output,
				image: compiler.getMD5Image(),
				hash: md5(output)+"-"+compiler.getMD5Image()
			}	
			*/
			return compiler.runTest( editor.getValue(), inputStream );		
		}
	};
	
	this.stop = function() {
		compiler.stop();
		running = false;
	};	
	
	this.setValue = function(source) {
	  editor.setValue(source);
	  modified = false;
	};
	
	this.getValue = function() {
	  return editor.getValue();
	};
	
	this.hasChanged = function() {
	  return modified;
	};
	
	this.getIcon = function() {
	  return compiler.getIcon(editor.getValue());
	};
	
	this.hasImage = function() {
	      return compiler.hasImage(editor.getValue());
	};
	
	this.setInputStream = function(ios) {
	    compiler.setInputStream(ios);
	}
	
	
	this.getKeyPoints = function() {
	  return compiler.getKeyPoints(editor.getValue());
	};
	
	this.getTypingTime = function() {
		return typingTime;
	}
	
	this.focus = function() {
      
      editor.focus();
  	}
}

