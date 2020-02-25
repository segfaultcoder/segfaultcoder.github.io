function iJavaViewer(canvasId, outputTextareaId, errorDivId, gui, height) {
	var compiler = null;
	var output = null;
	var compileroutput = null;
	var running = false;
	var self = this;
	height = height ? height : "480px";
	
	output = document.getElementById(outputTextareaId);
	compileroutput = document.getElementById(errorDivId);

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
	
	this.run = function( source ) {
		if (running) {
			this.stop();
		} else {
			outputHandler.hide();
			outputHandler.clear();
			errorHandler.clear();
			running = compiler.run( source, canvasId );
			if ( running != null ) gui.onProgramStarted();
			if (running) {
				running = true;
			} else {
				if ( running != null ) gui.onProgramStopped();				
			}
		}
	};
	
	this.stop = function() {
		compiler.stop();
		running = false;
	};	

	this.setValue = function(source) {
	};
	
	this.getValue = function() {
		return "";
	};
	
	this.hasChanged = function() {
	};
	
	this.getIcon = function() {
	};
	
	this.hasImage = function() {
	};
	
	this.setInputStream = function(ios) {
	}	
	
	this.getKeyPoints = function() {
		return null;
	};
	
	this.getTypingTime = function() {
		return 0;
	}
	
	this.focus = function() {
  	}
}

