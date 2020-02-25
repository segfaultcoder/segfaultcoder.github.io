// Es neceario incluir comentarios como tokens para añadir al beautify. 
// Hacer más inteligente la detección de keywords a medio como for( int a=0 ; y avisar de lo que falta a la estructura
'use strict';
function iJavaParser() {
	var errors = [];
	
	var warnings = [];
	
	var usedFunctions = [];
	
	var declaredFuncions = [];
	
	var usedImages = [];

	var keypoints = {
		useLiteral:false,
		hasArithmeticExpression:false,
		hasBooleanExpression:false,
		
		hasDeclaration:false,
		hasConstant:false,
		hasAssignment:false,

		useFunction:false,
		createFunction:false,
		hasRecursiveFunction:false,

		hasFor:false,
		hasWhile:false,
		hasDoWhile:false,

		hasIf:false,
		hasElse:false,
		hasSwitch:false,

		useArray:false,
		useArrayAsParameter:false,
		returnArray:false,
		
		createObjects:false,
		defineClasses:false,
		defineMethods:false
	};
	
	var source;
	
	var globalScope;
	var currentScope;
	
	var symbols = {};

	var tokens;	
	var nextToken;	
	var token;
	
	/*
	{
		id: void, byte, short, int, long, float, double, boolean, char, string, MiTipo
		category: none, numeric, boolean, alphanumeric, array, function, composite		
		// para arrays
		dimensions: numero de dimensiones
		celltype: tipo de dato de cada celda
		// para funciones además
		params: lista de datatypes
		rtype: tipo de dato que devuelve la función
		// para composite
		properties: lista de datatypes
	}
*/	
	var original_symbol = {
		error: function (message) {
			var t = {
				id: this.id,
				message : message.replace("'(end)'", "el final del programa"),
				line: this.line,
				col: this.col,
				severity: "error"
			};
			throw t;
		},
		warning: function(message) {
			var t = {
				id: this.id,
				message : message.replace("'(end)'", "el final del programa"),
				line: this.line,
				col: this.col,
				severity: "warning"
			};
			warnings.push(t);
		}
	};
	
/*	
	token type: identifier, number, string, char, operator
	symbol type: identifier, datatype, operator, literal, keyword
	element type: identifier
	node type: declaration, statement, identifier, value
*/	

	var symbol = function(id, nud, lbp, led) {
		var sym = symbols[id];
		if (!sym) {
			sym = Object.create(original_symbol);
			sym.id = id;
			symbols[id] = sym;
		}
		sym.lbp = sym.lbp || lbp;
		sym.nud = sym.nud || nud;
		sym.led = sym.led || led;
		return sym;
	};
	
	var interpretToken = function (token) {
		var sym;
		// Primero analizamos si son números, cadenas o caracteres para no confundirlas
		// con símbolos, operadores o palabras reservadas
		if (token.type === "integer") {
			sym = Object.create(symbols["(literal)"]);
			sym.id = token.value;
			sym.type = "literal";
			sym.datatype = IntegerDatatype;
		} else		
		if (token.type === "real") {
			sym = Object.create(symbols["(literal)"]);
			sym.id = token.value;
			sym.type = "literal";
			sym.datatype = DoubleDatatype;
		} else
		if (token.type === "string") {
			sym = Object.create(symbols["(literal)"]);
			sym.id = token.value;
			sym.type = "literal";
			sym.datatype = StringDatatype;//new StringDatatype();//Object.create(datatypes[datatype]);
		} else
		if (token.type === "char") {
			sym = Object.create(symbols["(literal)"]);
			sym.id = token.value;
			sym.type = "literal";
			sym.datatype = CharDatatype;//Object.create(datatypes[datatype]);
		} else
		if (token.type === "(end)") {
			//EOF
			sym = Object.create(symbols[token.type]);
			sym.id = "(end)";
			sym.type = token.type;
		} else
		if (token.type === "operator") {
			var template = symbols[token.value];
			if (!template) {
				token.error("Símbolo '"+token.value+"' no reconocido.");				
			}
			sym = Object.create(template);
			sym.type = sym.stm ? "keyword" : "operator";
			sym.id = token.value;
		} else
		if (token.type === "identifier") {
			// Ahora busco si es un tipo de dato registrado. 
			// Busco con find que devuelve null si hay múltiples declaraciones porque eso no puede pasar con un tipo propio, es decir, una clase sólo puede estar definida una vez.
			var element = currentScope.find(token.value);
			if (element) {
				if (element.type === "datatype") { //datatypes[token.value]) {
					sym = Object.create(symbols["(type)"]);
					sym.type = "datatype";
					sym.datatype = element;
					sym.id = token.value;
				} else
				if (element.type === "constant") {
					sym = Object.create(symbols["(identifier)"]); // Object.create(symbols["(literal)"]);
					sym.id = element.id; // element.value
					sym.type = "identifier"; // literal
					sym.constant = true;
					sym.datatype = element.datatype;
				} else {
					// Se trata de un identificador ya declarado
					sym = Object.create(symbols["(identifier)"]);
					sym.type = "identifier";
					sym.id = token.value;
				}
			} else
			// Después busco si es una palabra reservada o un operador
			if (symbols[token.value] && typeof symbols[token.value] !== "function") {
				sym = Object.create(symbols[token.value]);
				// Algunos operadores tienen lexema. Por ejemplo new
				sym.type = sym.stm ? "keyword" : "operator";
				sym.id = token.value;
			} else {
				// Si no es un simple identificador
				sym = Object.create(symbols["(identifier)"]);
				sym.type = "identifier";
				sym.id = token.value;
			}
		}
		sym.line = token.line;
		sym.col = token.col;
		sym.from = token.from;
		sym.to = token.to;
		return sym;
	};
	
	var start = function() {
		nextToken = 0;
		token = interpretToken(tokens[0]);
	};
	
	var advance = function (expected, explanation) { 
		explanation = explanation || "";
		if (expected && token.id !== expected) {
			tokens[nextToken-1].error("Después de '" + tokens[nextToken-1].value + "' se esperaba '" + expected + "' pero se encontró '" + token.id + "'. " + explanation);
		}
		nextToken++; 
		if (nextToken >= tokens.length) return token.error("Se ha alcanzado el final del programa a mitad de su análisis.");
		token = interpretToken(tokens[nextToken]);	
		return token; 
	};
	
	var lookahead = function (d) {
		if (nextToken+d >= tokens.length) return token.error("Se ha alcanzado el final del programa a mitad de su análisis.");
		return interpretToken(tokens[nextToken+d]);
	};
	
	var expression = function (rbp) {
		var left, t = token;		
		advance();
		if (!t.nud) t.error("Se ha encontrado el símbolo '" + t.id + "' pero no parece tener sentido donde está escrito.");
		left = t.nud(t);	 
		while (rbp < token.lbp) {
		t = token;	// t tiene el operador y token el segundo operando si lo hay
		advance();
		if (!t.led) t.error("Se ha encontrado el símbolo '" + t.id + "' pero no parece tener sentido donde está escrito.");
			left = t.led(left);
		}
		return left;
	};
	
	var infix = function (id, lbp, rbp, led) {
		rbp = rbp || lbp;
		symbol(id, null, lbp, led || function (left) {
			var right = expression(rbp);	
			if (id == "||" || id == "&&" || id == "==" || id == "!=" || id == ">" || id == "<" || id == ">=" || id == "<=") keypoints.hasBooleanExpression = true;
			else keypoints.hasArithmeticExpression = true;
			var node = {
				id: id,
				type: "value",
				left: left,
				right: right,
				line: this.line,
				col: this.col,
				from: left.from,
				to: right.to,
				error: this.error,
				warning: this.warning
			};
			return node;
		});
	};
	
	var assignment = function (id) {
		infix(id, 10, 9, function(left) {
			var right = expression(9);
			keypoints.hasAssignment = true;
			var node = {
				id: id,
				type: "value", 
				statement: true,
				left: left,
				right: right,
				from: left.from,
				to: right.to,
				line: this.line,
				col:this.col,
				error: this.error,
				warning: this.warning
			};
			return node;
		});
	};

	var prefix = function (id, rbp) {
		symbol(id, function () {
			var from = token.from;
			var right = expression(rbp);
			if (id == "!" ) keypoints.hasBooleanExpression = true;
			else keypoints.hasArithmeticExpression = true;
			var node = {
				id: id,
				type: "value",
				left: null,
				right: right,
				line: this.line,
				col: this.col,
				from: from,
				to: right.to,
				error: this.error,
				warning: this.warning
			};
			return node;
		});
	};

	var constant = function (id, datatype, value) {	
		var identifier = {};//Object.create(symbols["(identifier)"]);
		identifier.id = id;
		identifier.type = "constant";
		identifier.datatype = datatype;//Object.create(datatypes[datatype]);
		identifier.value = value;
		identifier.line = 0;
		identifier.col = 0;
		identifier.from = 0;
		identifier.to = 0;
		identifier.lineFirstAssignment = 0;
		identifier.colFirstAssignment = 0;
		currentScope.define(identifier);
	};
	
	var system_variable = function (id, datatype, value) {	
		var identifier = {};//Object.create(symbols["(identifier)"]);
		identifier.id = id;
		identifier.type = "variable";
		identifier.datatype = datatype;//Object.create(datatypes[datatype]);
		identifier.value = value;
		identifier.line = 0;
		identifier.col = 0;
		identifier.from = 0;
		identifier.to = 0;
		identifier.lineFirstAssignment = 0;
		identifier.colFirstAssignment = 0;
		currentScope.define(identifier);
	};
	
	var library_function = function(id, datatype) {
		var identifier = {};//Object.create(symbols["(identifier)"]);
		identifier.id = id;
		identifier.type = "function";
		identifier.datatype = datatype;//Object.create(datatypes["(function)"]);
		identifier.line = 0;
		identifier.col = 0;
		identifier.from = 0;
		identifier.to = 0;
		currentScope.define(identifier);
	};
	
	var library_class = function(id) {
		var identifier = Object.create(symbols["(identifier)"]);
		identifier.id = id;
		identifier.line = 0;		
		identifier.col = 0;
		identifier.from = 0;
		identifier.to = 0;
		var element = new ClassDatatype(identifier);		
		element.body = [];
		element.internalScope = new Environment(currentScope, element);
		element.statment = true;	
		currentScope.define(element);
		return element;		
	};
	
	var keyword = function(id, stm) {
		var sym = symbol(id);
		sym.lbp = 0;
		sym.stm = stm || function(itself) {
			token.error("No se ha definido ninguna acción para la palabra reservada '" + id + "'.");
		};
	};
	
	var statement = function() {
		var t = token;
		if (t.type === "keyword") {
			advance();
			return t.stm(t);
		}
		var node = expression(0);
		if (node.type === "variable" || node.type === "constant" || node.type === "function") {
			return node;
		}
		// Una expresión sólo es válida como sentencia si es una asignación, una modificación con ++ o --, una invocación a función, o una creación de array con new
		if (node.statement) {
			advance(";");
			return {
				id: "(expression)",
				type: "statement",
				statement: true,
				from: node.from,
				to: node.to,
				right: node,
				line: t.line,
				error: t.error,
				warning: t.warning
			};
		} else {
			t.error("La expresión '" + source.substring(node.from, node.to) + "' no es una asignación, ni una invocación a función.");
		}
	};
	
	var statements = function () {
		var a = [], s;
		while (true) {
			if (token.id === "(end)") break;
			s = statement();
			if (s) a.push(s);
		}
		return a;
	};
	
	
	var init = function() {
		// Creamos el ámbito global
		globalScope = new Environment();
		currentScope = globalScope;
	
		infix("(", 100, 99, function (left) {
			var args = [];
			if (left.type !== "identifier") token.error("Sólo se pueden invocar identificadores");
			var to;
			var i = 0;
			while (token.id !== ")") {
				var arg = expression(0);
				if (arg.type !== "value" && arg.type !== "identifier") left.error("Al invocar a una función se deben pasar los valores que se desea usar como parámetro. No hay que indicar el tipo de los mismos, eso se hace en la declaración de la función.");
				i++;
				args.push(arg);
				if (token.id !== ",") break;				
				advance(",", "La invocación de una función debe incluir la lista de argumentos separados por comas y encerrados entre paréntesis");
			}
			to = token.to;
			advance(")", "La invocación de una función debe incluir la lista de argumentos separados por comas y encerrados entre paréntesis");
			if (usedFunctions.indexOf(left.id) < 0) usedFunctions.push(left.id);
			keypoints.useFunction = true;
			var node = {
				id: "(call)",
				type: "identifier", // Sintácticamente siempre correcto, semánticamente depende del tipo de dato devuelto
				statement: true,
				left: left, // calle
				scope: currentScope,
				args: args,
				from: left.from,
				to: to,
				line: left.line,
				col: left.col,
				error: left.error
			};
			if (currentScope.context && currentScope.context.id === left.id) {
				keypoints.hasRecursiveFunction = true;
			}
			// TODO: ESTO ES MEJOR PARA SEMANTIC CHECK
			if (node.left.id === "image" && node.args.length > 2) {
				var img = node.args[0];
				if (img.id !== "(literal)") {
					node.error("Indica la imagen escribiendo entre comillas dobles su localización.");
				}
				if (usedImages.indexOf(node.args[0].value) < 0 ) usedImages.push(node.args[0].value);
			}
			return node;
		});
		
		infix("[", 100, 99, function (left) {
			var to;
			var indices = [];
			
			if (left.type !== "identifier") token.error("No se puede usar '" + left.id + "' como si fuera un array.");								
			while (token.id !== "]") {
				var arg = expression(0);
				indices.push(arg);
				if (token.id !== "]") token.error("Hay que cerrar corchete");
				to = token.to;
				advance();
				if (token.id != "[") break;
				advance("[");
			}
			
			var node = { // Object.create(left);
					id: this.id,
					type: "identifier", // Sintácticamente siempre correcto, semánticamente depende del tipo de dato devuelto
					left: left,
					right: indices,	
					line: left.line,
					col: left.col,				
					from: left.from,
					to: to,
					scope: left.scope,
					error: left.error
			};
			return node;
		});
		
//		symbol(".");
	
		infix(".", 100,99, function (left) {
			var to = token.to;
			if (left.type !== "identifier" && left.type !== "datatype" && !(left.datatype instanceof ClassDatatype)) {
				left.error("Sólo se puede acceder a atribunos o invocar métodos sobre variables que contengan objetos o sobre sus clases para métodos y miembros estáticos.");
			}
			if (left.type === "datatype" && !(left.datatype instanceof ClassDatatype)) left.error("Sólo se puede acceder a atribunos o invocar métodos sobre variables que contengan objetos o sobre sus clases para métodos y miembros estáticos.");
			
			var right = token;
			if (right.type !== "identifier") left.error("Detrás del punto debes poner el nombre de un miembro o de un método y '" + right.id + "' no es ninguna de esas dos cosas.");
			var args = null;
			advance();			
			if (token.id === "(") {				
				args = [];
				advance();
				while (token.id !== ")") {
					var arg = expression(0);
					args.push(arg);
					if (token.id !== ",") break;
					advance(",", "La invocación de una función debe incluir la lista de argumentos separados por comas y encerrados entre paréntesis");
				}
				advance(")");
			}
			var node = {
				id: this.id,
				type: "identifier", // Sintácticamente siempre correcto, semánticamente depende del tipo de dato devuelto
				left: left,
				right: right,
				args: args,
				statement: args ? true : null,
				scope: currentScope,
				from: left.from,
				to: to,
				line: left.line,
				col: left.col,
				error: this.error
			};
			return node;
		});

		infix("++", 90, 89, function(left) {
			// No es necesario buscar left.id porque ya lo habrá hecho (identifier)
			if (left.type !== "identifier") this.error("El operador " + this.id + " sólo se puede aplicar a variables.");
			keypoints.hasAssignment = true;
			var node = {
				id: this.id,
				type: "value",
				statement: true,
				left: left,
				right: null,
				from: left.from,
				to: token.to,
				line: left.line,
				col: left.col,
				error: this.error
			};		
			return node;	
		});
		
		infix("--", 90, 89, function(left) {
			if (left.type !== "identifier") this.error("El operador " + this.id + " sólo se puede aplicar a variables.");
			keypoints.hasAssignment = true;
			var node = {
				id: this.id,
				type: "value",
				statement: true,
				left: left,
				right: null,
				from: left.from,
				to: token.to,
				line: left.line,
				col: left.col,
				error: this.error
			};			
			return node;	
		});
		
		/*
		// Esto es casi equivalente a lo de abajo pero con lo de abajo puedo personalizar la comprobación de que lo que se incrementa sea una variable y no un valor		
		prefix("++", 80);
		prefix("--", 80);
		*/
		/*
		Eliminados porque sólo causan confusión y problemas
		symbol("++", function(itself) {
			var right = expression(80);
			if (right.type !== "identifier") this.error("El operador " + this.id + " sólo se puede aplicar a variables.");
			keypoints.hasAssignment = true;
			var node = {
				id: this.id,
				type: "value",
				statement: true,
				left: null,
				right: right,
				from: itself.from,
				to: right.to,
				line: this.line,
				col: this.col,
				error: this.error
			};			
			return node;			
		}, 80);
		
		symbol("--", function(itself) {
			var right = expression(80);
			if (right.type !== "identifier") this.error("El operador " + this.id + " sólo se puede aplicar a variables.");
			keypoints.hasAssignment = true;
			var node = {
				id: this.id,
				type: "value",
				statement: true,
				left: null,
				right: right,
				from: itself.from,
				to: right.to,
				line: this.line,
				col: this.col,
				error: this.error
			};			
			return node;			
		}, 80);
		*/
		prefix("-", 70);
		prefix("!", 70);

		symbol("new", function(itself) {
			var to;
			var basetype = token.id;
			var args = [];
			var datatype = null; 			
			advance();
			if (token.id !== "[" && token.id !== "(") token.error("Se esperaba tamaño de la primera dimensión o parámetros del constructor");
			if (token.id === "[") {
				datatype = new ArrayDatatype(0); //Object.create(datatypes["(array)"]);
				while(token.id === "[") {				
					datatype.dimensions++;
					advance("[", "Al crear un array se debe especificar su tamaño de cada dimensión como un entero encerrado entre corchetes '[' y ']'.");
					var node = expression(0); 
					args.push(node);
					to = token.to;
					advance("]");
				}		
				to = token.from;
			} else {
				datatype = null;//new ClassDatatype(basetype);
				advance("(");
				while(token.id !== ")") {				
					var node = expression(0); 
					args.push(node);
					to = token.to;
					if (token.id !== ",") break;
					advance(",");
				}		
				advance(")");
				to = token.from;
				keypoints.createObjects = true;
			}
			return {
				id: "new",
				type: "identifier",
				basetype: basetype,
				datatype: datatype, 
				statement: true,
				scope: currentScope,
				from: this.from,
				to: to,
				args: args,
				line: this.line,
				col: this.col,
				error: this.error
			};
		});				

		infix("*", 60); 
		infix("/", 60); // Aseguramos que parseInt se aplica a las divisiones exclusivamente
		infix("%", 60);

		infix("<<", 60);
		infix(">>", 60);
		infix("&", 60);
		infix("|", 60);
		infix("^", 60);
		
		infix("+", 50);
		infix("-", 50);

		infix("<", 45, 44);
		infix(">", 45, 44); 
		infix("<=", 45, 44);
		infix(">=", 45, 44);
		
		infix("instanceof", 45, 44, function(left) {
			var right = token;
			// TODO: Detectar si es una clase, o al menos un identificador aquí y también en semantic
			advance();
			return {
				id: "instanceof",
				type: "value",
				datatype: BooleanDatatype,
				left: left,
				right: right,
				line: this.line,
				col: this.col,
				from: left.from,
				to: right.to,
				error: this.error			
			}
		}); 

		infix("==", 40, 39); 
		infix("!=", 40, 39);

		infix("&&", 35, 34);
		infix("||", 30, 29); 

		assignment("="); // 10
		assignment("+=");
		assignment("-=");
		assignment("*=");
		assignment("/=");
		assignment("%=");
		
		symbol(",");
		symbol(":");
		symbol(")");
		symbol("}");
		symbol("[");
		symbol("]");
		symbol("(end)");

		// ; es una palabra reservada pues se considera statement
		keyword("try", function(itself) {
			itself.error("La palabra '" + itself.id + "' está reservada y no puede utilizarse en ninguna parte del programa.");
		});
		
		keyword(";", function(itself) {
			return null;
		});

		keyword("{", function(itself) {
			var body = [];
			var from = token.from;
			currentScope = new Environment(currentScope);
			while (token.id !== "}" && token.id !== "(end)") {
				var s = statement();
				if (s) body.push(s);
			}
			currentScope = currentScope.getParent();
			var to = token.to;
			advance("}");
			return {
				id: "(block)",
				type: "statement",
				statement: true,
				from: from,
				to: to,
				right: body,
				line: itself.line,
				col: itself.col,
				error: this.error,
				warning: this.warning
			};	
		});

		infix("?", 20, 19, function (left) {
			var yes = expression(0);
			advance(":", "El operador '?' se se usa así: exp1 ? exp2 : exp3. El valor de exp1 debe ser booleano, y el de exp2 y 3 deben ser iguales.");
			var no = expression(0);
			var node = {
				id: this.id,
				type: "value", //node.type,
				condition: left,
				yes: yes,
				no: no,
				from: left.from,
				to: no.to,
				line: this.line,
				col:this.col,
				error: this.error
			};
			return node;
		});

		symbol("(literal)", function(itself) {
			keypoints.useLiteral = true;
			return {
				id: "(literal)",
				type: "value",
				datatype: this.datatype,
				value: this.id,
				from: this.from,
				to: this.to,
				line:this.line,
				col:this.col,
				error: this.error
			};
		});
		
		symbol("(identifier)", function (itself) {
			// Si estamos usando un tipo aún sin definir para hacer una declaración usamos la función que se encarga de ello
			// Aquí nunca puede aparecer un constructor pues, al haber definido primero la clase, se trata en la regla para tipos
			if ((token.type === "identifier") || 
			    (token.id === "[" && lookahead(1).id === "]")) {
				var f = symbols["(type)"];
				var node = f.nud(itself);
				if (node.type !== "variable" && node.type !== "constant" && node.type !== "function") {
					node.error("Se esperaba una declaración.");
				}
				return node;
			}
			var node = {
				id: this.id,
				type: "identifier",
				constant: this.constant,
				from: this.from,
				scope: currentScope,
				to: this.to,
				line: this.line,
				col: this.col,
				error: itself.error
			};
			return node;
		});
		
		var parseCurlies = function(datatype) {
			var values = [];
			advance("{");
			while (token.id !== "}") {
				var node = null;
				if (token.id === "{") {
					datatype.dimensions++;
					node = parseCurlies(datatype);
				} else {
					node = expression(0);
				}
				values.push(node);
				if (token.id === ",") advance(",");	
				else if (token.id != "}") token.error("Se esperaba '}' o ',' en lugar de '" + token.id + "'.");
			}
			advance("}");
			return values;
		};
		
		var parseInitializer = function() {
			var right = null;
			var itself = token;
			var datatype = new ArrayDatatype(0);//Object.create(datatypes["(array)"]);		
			var from = token.from;
			var line = token.line;
			var col = token.col;
			right = parseCurlies(datatype);
			var to = token.to-1;
			return {
				id: "{...}",
				type: "value",
				right: right,
				from: from,
				to: to,
				line: line,
				col: col,
				error: token.error
			};
		};
		
		symbol("(type)", function(itself) {
			var identifier = null;
			var entry = null;
			var basetype = null;
			var datatype = null;
			
			// Invocación de método estático
			if (token.id === "." && lookahead(1).type === "identifier") {
				advance();
				var f = symbols["."];
				/**
					* Para que el nombre de una clase, que fue reconocida por interpretToken, se use como receptor de un método
					* es necesario cambiar el tipo del token a identifier si no sería datatype
					*/					
				itself.type = "identifier";
				itself.scope = currentScope;
				itself.error = this.error;
				var node = f.led(itself);
				return node;
			}
			if (itself.type === "datatype") {
				datatype = itself.datatype;
			} else {
				if (itself.type === "identifier") {
					var element = currentScope.find(itself.id);
					if (element) {
						if (element.type === "datatype") {
							datatype = element;
						} else {
							itself.error("No se puede usar '" + itself.id + "' como si fuera un tipo de dato.");
						}
					}
				}
			}
			basetype = itself.id;
			var initialValue = null;
			var isArray = false;
			var badArrayFunction = false;
				
			if (token.type === "identifier" && lookahead(1).id === "[" && lookahead(2).id === "]") {
				// Declaración de arrays tipo: DataType name[]
				if (basetype === "void") {
					itself.error("Error al tratar de declarar variables de tipo void.");
				}
				var dims = 0;
				var identifier = token;
				advance();
				while (token.id === "[" && lookahead(1).id === "]") {
					dims++;
					advance("["); advance("]");
				}
				datatype = new ArrayDatatype(dims, datatype);
				entry = new Declaration(token, basetype, datatype);				
				isArray = true;
				badArrayFunction = true;
				keypoints.useArray = true;
			}
			if (token.type=== "identifier" && lookahead(1).id === "[" && lookahead(2).type === "(literal)" && lookahead(3).id === "]") {
				token.error("Los arrays se declaran sin indicar su tamaño. Eso se hace al crearlos con 'new'.");
			}
			if (token.id === "[" && lookahead(1).type === "(literal)" && lookahead(2).id === "]") {
				token.error("Los arrays se declaran sin indicar su tamaño. Eso se hace al crearlos con 'new'.");
			}
			if (token.id === "[" && lookahead(1).id === "]") {
				// Declaración de arrays tipo: DataType []name
				if (itself.id === "void") {
					identifier.error("Error al tratar de declarar variables de tipo void.");
				}
				var dims = 0;
				while (token.id === "[" && lookahead(1).id === "]") {
					dims++;
					advance("["); advance("]");
				}
				if (token.type !== "identifier") {
					var anex = "";
					if (token.type === "datatype") anex = " ya que es el nombre de un tipo de dato";
					token.error("Es necesario especificar el nombre de la variable a continuación de su tipo. La palabra '" + token.id + "' no es un nombre válido" + anex + ".", itself.line, itself.col, itself.from, itself.to);
				}
				identifier = token;
				datatype = new ArrayDatatype(dims, datatype);		
				entry = new Declaration(identifier, basetype, datatype);		
				isArray = true;
				advance();
				keypoints.useArray = true;
			}
			var method = currentScope.context && currentScope.context.type === "datatype";
			if (!isArray) {
				// Si el identificador es un nombre de clase y estamos en el contexto de esa clase y hay un paréntesis: constructor
				if (method && currentScope.context.id === itself.id && token.id === "(") {
					identifier = itself;
					identifier.id = "(Constructor)";
					datatype = null;
				} else {
					if (token.type !== "identifier") {
						var anex = "";
						if (itself.type === "datatype") anex = " ya que es el nombre de un tipo de dato";
						itself.error("Es necesario especificar el nombre de la variable o función a continuación de su tipo. La palabra '" + token.id + "' no es un nombre válido" + anex + ".");
					}				
					identifier = token;
					advance();
				}				
			}
			if ( token.id === "(" ) {
				if (badArrayFunction) {
					identifier.error("Para declarar una función que devuelve un array se deben colocar las parejas de corchetes a la izquierda del nombre de la función.");
				}
				if (!method && currentScope.context) {
					 identifier.error("No se pueden definir funciones dentro de funciones.");
				}
				if (datatype && datatype instanceof ArrayDatatype) keypoints.returnArray = true;
				// Comprobar si ya exise otro elemento con el mismo id en el mismo contexto.
				// método igual en el mismo contexto
				var other = currentScope.find(identifier.id, currentScope.context);
				if (other && (!method || other.type !== "function")) {
					identifier.error("El identificador '" + other.id + "' ya está siendo usado en la declaración de la línea " + other.line + ".");
				}			

				// Registrar en el scope la nueva función
				var datatype = new FunctionDatatype(datatype);
				entry = new Declaration(identifier, basetype, datatype);
				entry.type = "function";
				currentScope.define(entry);
				currentScope = new Environment(currentScope, entry);
				entry.body = [];
				entry.datatype.params = [];				
				advance("(");
				while (token.id !== ")") {
					var param = expression(0);						
					if (param.type !== "variable") { 
						identifier.error("Error al declarar la función " + identifier.id + ". Cada parámetro debe consiste en un tipo de dato seguido de un nombre.");
					}
					param.lineFirstAssignment = param.line;
					param.colFirstAssignment = param.col;
					entry.datatype.params.push(param);						
					if (param.datatype instanceof ArrayDatatype) {
						keypoints.useArrayAsParameter = true;
					}
					if (token.id === ",") advance(",");
				}
				advance(")", "Es necesario terminar la lista de parámetros de la función '" + identifier.id + "' con un ) y darle cuerpo.");
				if (itself.id === "void" && identifier.id == "main" && !method) {
					if (isArray || entry.datatype.params.length > 0) {
						identifier.error("La función principal se declara así 'void  main().'");						
					}
				}
				entry.body = statement();
				if (!entry.body || entry.body instanceof Array || entry.body.id !== "(block)") identifier.error("Es necesario darle un cuerpo a la función '" + identifier.id + "', es decir, código entre una pareja de símbolos '{' y '}'.");
				if (entry.body.right.length === 0) {
					identifier.warning("La función '" + identifier.id + "' se ha declarado correctamente pero no hace nada.");
				}
				var to = token.to;

				currentScope = currentScope.getParent();
					
				// Devolver el nodo del árbol de parseo
				if (identifier.id !== "main") keypoints.createFunction = true;
				if (!method) declaredFuncions.push(identifier.id);
				entry.method = method;
				entry.visibility = "public";
				entry.static = false;
				entry.statemet = true;
				entry.from = itself.from;
				entry.to = to;
				entry.error = identifier.error;			
				entry.warning = identifier.warning;			
				return entry;
			} else
			if ( token.id === "=" ) {
				advance("=");
				var node = null;
				if (token.id === "{") {
					if (!isArray) token.error("Sólo se puede usar el inicializador '{...}' cuando la variable es de tipo array.");
					node = parseInitializer();
				} else {
                                        if ( token.type == "datatype" ) token.error("En la inicialización de una variable no hay que usar nombres de tipos de datos como '" + token.id + "'");
					node = expression(0);
				}
				initialValue = node;
			}
			if (itself.id === "void") {
				identifier.error("Error al tratar de declarar la variable o parámetro '" + identifier.id + "' de tipo 'void'.");
			}
			// Comprobar si ya exise otro elemento con el mismo id en el mismo contexto.
			// método igual en el mismo contexto
			var other = currentScope.find(identifier.id, currentScope.context);
			if (other) {
				identifier.error("El nombre '" + other.id + "' ya está siendo usado en la declaración de la línea " + other.line + ".");
			}			
			// Registrar en el scope la nueva variable
			entry = new Declaration(identifier, basetype, datatype);
			entry.type = "variable";
			entry.lineFirstAssignment = initialValue ? identifier.line : null;
			entry.colFirstAssignment = initialValue ? identifier.col : null;
			if (currentScope.context && currentScope.context.id === identifier.id) {
					identifier.error("Error al tratar de declarar una variable con el nombre de la función donde se encuentra.");
			}
			entry.member = currentScope.context && currentScope.context.type === "datatype";
			entry.visibility = "public";
			entry.static = false;
			entry.statement = true;
			entry.initialValue = initialValue;
			entry.from = itself.from;
			entry.to = token.from;
			entry.error = identifier.error;			
			entry.warning = identifier.warning;			
			currentScope.define(entry);
			keypoints.hasDeclaration = true;
			// Hay más variables en la misma declaración?

/*
			if (token.id === "," && lookahead(1).type !== "datatype" && (lookahead(1).type === "identifier" || lookahead(1).id === "[") ) {
				console.log(token, lookahead(1));
				identifier.error("Declara una variable en cada renglón.");
			}
		*/
			if (token.id !== ";" && token.id !== "," && token.id !== ")") identifier.error("Es necesario terminar la declaración de '" + identifier.id + "' con un ';'.");
			return entry;
		});
		
		// Casting o expresiones anidadas
		symbol("(", function (itself) {
			var node;
			var to;
			var basetype = null;
			var datatype = null;
			if (token.type === "identifier" || token.type === "datatype") {
				if (lookahead(1).id === ")" && 
				     ( (lookahead(2).type === "operator" && lookahead(2).id === "(") || 
				       (lookahead(2).type === "operator" && lookahead(2).id === "-") || 
				       (lookahead(2).type === "operator" && lookahead(2).id === "!") || 
				       (lookahead(2).type !== "operator" && lookahead(2).id !== ";") 
				     ) 
				   ) {
					basetype = token.id;
					advance();
					advance();
					node = expression(0);
					to = node.to;
				} else
				if (lookahead(1).id === "[" && lookahead(2).id === "]") {
					var i = 1;
					while (lookahead(i).id === "[" && lookahead(i+1).id === "]") i = i + 2;
					if (lookahead(i).id === ")") {
						basetype = token.id;
						datatype = new ArrayDatatype((i-1)/2);
						nextToken += i;
						advance();
						node = expression(0);
						to = node.to;
					}
				}
			}
			if (basetype != null) {
				return {
					id: "(cast)",
					type: "value",
					basetype: basetype,
					datatype: datatype,
					scope: currentScope,
					line: this.line,
					col: this.col,
					from: itself.from,
					to: to,
					right: node,
					error: this.error
				};				
			} else {
				node = expression(0);
				to = token.to;
				advance(")", "Se esperaba cierre de paréntesis ligado con el que está en la línea " + itself.line + " columna " + itself.col + ".");
				node.parentesis = true;
				node.to = to;
				return node;				
			}
		});

		symbol("final", function(itself) {
//			if (!datatypes[token.id]) itself.error("Para declarar una constante debes especificar su tipo tras la palabra reservada 'final'. En su lugar se ha encontrado '" + token.id + "'.");
			var node = expression(0);
			if (node.type !== "variable") itself.error("Se esperaban una declaración de variable.");
			if (!node.initialValue) itself.error("Es necesario dar un valor a la constante '" + node.id + "'.");
			node.type = "constant";
			keypoints.hasConstant = true;
			node.from = itself.from;
			return node;
		});
						
		keyword("if", function(itself) {
			advance("(");
			if (token.id === ")") itself.error("En la sentencia 'if' necesario incluir una expresión de tipo 'booleano' entre paréntesis.");
			var condition = expression(0);
			advance(")");
			var sentence1 = statement();
			var sentence2;
			if (token.id === ";" && sentence1.type === "statement") advance(";");
			if (token.id === "else") {
				advance("else");
				sentence2 = statement();
				keypoints.hasElse = true;
			}
			keypoints.hasIf = true;
			var node = {
				id: itself.id,
				type: "statement",
				from: itself.from,
				to: sentence2 ? sentence2.to : sentence1 ? sentence1.to : condition.to,
				condition: condition,
				yes: sentence1,
				no: sentence2,
				line: itself.line,
				error: this.error
			};
			return node;
		});
		
		keyword("else", function(itself) {
			itself.error("La palabra reservada 'else' sólo se puede utilizar para especificar qué hacer cuando no se cumple la condición de un 'if'.");
		});
		
		keyword("for", function(itself) {
			var to;
			advance("(");//, "La sentencia for tiene la forma for ( a ; b ; c ) { instrucciones } siendo obligatorio poner los paréntesis y los puntos y coma. La parte a se utiliza para inicializar variables que se usarán en el bucle. La parte b debe ser una expresión de tipo booleano. La parte c debe ser una expresión cualquiera." );
			var initializers = null;
			currentScope = new Environment(currentScope);
			if (token.id !== ";") {
				initializers = expression(0);
			}
			advance(";");
			var condition = null;
			if (token.id !== ";") {
				condition = expression(0);
			}
			advance(";");
			var action = null;
			if (token.id !== ")") {
				action = expression(0);
			}
			to = token.to;
			advance(")");
			var body = statement();
			if (body) to = body.to;
			currentScope = currentScope.getParent();
			keypoints.hasFor = true;
			var node = {
				id: itself.id,
				type: "statement",
				from: itself.from,
				to: to,
				initializers: initializers,
				condition: condition,
				action: action,
				body: body,
				line: itself.line,
				error: this.error
			};
			return node;
		});
		
		keyword("while", function(itself) {			
			var to;
			advance("(");// "La sentencia while tiene la forma while ( a ) { instrucciones } siendo obligatorio poner los paréntesis . La parte a debe ser una expresión de tipo booleano." );
			if (token.id === ")") token.error("En la sentencia 'while' es necesario incluir una expresión de tipo 'booleano' entre paréntesis.");
			var condition = expression(0);
			advance(")");
			to = token.to;
			var body = statement();
			if (body) to = body.to;
			keypoints.hasWhile = true;
			var node = {
				id: itself.id,
				type: "statement",
				from: itself.from,
				to: to,
				condition: condition,
				body: body,
				line: itself.line,
				error: this.error
			};
			return node;
		});

		keyword("do", function(itself) {	
			var to;		
			var body = statement();
			advance("while");
			advance("(");//, "La sentencia while tiene la forma while ( a ) { instrucciones } siendo obligatorio poner los paréntesis . La parte a debe ser una expresión de tipo booleano." );
			if (token.id === ")") token.error("En la sentencia 'do-while' es necesario incluir una expresión de tipo 'booleano' entre paréntesis.");
			var condition = expression(0);
			to = token.to;
			advance(")");
			advance(";");
			keypoints.hasDoWhile = true;
			var node = {
				id: itself.id,
				type: "statement",
				from: itself.from,
				to: to,
				condition: condition,
				body: body,
				line: itself.line,
				error: this.error
			};
			return node;
		});
		
		keyword("continue", function(itself) {
			return {
				id: itself.id,
				type: "statement",
				from: this.from,
				to: this.to,
				line: itself.line,
				error: this.error
			};
		});

		keyword("break", function(itself) {
			return {
				id: itself.id,
				type: "statement",
				from: this.from,
				to: this.to,
				line: itself.line,
				error: this.error
			};
		});
		
		keyword("return", function(itself) {	
			var to;
			if (token.id === ";") {
				to = token.to;
				advance(";");
				return {
					id: itself.id,
					type: "statement",
					right: null,
					scope: currentScope,
					from: itself.from,
					to: to,
					line: itself.line,
					col: itself.col,
					error: this.error,
					warning: this.warning
				};
			} else {
				var rvalue = expression(0);
				if (rvalue) {
					to = rvalue.to;				
				}
				var node = {
					id: itself.id,
					type: "statement",
					right: rvalue,
					scope: currentScope,
					from: itself.from,
					to: to,
					line: itself.line,
					col: itself.col,
					error: this.error,
					warning: this.warning
				};
				return node;
			}			
		});
		
		keyword("switch", function(itself) {
			var to;
			advance("(", "La sentencia 'switch' tiene la forma 'switch ( expresión ) { instrucciones }' siendo obligatorio poner los paréntesis . La expresión entre paréntesis debe ser de tipo 'int' o 'char'." );
			var condition = expression(0);
			advance(")");
			var body = statement();
			if (body.id !== "(block)") itself.error("Es necesario añadir un cuerpo en el 'switch'.");			
			var sentences = body.right;
			if (sentences.length === 0) itself.error("Es necesario incluir algún caso dentro del cuerpo del 'switch'");
			if (sentences[0].id !== "case" && sentences[0].id !== "default") itself.error("No se pueden incluir instrucciones fuera de etiquetas.");
			keypoints.hasSwitch = true;
			var node = {
				id: itself.id,
				type: "statement",
				from: itself.from,
				to: to,
				condition: condition,
				body: body,
				line: itself.line,
				error: this.error
			};
			return node;		
		});

		keyword("case", function(itself) {
			var to;
			if (token.type !== "literal" && !token.constant) token.error("La etiqueta debe ser un valor literal de tipo 'int', 'char' o 'String'.");
			if (token.datatype.id !== "int" && token.datatype.id !== "char" && token.datatype.id !== "String") token.error("La etiqueta debe ser de tipo 'int', 'char' o 'String'.");
			var label = expression(0);
			if (label.id !== "(literal)" && !label.constant) {
				label.error("Se esperaba un valor literal como etiqueta 'case'.");
			}
			to = token.to;
			advance(":", "La etiqueta 'case' debe ir seguida de un símbolo ':' y un valor de tipo 'int', 'char' o 'String'.");
			return {
				id: itself.id,
				type: "statement",
				from: this.from,
				to: to,
				label: label,
				line: itself.line,
				error: this.error
			}; 
		});
		
		keyword("default", function(itself) {
			var to = token.to;
			advance(":", "La etiqueta 'default' debe ir seguida del símbolo ':'.");
			return {
				id: itself.id,
				type: "statement",
				from: this.from,
				to: to,
				line: itself.line,
				error: this.error
			};
		});
		
		symbol("public", function(itself) {
			var node = expression(0);
			if (node.type !== "variable" && node.type !== "const" && node.type !== "function") itself.error("Se esperaban una declaración de miembro o método.");
			if (!node.member && !node.method) itself.error("Sólo se pueden declarar como públicos los miembros y métodos de una clase.");
			node.from = itself.from;
			node.visibility = "public";
			return node;
		});
						
		symbol("private", function(itself) {
			var node = expression(0);
			if (node.type !== "variable" && node.type !== "const" && node.type !== "function") itself.error("Se esperaban una declaración de miembro o método.");
			if (!node.member && !node.method) itself.error("Sólo se pueden declarar como privados los miembros y métodos de una clase.");
			node.from = itself.from;
			node.visibility = "private";
			return node;
		});
						
		symbol("static", function(itself) {
			var node = expression(0);
			if (node.type !== "variable" && node.type !== "const" && node.type !== "function") itself.error("Se esperaban una declaración de miembro o método.");
			if (!node.member && !node.method) itself.error("Sólo se pueden declarar como estáticos los miembros y métodos de una clase.");
			node.from = itself.from;
			node.static = true;
			return node;
		});
				
		keyword("class", function(itself) {		
		  // TODO: Hacer esto en semantic check	
			if (token.type === "datatype") {
				itself.error("El nombre '" + token.id + "' ya está siendo usado por otro tipo de dato.");
			}	
			if (token.type !== "identifier") {
				itself.error("Es necesario dar un nombre a la clase y es aconsejable que empiece por mayúsculas.");
			}
			var identifier = token;
			var other = currentScope.find(identifier.id);
			// TODO: Intento de detectar clases en contextos superiores. Pero esto hay que hacerlo bien en Semantic
			if (other && other.context !== currentScope.context) {
				itself.error("El nombre '" + identifier.id + "' ya está utilizado.");
			}
			keypoints.defineClasses = true;
//			if (currentScope.context && currentScope.context.type === "function")

			advance();
			// TODO: Para hacer esto bien hay que tener en cuenta que se puede heredar de algo aún no declarado y habrá que resolverlo en semantic
			// Hay que crear el Environment usando como padre el de la clase de la que se hereda y, si esta aún no existe, dejarlo indicado al estilo del basetype
			// Crear una forma para dar de alta clases como library_function incluyendo sus métodos y miembros
			// De momento se cablea el .length, .equals() y .toString en semantic pero no mola
			/*
			if (token.id === "extends") {
				advance();
				if (token.type === "identifier" || (token.type === "datatype" && token.datatype instanceof ClassDatatype)) {
					console.log("Intentando heredar de " + token.id);
					var fatherBase = token;
					advance();
				}
			}
			*/
			
			// De momento se hereda siempre de Object
			var element = new ClassDatatype(identifier, ObjectDatatype);
			currentScope.define(element);

			element.body = [];
			element.from = token.from;
			var tmpScope = currentScope;
			// De momento se hereda siempre de Object
			currentScope = new Environment(ObjectDatatype.internalScope, element);
			element.internalScope = currentScope;
			
			advance("{");

			while (token.id !== "}" && token.id !== "(end)") {
				var s = statement();
				if (s) {
					if (s.type === "variable" || s.type === "constant" || s.type === "function" || s.type === "definition") {
						if (s.type === "function") keypoints.defineMethods = true;
						element.body.push(s);
					} else {
						if (s.type === "datatype") s.error("No se pueden declarar clases dentro de otras");
						s.error("No se puede poner código suelto dentro de una clase");
					}
				}
			}
			currentScope = tmpScope;
			
			element.to = token.to;
			element.error = this.error;
			element.statment = true;
			
			advance("}");
			
			return element;
		});
		
		symbol("this", function(itself) {
			if (!currentScope.context || currentScope.context.type !== "function" || !currentScope.context.scope || !currentScope.context.scope.context || currentScope.context.scope.context.type !== "datatype") {
				itself.error("La palabra 'this' sólo se puede usar dentro de un método de instancia.");
			}
			var basetype = currentScope.context.scope.context.id;
			var theclass = currentScope.find(basetype);
			// O estamos en un método y el nombre de la clase está en el contexto superior, o estamos en el constructor y el nombre de la clase es él mismo
			var node = {
				id: this.id,
				type: "identifier",
				basetype: basetype,
				datatype: theclass,
				from: this.from,
				scope: currentScope,
				to: this.to,
				line: this.line,
				col: this.col,
				error: itself.error
			};
			return node;
		});
		
		currentScope.define(IntegerDatatype);
		currentScope.define(DoubleDatatype);
		currentScope.define(CharDatatype);
		currentScope.define(BooleanDatatype);
		currentScope.define(VoidDatatype);
		currentScope.define(ObjectDatatype);
		currentScope.define(StringDatatype);		

		constant("true", BooleanDatatype, true);
		constant("false", BooleanDatatype, false);
		constant("PI", DoubleDatatype, Math.PI);
		constant("TAU", DoubleDatatype, Math.PI*2);
		constant("E", DoubleDatatype, Math.E);
		constant("LEFTBUTTON", IntegerDatatype, "LEFTBUTTON");
		constant("MIDDLEBUTTON", IntegerDatatype, "MIDDLEBUTTON");
		constant("RIGHTBUTTON", IntegerDatatype, "RIGHTBUTTON");
		constant("null", new NullDatatype(), "NullObject");

		library_function("millis", new FunctionDatatype(IntegerDatatype, []));
		library_function("second", new FunctionDatatype(IntegerDatatype, []));
		library_function("minute", new FunctionDatatype(IntegerDatatype, []));
		library_function("hour", new FunctionDatatype(IntegerDatatype, []));
		library_function("day", new FunctionDatatype(IntegerDatatype, []));
		library_function("month", new FunctionDatatype(IntegerDatatype, []));
		library_function("year", new FunctionDatatype(IntegerDatatype, []));

		library_function("sizeOf", new FunctionDatatype(IntegerDatatype, [{datatype:GenericArrayDatatype}]));
		library_function("sizeOf", new FunctionDatatype(IntegerDatatype, [{datatype:StringDatatype}]));
		
		library_function("sizeOf", new FunctionDatatype(IntegerDatatype, [{datatype:GenericArrayDatatype}, {datatype:IntegerDatatype}]));

		library_function("readInteger", new FunctionDatatype(IntegerDatatype, []));
		library_function("readInteger", new FunctionDatatype(IntegerDatatype, [{datatype:StringDatatype}]));
		library_function("readDouble", new FunctionDatatype(DoubleDatatype, []));
		library_function("readDouble", new FunctionDatatype(DoubleDatatype, [{datatype:StringDatatype}]));
		library_function("readString", new FunctionDatatype(StringDatatype, []));
		library_function("readString", new FunctionDatatype(StringDatatype, [{datatype:StringDatatype}]));
		library_function("readChar", new FunctionDatatype(CharDatatype, []));
		library_function("readChar", new FunctionDatatype(CharDatatype, [{datatype:StringDatatype}]));
		
		library_function("charArrayToString", new FunctionDatatype(StringDatatype, [{datatype:new ArrayDatatype(1,CharDatatype)}]));
		library_function("stringToCharArray", new FunctionDatatype(new ArrayDatatype(1,CharDatatype), [{datatype:StringDatatype}]));
//		library_function("largo", new FunctionDatatype(IntegerDatatype, [{datatype:StringDatatype}]));
		library_function("charAt", new FunctionDatatype(CharDatatype, [{datatype:StringDatatype}, {datatype:IntegerDatatype}]));
		library_function("concat", new FunctionDatatype(StringDatatype, [{datatype:StringDatatype}, {datatype:StringDatatype}]));
		library_function("compare", new FunctionDatatype(IntegerDatatype, [{datatype:StringDatatype}, {datatype:StringDatatype}]));
		library_function("indexOf", new FunctionDatatype(IntegerDatatype, [{datatype:StringDatatype}, {datatype:CharDatatype}]));
		
		library_function("loop", new FunctionDatatype(VoidDatatype, [{datatype:new FunctionDatatype(VoidDatatype, [])}]));
		library_function("animate", new FunctionDatatype(VoidDatatype, [{datatype:new FunctionDatatype(VoidDatatype, [])}]));
		library_function("animate", new FunctionDatatype(VoidDatatype, [{datatype:new FunctionDatatype(VoidDatatype, [])}, {datatype:IntegerDatatype}]));
		library_function("exit", new FunctionDatatype(VoidDatatype, []));
//		library_function("noLoop", new FunctionDatatype(VoidDatatype, []));
//		library_function("redraw", new FunctionDatatype(VoidDatatype));
// TODO: poner función exit
		library_function("random", new FunctionDatatype(DoubleDatatype, []));
		library_function("random", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("random", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("sin", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("cos", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("tan", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("asin", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("acos", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("atan", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("sqrt", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("pow", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("abs", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("log", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}]));
		library_function("floor", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype}]));
		library_function("ceil", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype}]));
		library_function("round", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype}]));
		
		library_function("print", new FunctionDatatype(VoidDatatype, []));
		library_function("println", new FunctionDatatype(VoidDatatype, []));
		library_function("print", new FunctionDatatype(VoidDatatype, [{datatype:IntegerDatatype}]));
		library_function("print", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype}]));
		library_function("print", new FunctionDatatype(VoidDatatype, [{datatype:CharDatatype}]));
		library_function("print", new FunctionDatatype(VoidDatatype, [{datatype:BooleanDatatype}]));
		library_function("print", new FunctionDatatype(VoidDatatype, [{datatype:ObjectDatatype}]));
		library_function("println", new FunctionDatatype(VoidDatatype, [{datatype:IntegerDatatype}]));
		library_function("println", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype}]));
		library_function("println", new FunctionDatatype(VoidDatatype, [{datatype:CharDatatype}]));
		library_function("println", new FunctionDatatype(VoidDatatype, [{datatype:BooleanDatatype}]));
		library_function("println", new FunctionDatatype(VoidDatatype, [{datatype:ObjectDatatype}]));

		library_function("stroke", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype}]));
		library_function("stroke", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("stroke", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("strokeWeight", new FunctionDatatype(VoidDatatype, [{datatype:IntegerDatatype}]));
		library_function("noStroke", new FunctionDatatype(VoidDatatype, []));
		library_function("fill", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype}]));
		library_function("fill", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("fill", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("noFill", new FunctionDatatype(VoidDatatype, []));
		library_function("background", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype}]));
		library_function("background", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("background", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));

		library_function("line", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("ellipse", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("point", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("triangle", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("rect", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("text", new FunctionDatatype(VoidDatatype, [{datatype:IntegerDatatype}, {datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("text", new FunctionDatatype(VoidDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("text", new FunctionDatatype(VoidDatatype, [{datatype:CharDatatype}, {datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("text", new FunctionDatatype(VoidDatatype, [{datatype:BooleanDatatype}, {datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("text", new FunctionDatatype(VoidDatatype, [{datatype:ObjectDatatype}, {datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("textWidth", new FunctionDatatype(IntegerDatatype, [{datatype:IntegerDatatype}]));
		library_function("textWidth", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype}]));
		library_function("textWidth", new FunctionDatatype(IntegerDatatype, [{datatype:CharDatatype}]));
		library_function("textWidth", new FunctionDatatype(IntegerDatatype, [{datatype:BooleanDatatype}]));
		library_function("textWidth", new FunctionDatatype(IntegerDatatype, [{datatype:ObjectDatatype}]));
		library_function("textSize", new FunctionDatatype(VoidDatatype, [{datatype:IntegerDatatype}]));

//		library_function("loadImage", new FunctionDatatype(classImage));
		library_function("image", new FunctionDatatype(VoidDatatype, [{datatype:StringDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("image", new FunctionDatatype(VoidDatatype, [{datatype:StringDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
//		library_function("snapshot", "void");
// TODO: Crear clase Color para manejar esto
		library_function("getColor", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype},{datatype:DoubleDatatype}]));
		library_function("red", new FunctionDatatype(IntegerDatatype, [{datatype:IntegerDatatype}]));
		library_function("green", new FunctionDatatype(IntegerDatatype, [{datatype:IntegerDatatype}]));
		library_function("blue", new FunctionDatatype(IntegerDatatype, [{datatype:IntegerDatatype}]));

		system_variable("mouseX", IntegerDatatype, 0);
		system_variable("mouseY", IntegerDatatype, 0);
		system_variable("mousePressed", BooleanDatatype, false);
		system_variable("mouseButton", IntegerDatatype, false);

		system_variable("key", StringDatatype, "");//new StringDatatype(), 0);
		system_variable("keyPressed", BooleanDatatype, false);

		// Todas las declaraciones posteriores a este comentario son nuevas funciones para descubre no oficiales
		library_function("color", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("color", new FunctionDatatype(IntegerDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("dist", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("dist", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("dist", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("lerp", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("map", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("atan2", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("max", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("min", new FunctionDatatype(DoubleDatatype, [{datatype:DoubleDatatype}, {datatype:DoubleDatatype}]));
		library_function("max", new FunctionDatatype(IntegerDatatype, [{datatype:IntegerDatatype}, {datatype:IntegerDatatype}]));
		library_function("min", new FunctionDatatype(IntegerDatatype, [{datatype:IntegerDatatype}, {datatype:IntegerDatatype}]));
		library_function("pupdate", new FunctionDatatype(VoidDatatype, []));
		library_function("pmillis", new FunctionDatatype(IntegerDatatype, []));
		library_function("pkeyPressed", new FunctionDatatype(BooleanDatatype, []));
		library_function("pmousePressed", new FunctionDatatype(BooleanDatatype, []));
	};
	
	init();

	this.parse = function(s) {
		
		warnings = [];
		usedFunctions = [];			
		declaredFuncions = [];			
		usedImages = [];
		keypoints = {
				useLiteral:false,
				hasArithmeticExpression:false,
				hasBooleanExpression:false,
				
				hasDeclaration:false,
				hasConstant:false,
				hasAssignment:false,
		
				useFunction:false,
				createFunction:false,
				hasRecursiveFunction:false,
		
				hasFor:false,
				hasWhile:false,
				hasDoWhile:false,
		
				hasIf:false,
				hasElse:false,
				hasSwitch:false,
		
				useArray:false,
				useArrayAsParameter:false,
				returnArray:false,
				
				createObjects:false,
				defineClasses:false,
				defineMethods:false
			};
		
		source = s;
		tokens = createTokens(source);
		currentScope = new Environment(globalScope);
		// El environment interno de Object debe ser hijo de aquel en el que se vayan a definir las clases propias, no del global donde están las constantes y funciones de librería. 
		// Si no se hace así, al declarar un método no se puede encontrar la clase subiendo por el árbol.
		// Tampoco se puede encontrar la clase en interpreta token
		ObjectDatatype.internalScope.parent = currentScope;
		
		var parseTree = [];
		
		start();
		parseTree = statements();
		new SemanticChecker(source, parseTree);
		
		currentScope = currentScope.getParent();
		return parseTree;
	}
	
	this.getErrors = function() {
		return errors;
	}
	
	this.getWarnings = function() {
		return warnings;
	}
	
	this.getUsedFunctions = function() {
		return usedFunctions;
	}
	
	this.getDeclaredFunctions = function() {
		return declaredFunctions;
	}
	
	this.getKeyPoints = function() {
		return keypoints;
	}
	
	this.getUsedImages = function() {
		return usedImages;
	}
}
	
