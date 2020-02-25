// TODO: pretify
function iJava2Javascript(tree) {
	var deep = 0;
	var rContext = [];
	
	this.doIt = function() {
		deep = 0;
		rContext = [];
		return translate(tree);
	};

	function showArrayInitializer(array, context) {
		var s = "[";
		var i = 0;
		for ( ; i < array.length-1 ; i++ ) {
			if (array[i] instanceof Array) s += showArrayInitializer(array[i]);
			else s += translate(array[i], context);
			s += ", ";
		}
		if (array[i] instanceof Array) s += showArrayInitializer(array[i]);
		else s += translate(array[i], context);
		s += "]";
		return s;
	}
	
	var intro = function(deep) {
		var s = "";
		for ( var i = 0 ; i < deep ; i++ ) s = s + "  ";
		return s;
	};

	var translate = function(node, context) {
		if (!node) return "";		

		if (node instanceof Array) {
			var s = "";
			for ( var i = 0 ; i < node.length ; i++ ) {
				s = s + translate(node[i], context);
				s = s + "\n";
			}
			return s;
		}		
		if (node.type === "value") {
			if (node.id === "?") {
				var s = "";
				s = s + translate(node.condition, context);
				s = s + " ? ";
				s = s + translate(node.yes, context); 
				s = s + " : ";
				s = s + translate(node.no, context); 
				return s;
			} else
			if (node.id === "{...}") {
				var s = "MyArrayInitializer(" + node.datatype.dimensions + ", " + showArrayInitializer(node.right, context) + ", " + node.line + ", " + node.datatype.celltype.getDefaultInitializer() + ")";
				return s;
			} else 
			if (node.id === "(cast)") {
				var s = "";
				if (node.datatype == IntegerDatatype && node.right.datatype == DoubleDatatype) {
					s = s + "parseInt(" + translate(node.right, context) + ")";
				} else 
				if (node.datatype == IntegerDatatype && node.right.datatype == CharDatatype) {
					s = s + translate(node.right, context) + ".charCodeAt(0)";
				} else 
				if (node.datatype == CharDatatype && node.right.datatype == IntegerDatatype) {
					s = s + "String.fromCharCode(" + translate(node.right, context) + ")";
				} else {
					s = s + translate(node.right, context);
				}
				return s;
			} else
			if (node.id === "(literal)") {
				var s = "";				
				if (node.datatype == CharDatatype) {
					s = s + '"' + node.value + '"';
				} else
				if (node.datatype == StringDatatype) {
					s = s + 'new __String("' + node.value + '")';
				} else {
					s = s + node.value;
				}
				return s;
			} else 
			if (node.id === "[") {
				return accesoIndexado(node, context);
			} else
			if (node.id === "new") {
				return operadorNew(node, context);
			} else
			if (node.id === "(call)") {
				return call(node, context);
			} else
			if (node.id === ".") {
				// TODO: Comprobar que no se produce nunca
				return accesoNombrado(node, context);
			} else {
				var done = false;
				var s = "";
				if (node.parentesis) s = s + "( ";
				if ((node.id === "==" || node.id === "!=") && node.left.datatype == StringDatatype && node.right.datatype == StringDatatype) { // && 
					if (node.id === "!=") s = s + "!";
					s = s + translate(node.left, context) + ".execute('__equals__0', [" + translate(node.right, context) + "], " + node.line + ")";
                                        if ( node.parentesis ) s = s + ")";
					return s;
				}
				if (node.id === "+" && node.datatype == StringDatatype) { // && node.left.type === "identifier") {
					if (node.id === "+") {
						if (node.left.datatype !== StringDatatype) s = s + "new __String(";
						s = s + translate(node.left, context);
						if (node.left.datatype !== StringDatatype) s = s + ")";
						s = s + ".execute('__concat__0', [" + translate(node.right, context) + "], " + node.line + ")";
					}
                                        if ( node.parentesis ) s = s + ")";
					return s;
				}
				if (node.id === "+=" && node.datatype == StringDatatype && node.left.datatype == StringDatatype) {
					s = s + translate(node.left, context) + ".execute('__append__0', [" + translate(node.right, context) + "], " + node.line + ")";
                                        if ( node.parentesis ) s = s + ")";
					return s;
				}
				
				if (node.left && node.left.datatype && (node.left.id === "[" || (node.left.id === "." && !node.left.static && node.left.left.id !== "this"))) {
					var method = "";
					var value = "";
					if (node.id === "=") {
						method = ".putValue(";
						value = translate(node.right, "right");
						done = true;
					} else
					if (node.id === "+=") {
						method = ".autoInc(";
						value = translate(node.right, "right");
						done = true;
					} else
					if (node.id === "-=") {
						method = ".autoDec(";
						value = translate(node.right, "right");
						done = true;
					} else
					if (node.id === "*=") {
						method = ".autoMul(";
						value = translate(node.right, "right");
						done = true;
					} else
					if (node.id === "/=") {
						method = ".autoDiv(";
						value = translate(node.right, "right");
						done = true;
					} else
					if (node.id === "%=") {
						method = ".autoMod(";
						value = translate(node.right, "right");
						done = true;
					} else
					if (node.id === "++") {
						method = ".autoInc(";					
						value = "1";
						done = true;
					} else
					if (node.id === "--") {
						method = ".autoDec(";
						value = "1";
						done = true;
					}
					if (done) {
						s = s + translate(node.left, "left");
						s = s + method;
						if (node.left.id === "[") {
							s = s + "[";
							var i = 0;
							for ( ; i <	node.left.right.length-1 ; i++ ) {
								s = s + translate(node.left.right[i], context);
								s = s + ", ";
							}
							if (node.left.right.length > 0) {
								s = s + translate(node.left.right[i], context);
							}
							s = s + "]";
						} else {
							s = s + "'" + "__" + node.left.right.id + "'";
						}
						s = s + ", ";
						s = s + value;
						s = s + ", ";
						s = s + node.line;
						if (node.datatype == IntegerDatatype) s = s + ", true";
						s = s + ")";
					}
				}
				if (!done) {
					var closeParenthesis = false;
					if (node.datatype == IntegerDatatype) {
						if ( node.id === "/" || node.id === "%") {
							closeParenthesis = true;
							s = s + "parseInt(";
						}
						if ( node.id === "/=" || node.id === "%=") {
							// Convierto la autooperación en una operación normal
							node.id = node.id.charAt(0);
							closeParenthesis = true;
							// Añado la parte de asignación
							s = s + translate(node.left, context) + " = parseInt(";
						}
					}
					if (node.left) {
						s = s + translate(node.left, "right"); 
						s = s + " ";
					}
					s = s + node.id;
					if (node.right) {
						s = s + " ";
						if (node.id === "instanceof") s = s + node.right.id;
						else s = s + translate(node.right, "right");
					}
					if (closeParenthesis) s = s + ")";
				}
				if (node.parentesis) s = s + " )";
				return s;
			}
		} else
		if (node.type === "statement") {			
			var s = "";
			if (node.id === "(block)") {
				var s = "";
				s = s + intro(deep);
				s = s + "{";
				s = s + "\n";
				deep++;
				if (context === "(Constructor)") {
					s = s + intro(deep) + "this.__ObjectConstructor();\n";
				}
				s = s + translate(node.right, "");
				if (context === "(Constructor)") {
					s = s + intro(deep) + "return this;\n";
				}
				deep--;
				s = s + intro(deep);
				if (rContext.length > 0) s = s + "runtime.updateLoop(" + rContext[rContext.length-1].line + ");\n";
				s = s + "}";
				return s;
			} else
			if ( node.id === "for") {
				var s = "";
				s = s + "runtime.startLoop();\n";
				s = s + intro(deep);
				rContext.push(node);
				s = s + "for ";
				s = s + " ( ";
				var init = node.initializers ? translate(node.initializers, "for") : ";";
				if (node.initializers && node.initializers.statement && node.initializers.type !== "variable") init += " ; ";
				var condition = node.condition ? translate(node.condition, context) : " ";
				var action = translate(node.action, context);
				s = s + init;
				s = s + " ";
				s = s + condition;
				s = s + " ; ";
				s = s + action;
				s = s + " ) ";
				if (!node.body || node.body.id !== "(block)") {
					s = s + "{";
					s = s + translate(node.body, context);
					s = s + intro(deep);
					s = s + "  runtime.updateLoop(" + rContext[rContext.length-1].line + ");\n";
					s = s + "}";
				} else {
					s = s + translate(node.body, context);
				}
				s = s + "\nruntime.stopLoop();\n";
				rContext.pop();
			} else
			if (node.id === "while") {
				var s = "";
				s = s + "runtime.startLoop();\n";
				s = s + intro(deep);
				rContext.push(node);
				s = s + "while";
				s = s + " ( ";				
				s = s + translate(node.condition, context);
				s = s + " ) ";				
				if (!node.body || node.body.id !== "(block)") {
					s = s + "{";
					s = s + translate(node.body, context);
					s = s + "runtime.updateLoop(" + rContext[rContext.length-1].line + ");\n";
					s = s + "}";
				} else {
					s = s + translate(node.body, context);
				}
				s = s + "\nruntime.stopLoop();\n";
				rContext.pop();
			} else
			if (node.id === "do") {
				var s = "";
				s = s + "runtime.startLoop();\n";
				s = s + intro(deep);
				rContext.push(node);
				s = s + "do";
				if (!node.body || node.body.id !== "(block)") {
					s = s + "{";
					s = s + translate(node.body, context);
					s = s + "runtime.updateLoop(" + rContext[rContext.length-1].line + ");\n";
					s = s + "}";
				} else {
					s = s + translate(node.body, context);
				}
				s = s + "while";
				s = s + " ( ";				
				s = s + translate(node.condition, context);
				s = s + " );\n";				
				s = s + "\nruntime.stopLoop();\n";
				rContext.pop();
			} else
			if (node.id === "if") {
				var s = node.id;
				s = s + " ( ";			
				s = s + translate(node.condition, context);
				s = s + " ) ";				
				s = s + translate(node.yes, context);
				if (node.no) {
//					if (node.yes.id !== "(block)") s = s + " ; ";
					s = s + " else ";
					s = s + translate(node.no, context);
				}
			} else
			if (node.id === "switch") {
				var s = "switch";
				s = s + " ( ";				
				s = s + translate(node.condition, context);
				if (node.condition.datatype == StringDatatype) s = s + ".toString()";
				s = s + " ) ";				
				s = s + translate(node.body, context);
			} else
			if (node.id === "case") {
				var s = "";
				s += "case ";
				if (node.label.datatype == CharDatatype || node.label.datatype == StringDatatype) s = s + '"';
				s = s + node.label.value;
				if (node.label.datatype == CharDatatype || node.label.datatype == StringDatatype ) s = s + '"';
				s += ":";
			} else 
			if (node.id === "default") {
				var s = "";
				s += "default:";
			} else 
			if (node.id === "break") {
				var s = "";
				s += "break;";
			} else
			if (node.id === "continue") {
				var s = "";
				s += "continue;";
			} else
			if (node.id === "return") {
				var s = "return ";
				if (node.right) {
					s = s + translate(node.right, context);
				}
				s = s + " ; ";
			} else
			if (node.id === "(expression)") {
				var s = translate(node.right, context);
				s = s + ";";	
			} else {
				console.log("Falta caso para", node);
			}		
			for ( var i = 0 ; i < deep ; i++ ) s = "  " + s;
			return s;
		} else
		if (node.type === "identifier") {
			if (node.id === "[") {
				return accesoIndexado(node, context);				
			} else
			if (node.id === "new") {
				return operadorNew(node);
			} else
			if (node.id === "(call)") {
				return call(node, context);
			} else
			if (node.id === ".") {
				return accesoNombrado(node, context);
			} else
			if (node.id === "this") {
				var s = "this";
				return s;
			} else {				
				var s = "";
				if (node.member || node.method) {
					if (node.static) {
						var theclassid = "__" + node.scope.context.scope.context.id;
						s = s + theclassid + ".prototype.";
					} else {
						s = s + "this.";				
					}
				}
				/*
				if (node.predefined) s = s + "runtime.";
				else s = s + "__";
				*/
				if (!node.predefined) s = s + "__";
				if (node.id === "null") s = s + "NullObject";
				else s = s + node.id;
				if (node.method) s = s + "__" + node.version;
				return s;
			}
		} else
		if (node.type === "datatype") {
			var s = "function ";
			s = s + "__" + node.id + "()";
			s = s + " {";
			s = s + "\n";
			deep++;
			s = s + intro(deep);
			s = s + "__Object.call(this, '__" + node.id + "');\n";
			for ( var i = 0 ; i < node.body.length ; i++ ) {
				if (node.body[i].member && !node.body[i].static) {
					s = s + translate(node.body[i], context);
					s = s + "\n";
				}
			}
			s = s + "\n";
			deep--;
			s = s + intro(deep);
			s = s + "}\n";
			s = s + intro(deep);
			s = s + "__" + node.id + ".prototype = Object.create(__Object.prototype);\n";
			s = s + intro(deep);
			s = s + "__" + node.id + ".prototype.constructor = __" + node.id + ";\n\n";
			s = s + intro(deep);
			for ( var i = 0 ; i < node.body.length ; i++ ) {
				if (node.body[i].method || node.body[i].static) {
					s = s + translate(node.body[i], context);
					s = s + "\n";
				}
			}			
			return s;
		} else
		if (node.type === "variable" || node.type === "constant" || node.type === "function") {
			var s = "";
			if (node.datatype instanceof FunctionDatatype) {
				if (node.method) {
					var theclassid = "__" + node.scope.context.id;
					s = s + theclassid + ".prototype.";
				} else {
					s = s + "var ";
				}
				s = s + "__";
				if (node.id === "(Constructor)") {
					s = s + "Constructor";
					context = node.id;
				} else {
					s = s + node.id;
					if (node.method) context = "(method)";
				}
				if (node.method) s = s + "__" + node.version;
				s = s + " = function";
				s = s + "(";
				if (node.datatype.params) {
					/*
					if (node.method && node.id != "(Constructor)") {
						s = s + "__iJava__line";
						if (node.datatype.params.length > 0) s = s + ", ";
					}
					*/
					var i = 0;
					for ( i = 0 ; i < node.datatype.params.length-1 ; i++ ) {
						node.datatype.params[i].parameter = true;
						s = s + translate(node.datatype.params[i], context);
						s = s + ", ";
					}
					if (node.datatype.params.length > 0) {
						node.datatype.params[i].parameter = true;
						s = s + translate(node.datatype.params[i], context);
					}
				}
				s = s + ")";
				if (node.body) {
					s = s + translate(node.body, context);
				}				
			} else {
				if (node.static) {
					var theclassid = "__" + node.scope.context.id;
					s = s + theclassid + ".prototype.";
				} else
				if (node.member) {
					s = s + "this.";
				} else
				if (!node.parameter) {
					s = s + "var ";
				}
				s = s + "__" + node.id;
				s = s + " ";
				if (!node.parameter) s = s + " = ";				
				if (node.initialValue) {
					s = s + translate(node.initialValue, context);
				} else {
					if (!node.parameter) {
						s = s + node.datatype.getDefaultValue();
					}
				}
				if (!node.parameter) s = s + ";";
			}
			if (!node.parameter && context !== "for") s = s + intro(deep);
			return s;
		} else {
			console.log("Unknown error 2", node);
		}	
	};
	
	function operadorNew(node, context) {
		var s = "";
		if (node.datatype instanceof ArrayDatatype) {
			s = s + "new MyArray(";
			s = s + "[";
			var i = 0;
			for ( ; i <	node.args.length-1 ; i++ ) {
				s = s + translate(node.args[i], context);
				s = s + ", ";
			}
			if (node.args.length > 0) {
				s = s + translate(node.args[i], context);
			}
			s = s + "]";
			s = s + ", " + node.datatype.celltype.getDefaultInitializer();
			s = s + ")";
		} else {
			s = s + "(new ";
			s = s + "__" + node.basetype;
			s = s + "())";
			if (node.defaultConstructor) {
				s = s + ".__ObjectConstructor()";
			} else {
			 	s = s + ".__Constructor";
		 		s = s + "__" + node.version;
				s = s + "(";
				var i = 0;
				for ( i = 0 ; i <	node.args.length-1 ; i++ ) {
					s = s + translate(node.args[i], context);
					s = s + ", ";
				}
				if ( node.args.length > 0) s = s + translate(node.args[i], context);
				s = s + ")";
			s = "(function(name, line) { runtime.docall(name, line); var res = " + s + "; runtime.doreturn(name, line); return res; }.bind(this))('Constructor de " + node.basetype + "', " + node.line + ")";
	 		}
		}
		return s;
	}
	
	function call(node, context) {
		var s = "";
		s = s + translate(node.left, context);
		s = s + "(";
		var i = 0;
		for ( i = 0 ; i <	node.args.length-1 ; i++ ) {
			s = s + translate(node.args[i], context);
			s = s + ", ";
		}
		if ( node.args.length > 0) s = s + translate(node.args[i], context);
		s = s + ")";
		if (!node.left.predefined) {
			s = "(function(name, line) { runtime.docall(name, line); var res = " + s + "; runtime.doreturn(name, line); return res; }.bind(this))('" + node.left.id + "', " + node.line + ")";
		}		
		return s;
	}
	
	function accesoNombrado(node, context) {
		var s = "";

		if (node.static) {
			s = s + "__" + node.left.datatype.id + ".prototype";
			s = s + ".";
			s = s + "__" + node.right.id;
			if (node.method) s = s + "__" + node.version;
			if (node.args) {
				s = s + "(";
				var i = 0;					
				for ( i = 0 ; i <	node.args.length-1 ; i++ ) {
					s = s + translate(node.args[i], context);
					s = s + ", ";
				}
				if ( node.args.length > 0) s = s + translate(node.args[i], context);
				s = s + ")";
			}
		} else {
			if (node.left.id === "this") {
				s = s + "this.__" + node.right.id;
				if (node.method) {
					s = s + "__" + node.version;
					s = s + "(";
					var i = 0;
					for ( i = 0 ; i <	node.args.length-1 ; i++ ) {
						s = s + translate(node.args[i], context);
						s = s + ", ";
					}
					if ( node.args.length > 0) s = s + translate(node.args[i], context);
					s = s + ")";
				}
				return s;
			}
			if (node.method) {
				s = s + translate(node.left, context);
				s = s + ".execute('";
				s = s + "__" + node.right.id;
				s = s + "__" + node.version;
				s = s + "', [";
				var i = 0;
				for ( i = 0 ; i <	node.args.length-1 ; i++ ) {
					s = s + translate(node.args[i], context);
					s = s + ", ";
				}
				if ( node.args.length > 0) s = s + translate(node.args[i], context);
				s = s + "], ";
				s = s + node.line;
				s = s + ")";
			} else {
				s = s + translate(node.left, "right");
				if (context !== "left") {
					s = s + ".";
					s = s + "getValue('";
					s = s + "__" + node.right.id;
					s = s + "', ";
					s = s + node.line;
					s = s + ")";
				}
			}
		}	
		if (node.method) {
			s = "(function(name, line) { runtime.docall(name, line); var res = " + s + "; runtime.doreturn(name, line); return res; }.bind(this))('" + node.right.id + "', " + node.line + ")";
		}	
		return s;
	}	
	
	function accesoIndexado(node, context) {
		var s = "";
		s = s + translate(node.left, "right");
		if (context !== "left") {
			s = s + ".";
			s = s + "getValue(";
			s = s + "[";
			var i = 0;
			for ( ; i <	node.right.length-1 ; i++ ) {
				s = s + translate(node.right[i], context);
				s = s + ", ";
			}
			if (node.right.length > 0) {
				s = s + translate(node.right[i], context);
			}
			s = s + "]";
			s = s + ", ";
			s = s + node.line;
			s = s + ")";
		}
		return s;
	}
}
