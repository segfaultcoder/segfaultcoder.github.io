function SemanticChecker(source, tree) {
	var overloadedMethods = [];
	var declaredFunctions = [];
	
	function showSimilar(id, scope, limited, role) {
		role = role || "El nombre";
		var elements = scope.findSimilar(id, limited);
		var list = [];
		for (var key in elements) list.push(key);
		if (list.length > 0) {				
			var msg = "El nombre '" + id +"' no se corresponde con ninguna variable, constante ni función. Quizás se pretendía escribir uno de los siguientes:";
			for (key in elements) msg += " " + key.replace("_iJava_","");
			return msg;
		} else {
			return role + " '" + id + "' se está utilizando sin ser declarado.";
		}
	}
	
	function showSimilarMethod(id, args, scope, limited) {
		var elements = scope.findAll(id, limited);
		if (!elements) {
			return showSimilar(id, scope, limited, "El método"); 		}
		// Buscar los métodos con los que coincide la invocación en número de argumentos
		var options = [];
		for (var i = 0 ; i < elements.length ; i++ ) {
			var element = elements[i];
			if (element.datatype instanceof FunctionDatatype && element.datatype.params && element.datatype.params.length == args.length)  {				
				options.push(element);
			}
		}
		// Si no hay ninguno con el mismo número de parámetros que de argumentos compruebo otros posibles errores
		if (options.length === 0) {
			// Si sólo hay un elemento registrado con este nombre compruebo si es o no una función y la diferencia entre el número de argumentos y parámetros
			if (elements.length == 1) {
				var element = elements[0];					
				if (!(element.datatype instanceof FunctionDatatype)) {
					return "Estas tratando de usar '" + id + "' como si fuera una función cuando no lo es.";
				}
				if ((element.datatype.params && args.length > element.datatype.params.length) || (!element.datatype.params && args.length > 0) ) {
					if (id === "(Constructor)") {
						return "Se están trantando de pasar más valores que parámetros tiene el constructor de '" + limited + "'.";
					} else {
						return "Se están trantando de pasar más valores que parámetros tiene la funcion '" + id + "'.";
					}
				}
				if (element.datatype.params && args.length < element.datatype.params.length) {
					if (id === "(Constructor)") {
						return "Es necesario pasar más valores para invocar al constructor de '" + limited + "'.";
					} else {
						return "Es necesario pasar más valores para invocar a la función '" + id + "'.";
					}
				}
			}
			if (id === "(Constructor)") {
				return "No hay ningún constructor en la clase '" + limited + "' que tenga " + args.length + " parámetros pero sí con un número diferente de ellos.";
			} else {
				return "No hay ninguna función llamada '" + id + "' que tenga " + args.length + " parámetros pero sí con un número diferente de ellos.";
			}
		}
		// Buscar de entre los que coincide en qué parámetro falla
		var lessDiffs = args.length+1;
		var bestFit = null;
		for ( var i = 0 ; i < options.length ; i++ ) {
			var element = options[i];
			var d = numberOfSimilarParams(element.datatype.params, args);
			if (d < lessDiffs) {
				lessDiffs = d;
				bestFit = element;
			}
		}
		if (bestFit) {
			for ( var i = 0 ; i <	args.length ; i++ ) {
				var mixt = bestFit.datatype.params[i].datatype.infix("=", args[i].datatype); 
				var anex = "";
				if (options.length > 1) {
					anex = ", al menos en uno de las funciones existentes,";
				}
				if (!mixt) {
					return "Error de tipos al tratar de usar como argumento del parámetro número " + (i+1) + " un valor de tipo '" + args[i].datatype + "' cuando" + anex + " se esperaba uno de tipo '" + bestFit.datatype.params[i].datatype + "'.";
				}
				if (mixt instanceof Warning) {
					// En este caso no son admitibles los casting automáticos como warnings. Debe haber coincidencia exacta. 
					// TODO: En caso de herencia hay que tenerlo en cuenta para que se devuelva ok, no warning
					return "Error de tipos al tratar de usar como argumento del parámetro número " + (i+1) + " un valor de tipo '" + args[i].datatype + "' cuando" + anex + " se esperaba uno de tipo '" + bestFit.datatype.params[i].datatype + "'.";										
					//"Posible pérdida de precisión al tratar de usar como argumento del parámetro número " + (i+1) + " un valor de tipo '" + args[i].datatype + "' cuando se esperaba uno de tipo '" + element.datatype.params[i].datatype + "' en la llamada a la función '" + id + "'.");									
				}
			}
			return "no error";
		}				
		return "Error desconocido al buscar '" + id + "'.";
	}
	
	function checkVisibility(node, entry) {
		// Comprobar uso adelantado de identificadores en el mismo contexto
		if (node.scope.context === entry.scope.context && entry.type !== "function") {
			if (node.line < entry.line || (node.line == entry.line && node.col < entry.col)) {
				node.error("Uso por adelantado de '" + entry.id + "'.");
			}
		}
		// Si a lo que estamos accediendo es una variable o función global no hay contexto por lo que siempre es accesible
		if (!entry.scope.context) return;
		
		var allowd = false;		
		var msg = "";
		var role = "una variable";
		if (entry.type === "function") role = "una función";
		if (entry.type === "constant") role = "una constante";
		if (entry.member) role = "un miembro";
		if (entry.method) role = "un método";
		msg = "El nombre '" + entry.id + "' corresponde a " + role + " privado por lo que sólo puede ser accedido desde un método de su clase.";
		if (!node.scope.context) {
			// Si estamos en el contexto global sólo es posible acceder a miembros y métodos públicos
			allowed = entry.visibility === "public"; 
		} else {
			if (!node.scope.context.scope.context) {
				// Si estamos en el contexto de una función global sólo es posible acceder a miembros y métodos públicos
				// Si estamos en una clase global puedo acceder a mis propios miembros y métodos durante la inicialización siempre que estén declarados antes
				allowed = entry.visibility === "public" || node.scope.context.id === entry.scope.context.id; 
			} else {
				if (node.scope.context.scope.context.id !== entry.scope.context.id) {
					// Si estamos en un método de otra clase sólo es posible acceder a miembros y métodos públicos
					allowed = entry.visibility === "public";
				} else {
					// Si estamos en un método de la propia clase depende del nivel de acceso. 
					// Si el método es estático sólo podremos acceder a miembros y métodos estáticos a no ser que lo haga a 
					// través de un objeto . En otro caso a cualquiera.
					allowed = (!node.scope.context.static || entry.static || node.id === ".");
					if (!entry.static && node.scope.context.static && node.id !== ".") {
						msg = "El nombre '" + entry.id + "' corresponde a " + role + " de instancia por lo que sólo puede ser accedido desde un método del mismo tipo.";
					}
				}
			}
		}		
		// "Sólo se puede acceder a '" + entry.id + "' desde un método de instancia de la clase '" + entry.scope.context.id + "' que es a la que pertenece."
		if (!allowed) node.error(msg);
	}
	
	function datatypeOf(array) {
		var datatype = new ArrayDatatype(1);
		var elements = 0;
		for ( var i = 0 ; i < array.length ; i++ ) {
			if (array[i] instanceof Array) {
				if (elements === 0) {
					elements = array[i].length;
				} else {
					if (elements != array[i].length) {
						throw {
							msg:"No coinciden los tamaños de los elementos de la dimensión."
						};
					}
				}
				var dt = datatypeOf(array[i]);
				if (dt === null) return null;
				if (datatype.celltype !== null) {
					var mix = datatype.celltype.gcd(dt.celltype);
					if (!mix) {
						return null;
					} else
					if (mix != datatype.celltype) {
						datatype.celltype = mix;
					}
				} else {
					datatype.celltype = dt.celltype;
				}
				datatype.dimensions = 1 + dt.dimensions;			
			} else {
				if (!datatype.celltype) {
					if (!array[i].datatype) {
						console.log("Error desconocido 1");
					}
					datatype.celltype = array[i].datatype;
				} else {
					var mix = datatype.celltype.gcd(array[i].datatype);
					if (!mix) {
						return null;
					} else
					if (mix != datatype.celltype) {
						datatype.celltype = mix;
					}
				}			
			}
		}
		return datatype;	
	}

	function secondPass(node) {
		if (!node) return;		
//		console.log("Second Pass sobre ",node.id, node.datatype, node);
		if (node instanceof Array) {
			for ( var i = 0 ; i < node.length ; i++ ) {
				secondPass(node[i]);
			}
			return;
		}		
		if (node.type === "value") {
			if (node.id === "?") {
				secondPass(node.condition);
				secondPass(node.yes); 
				secondPass(node.no); 
				// Usamos = porque == devuelve boolean
				node.datatype = node.yes.datatype.gcd(node.no.datatype);
				if (!node.datatype) {
					node.error("El operador '?' se se usa así: 'exp1 ? exp2 : exp3'. El valor de 'exp1' debe ser 'booleano', y los de 'exp2' y 'exp3' deben ser iguales. En este caso, 'exp2' es de tipo '" + node.yes.datatype + "', y 'exp3' de tipo '" + node.no.datatype + "'.");
				}
				return;
			} else
			if (node.id === "{...}") {
				secondPass(node.right);
				try {					
					node.datatype = datatypeOf(node.right);
				} catch (e) {
					node.error("Todos los elementos de una misma dimensión deben tener el mismo tamaño. " + e.msg);
				}
				if (node.datatype === null) {				
					node.error("Todos los valores a incluir en el array deben ser del mismo tipo.");
				}
				if (node.datatype.celltype === null) {
					node.error("Debes incluir algún valor para inicializar el array.");
				}
			} else 
			if (node.id === "(cast)") {
				secondPass(node.right);
				// Resolver basetype				
				var element = node.scope.find(node.basetype);
				if (!element || element.type !== "datatype") {
					node.error("No existe el tipo de dato '" + node.basetype + "'.");
				}
				if (!node.datatype) {
					node.datatype = element;
				} else {
					node.datatype.fillTheGap(element);
				}
				// Comprobar uso adelantado de tipos propios
				checkVisibility(node,element);
				// Semantic: Comprobar que el casting tiene sentido
				if (node.right.datatype != node.datatype) {
					if (!node.right.datatype.isConvertibleTo(node.datatype)) {
						node.error("No se puede forzar la conversión de '" + node.right.datatype + "' a '" + node.datatype + "'.");
					}
				}
			} else
			if (node.id === "(literal)") {
				// Nada que hacer
			} else
			if (node.id === "instanceof") {
				secondPass(node.left);
				if (!(node.left.datatype instanceof ClassDatatype)  || !(node.right.datatype instanceof ClassDatatype)) {
					node.error("instanceof sólo se puede utilizar para comprobar si una variable contiene un objeto de una clase concreta.");
				} 
			} else {
				// Expresiones
				secondPass(node.left);
				secondPass(node.right);
				var rtype = null;
				if (node.left && node.right) rtype = node.left.datatype.infix(node.id, node.right.datatype);
				else if (node.left) rtype = node.left.datatype.sufix(node.id);
				else rtype = node.right.datatype.prefix(node.id);
				if (!rtype) {
					var msg = "Error de tipos al hacer '";
					if (node.left) msg += node.left.datatype + "' ";
					msg += node.id;
					if (node.right) msg += " '" + node.right.datatype;
					msg += "' en la expresión '" + source.substring(node.from, node.to) + "'.";
					node.error(msg);
				}
				if (rtype instanceof Warning) {				
					node.warning(rtype.msg);
					rtype = rtype.guess;
				}
				node.datatype = rtype;
				// Semantic: Comprobar que se puede hacer la asignación
				if (node.id === "=" || node.id === "+=" || node.id === "-=" || node.id === "*=" || node.id === "/=" || node.id === "%=" || node.id === "++" || node.id === "--") {
					if (node.left.constant || node.left.type !== "identifier") {
						node.error("Sólo es posible modificar el valor de las variables y '" + source.substring(node.left.from, node.left.to) + "' no es una variable.");
					}
				}				
				return;
			}
		} else
		if (node.type === "statement") {
			if (node.id === "(block)") {
				secondPass(node.right);
			} else
			if ( node.id === "for") {
				secondPass(node.initializers);
				secondPass(node.condition);
				secondPass(node.action);
				secondPass(node.body);
				if (node.initializers) {				
					if (!node.initializers.statement && (node.initializers.type !== "variable" || node.initializers.datatype instanceof FunctionDatatype)) node.error("La primera parte del 'for' tiene que ser una declaración de variable o una asignación.");//, node.line, node.col);
				}
				if (node.condition) {
					if (node.condition.datatype != BooleanDatatype) {
						node.error("La condición debe ser una expresión de tipo 'boolean'.");
					}
				}
				if (node.action) {
					if (node.action.type === "variable" || node.action.type === "constant" || node.action.type === "function" || node.action.type === "datatype") itself.error("La tercera parte del 'for' no puede ser una declaración.");
					if (!node.action.statement) node.error("La tercera parte del for tiene que ser una asignación, o una invocación a función y '" + source.substring(node.action.from, node.action.to) + "' no lo es.");
				}
			} else
			if (node.id === "while" || node.id === "do") {
				secondPass(node.condition);
				secondPass(node.body);
				if (node.condition.datatype != BooleanDatatype) {
					node.error("La condición debe ser una expresión de tipo 'boolean'.");
				}
			} else
			if (node.id === "if") {
				secondPass(node.condition);
				secondPass(node.yes);
				secondPass(node.no);
				if (node.condition.datatype != BooleanDatatype) {
					node.error("La condición debe ser una expresión de tipo 'boolean'.");
				}
			} else
			if (node.id === "switch") {
				secondPass(node.condition);
				if (!node.condition.datatype || !node.condition.datatype.complete()) {
					node.condition.error("Error: switch con datatype incompleto. Mirar también los de if, for, while y do-while");
				}
				if (node.condition.datatype !== IntegerDatatype && node.condition.datatype !== CharDatatype && node.condition.datatype !== StringDatatype ) {
					node.error("El valor sobre el cuál 'switch' toma la decisión debe ser de tipo 'int', 'char' o 'String'.");
				}
				secondPass(node.body);
			} else
			if (node.id === "return") {
				if (node.right) {
					secondPass(node.right);	
					node.datatype = node.right.datatype;
				} else {
					node.datatype = VoidDatatype;
				}
				// Semantic: Comprobar coincidencia de tipos entre lo devuelto y lo declarado por la función
				var rtype = node.scope.context.datatype.rtype.infix("=", node.datatype);
				if (!rtype) {
					if (node.scope.context.datatype.rtype == VoidDatatype) {
						node.error("Las funciones de tipo 'void' no devuelven nada. Puedes usar 'return;' para terminar la función. Si quieres devolver algo modifica el tipo de la función '" + node.scope.context.id + "'.");
					}					
					node.error("La instrucción 'return' debe devolver un valor del mismo tipo que la función donde se encuentre. En este caso debería ser de tipo '" + node.scope.context.datatype.rtype + "'. Sin embargo, la expresión '" + source.substring(node.from, node.to) + "' es de tipo '" + node.datatype + "'.");
				}
				if (rtype instanceof Warning) {
					node.warning(rtype.msg);
				}
			} else
			if (node.id === "(expression)") {
				secondPass(node.right);
				// Semantico TODO: valor devuelto por función no usada
				return;
			} else 
			if (node.id === "case") {
				secondPass(node.label);
				if (node.label.datatype.id !== "int" && node.label.datatype.id !== "char" && node.label.datatype.id !== "String") token.error("La etiqueta debe ser de tipo 'int', 'char' o 'String'.");			
			}	else
			if (node.id === "default") {
			}	else
			if (node.id === "break") {
			}	else
			if (node.id === "continue") {
			} else {
				console.log("Falta caso para:", node);
			}
		} else
		if (node.type === "identifier") {
			if (node.id === "[") {
				// Resuelvo tipos del identificador y de los índices
				secondPass(node.left);
				secondPass(node.right);
				// Compruebo que realmente es algo indexable
				if (!(node.left.datatype instanceof ArrayDatatype)) {
					node.error("Sólo se pueden indexar los arrays");
				}
				if (node.right.length !== node.left.datatype.dimensions) {
					node.error("El array '" + source.substring(node.left.from, node.left.to) + "' tiene " + node.left.datatype.dimensions + " dimensiones. En la expresión '" + source.substring(node.from, node.to) + "' se está intentando usar como si tuviera " + node.right.length + ".");
				} else {				
					node.datatype = node.left.datatype.celltype;
				}
				for ( var i = 0 ; i <	node.right.length ; i++ ) {
					if (node.right[i].datatype != IntegerDatatype) { // TODO: con short y long y byte también, cambiar para que sea una propiedad
						node.error("Sólo se pueden usar valores enteros para acceder a las celdas del array '" + source.substring(node.left.from, node.left.to) + "'. Estos valores deben estar entre 0 y n-1 siendo n el tamaño de la dimensión accedida.");
					}
				}
				/*
				if (node.datatype instanceof CStringDatatype) {
					node.type = "value";
				}
				*/
			} else
			if (node.id === "new") {
				secondPass(node.args);
				// Resolver basetype				
				var element = node.scope.find(node.basetype);
				if (!element || element.type !== "datatype") {
					node.error("No existe el tipo de dato '" + node.basetype + "'.");
				}
				// Creación de array				
				if (node.datatype) {
					node.datatype.fillTheGap(element);
				} else {
				// Creación de objeto	
					if (!(element instanceof ClassDatatype)) {
						node.error("Sólo se pueden crear objetos a partir de clases, y '" + node.basetype + "' no lo es.");
					}
					var theclass = element;
					// Para poder buscar constructores primero debe estar analizada la clase
					secondPass(theclass);
					// Buscar constructor apropiado
					var method = theclass.internalScope.findMethod("(Constructor)", node.args, theclass);
					if (!method) {
						node.error(showSimilarMethod("(Constructor)", node.args, theclass.internalScope, theclass));
						// Si no existe constructor y no se trata del constructor por defecto error
						if (node.args.length !== 0) {
							node.error("En la clase '" + node.basetype + "' no nay ningún constructor con el número y tipo de parámetros que se está intentando utilizar.");
						} else {
							var other = theclass.internalScope.findAll("(Constructor)", theclass);
							if (other) {
								node.error(showSimilarMethod("(Constructor)", node.args, theclass.internalScope, theclass));
							}
						}	
					}
					node.datatype = element;//method.datatype.rtype;
					if (method) node.version = method.version;
					else node.defaultConstructor = true;
					checkVisibility(node, element);
				}
			} else
			if (node.id === "(call)") {
				// Resuelvo tipos del identificador y de los argumentos
				secondPass(node.left);
				secondPass(node.args);
				// Termino de resolver el tipo. En función de los argumentos decido qué función se está invocando si es que hay alguna
				var method = node.scope.findMethod(node.left.id, node.args);
				if (!method) {
					// Si no hay una coincidencia exacta busco la más cercana para tratar de informar sobre el error cometido
					node.error(showSimilarMethod(node.left.id, node.args, node.scope));
				}
				if (!node.left.datatype) {
					node.left.datatype = method.datatype;
				}
				// Semántico
				checkVisibility(node.left, method);
				if (method.line === 0) node.left.predefined = true;				
//				console.log("identificador " + method.id + " en línea " + node.line + " member=" + method.member + " method=" + method.method);
//				console.log(node.left);
				// Actualizo el nodo y el identificador usado para llamar
				node.left.method = method.method;
				node.left.member = method.member;
				node.left.version = method.version;
				node.method = method.method;
				node.member = method.member;
				node.version = method.version;

				if (node.left.id === "this") {
					node.error("No soportado el uso de this para invocar constructores");
				}
				// Actualizo el tipo de lo devuelto según si era una función o un objeto
				node.datatype = node.left.datatype.rtype;
				if (!(node.datatype instanceof ArrayDatatype) && !(node.datatype instanceof ClassDatatype)) {
					node.type = "value";
				}
				// Semántico: Busco si algún argumento es una función
				for ( var i = 0 ; i < node.args.length ; i++ ) {				
					if (node.args[i].datatype !== null && node.args[i].datatype instanceof FunctionDatatype) {			
	//					node.error("Error al tratar de usar '" + source.substring(node.args[i].from, node.args[i].to) + "', que es el nombre de una función, como argumento al intentar ejecutar la función '" + node.left.id + "'. Las funciones no se pueden pasar como parámetro en iJava 2.0.");				
					}
					if (node.args[i].datatype !== null && node.args[i].datatype == VoidDatatype) {				
						node.error("Error al tratar de usar el resultado de una función que no devuelve nada, como argumento al intentar ejecutar la función '" + node.left.id + "'.");				
					}
				}				
			} else
			if (node.id === "this") {
				// Semantico Comprobar que estamos en un método de instancia no en uno estático en semantic check
				if (node.scope.context.static) {
					node.error("No se puede usar this en un método estático");
				}
			} else
			if (node.id === ".") {
				// Resuelvo tipos del objeto
				secondPass(node.left);
				if (!(node.left.datatype instanceof ClassDatatype)) {
					if (node.args) {
						node.error("Los métodos sólo se pueden aplicar a objetos.");
					} else {
						node.error("Sólo los objetos tienen propiedades accesibles vía '.'.");
					}
				}
				var theclass = node.left.datatype;
				// Para poder buscar sus métodos primero deben estar analizados
				secondPass(theclass);

				// Compruebo que el miembro o método existe en la clase a la que pertenezca el objeto				
				if (!node.args) {
					// Acceso a miembro
					var entry = theclass.internalScope.find(node.right.id, theclass);
					if (!entry || !entry.scope.context || entry.scope.context.id !== theclass.id) {
						node.error(showSimilar(node.right.id, theclass.internalScope, theclass, "El miembro"));
//						node.error("No existe el miembro '" + node.right.id + "'.");
					}
					if (!entry.datatype) {
						secondPass(entry);
					}
					if (!entry.datatype.complete()) {
						secondPass(entry);
					}
					node.datatype = entry.datatype;
					// Semántico
					checkVisibility(node,entry);
					node.member = true;
					node.static = entry.static;
					if (!entry.static && node.left.id === node.left.datatype.id) {
						node.error("No se puede acceder a miembros de instancia desde el nombre de la clase.");
					}
				} else {
					// Invocación de método
					secondPass(node.args);
					var method = theclass.internalScope.findMethod(node.right.id, node.args, theclass);
					if (!method || !method.scope.context || (method.scope.context.id !== theclass.id && !theclass.sonOf(method.scope.context))) {
						node.error(showSimilarMethod(node.right.id, node.args, theclass.internalScope, theclass));
					}
					if (!method.datatype) {
						secondPass(method);
					}
					if (!method.datatype.complete()) {
						secondPass(method);
					}
					// Actualizo el tipo de lo devuelto según si era una función o un objeto
					node.datatype = method.datatype.rtype;
					if (!(node.datatype instanceof ArrayDatatype) && !(node.datatype instanceof ClassDatatype)) {
						node.type = "value";
					}
					// Semántico: Busco si algún argumento es una función
					for ( var i = 0 ; i < node.args.length ; i++ ) {				
						if (node.args[i].datatype !== null && node.args[i].datatype instanceof FunctionDatatype) {				
							node.error("Error al tratar de usar '" + node.args[i].id + "', que es el nombre de una función, como argumento al intentar ejecutar la función '" + id + "'. Las funciones no se pueden pasar como parámetro en iJava 2.0.");				
						}
					}				
					// Semántico
					checkVisibility(node,method);
					node.version = method.version;
					node.method = true;
					node.static = method.static;
					if (!method.static && node.left.id === node.left.datatype.id) {
						node.error("No se pueden invocar métodos de instancia sobre el nombre de la clase.");
					}
				}				
			} else {
				// Identificador de variable, constante, clase o función
				// TODO: Meter en el nodo AST de los identificadores la entrada al environment siempre que se haya encontrado para ahorrar búsquedas posteriores
				var entry = node.scope.findAll(node.id);
				if (entry) {
					// Completar el tipo del identificador
					if (entry.length == 1) {
						entry = entry[0];
						if (!entry.datatype) {
							secondPass(entry);
						}
						if (!entry.datatype.complete()) {
							secondPass(entry);
						}
						node.datatype = entry.datatype;
						// Semántico
						checkVisibility(node,entry);
						if (entry.line === 0) node.predefined = true;				
		//				console.log("identificador " + entry.id + " en línea " + node.line + " member=" + entry.member + " method=" + entry.method);
						node.method = entry.method;
						node.member = entry.member;
						node.version = entry.version;
						node.static = entry.static;
						node.classname = entry.type === "datatype";
						node.constant = entry.type === "constant";
						if (node.constant) node.value = entry.value;
					} else {
						// Completar los tipos de todos los métodos sobrecargados
						for ( var i = 0 ; i < entry.length ; i++ ) {
							if (!entry[i].datatype) {
								secondPass(entry[i]);
							}
							if (!entry[i].datatype.complete()) {
								secondPass(entry[i]);
							}
						}
						// EL semántico
					}
				} else {
					// Buscar si hay algún identificador parecido
					node.error(showSimilar(node.id, node.scope));
				}
				return;				
			}
		} else
		if (node.type === "datatype") {
			if (node.checked) {
				return;
			}
			node.checked = true;
			secondPass(node.body);
		} else
		if (node.type === "variable" || node.type === "constant" || node.type === "function") {
			if (node.checked) {
				return;
			}
			node.checked = true;
			// Resolver basetype
			var element = node.scope.find(node.basetype);
			if (!element || element.type !== "datatype") {
				node.error("No existe el tipo de dato '" + node.basetype + "'.");
			}
			if (!node.datatype) {
				node.datatype = element;
			} else {
				node.datatype.fillTheGap(element);
			}
			if (node.type === "function") {
				secondPass(node.datatype.params);
				secondPass(node.body);		
				// Semantic: Buscar return por si no existen o si no son adecuados
				declaredFunctions.push(node);
			}
			// Comprobar uso adelantado de tipos de datos propios
			if (node.type !== "function") checkVisibility(node, element);
			// Resuelvo para el valor inicial y compruebo adecuación de tipos
			if (node.initialValue) {
				secondPass(node.initialValue);
				var rtype = null;
				rtype = node.datatype.infix("=", node.initialValue.datatype);
				if (!rtype) {
					// Para permitir el caso especial de inicialización de arrays con valores literales de una precisión menor a la esperada
					if (!(node.datatype instanceof ArrayDatatype) || !(node.initialValue.datatype instanceof ArrayDatatype)) {
						node.error("Error de tipos al intentar inicializar '" + node.id + "' de tipo '" + node.datatype + "' con el resultado de la expresión '" + source.substring(node.initialValue.from, node.initialValue.to) + "' que es de tipo '" + node.initialValue.datatype + "'. ");
					} else {
						if (node.datatype.dimensions != node.initialValue.datatype.dimensions ||node.datatype.celltype.gcd(node.initialValue.datatype.celltype) != node.datatype.celltype) {
							node.error("Error de tipos al intentar inicializar '" + node.id + "' de tipo '" + node.datatype + "' con el resultado de la expresión '" + source.substring(node.initialValue.from, node.initialValue.to) + "' que es de tipo '" + node.initialValue.datatype + "'. ");
							console.log("Va");
						}
					}
				}
				if (rtype instanceof Warning) {
					node.warning(rtype.msg);
				}				
			}
			// Semántico		
			// Evitar colisión de nombres en el mismo contexto excepto para sobrecarga de métodos
			var elements = node.scope.findAll(node.id, node.scope.context);
			if (elements.length > 1) {
				if (node.type !== "function") {
					node.error("Múltiples declaraciones de " + node.id);
				} else {
					if (node.method) {
						// Tienen que tener diferente número y/o tipo de parámetros. Postponemos la decisión para el final.
						if (overloadedMethods.indexOf(elements) < 0) overloadedMethods.push(elements);
					}
				}
			}
		} else {
			console.log("Unknown error 2", node);
		}	
	}
	
	function checkOverloadedMethods() {
		for ( var i = 0 ; i < overloadedMethods.length ; i++ ) {
			var elements = overloadedMethods[i];
			for ( var j = 0 ; j < elements.length ; j++ ) {
				var paramsj = elements[j].datatype.params;
				for (var k = j + 1 ; k < elements.length ; k++ ) {
					var paramsk = elements[k].datatype.params;
					if (paramsj.length == paramsk.length) {
						if (numberOfSimilarParams(paramsj,paramsk) == paramsj.length) {
							elements[k].error("No se pueden declarar dos métodos con el mismo número y tipo de parámetros");
						}
					}
				}
			}		
		}
	}
	
	function evalBooleanExpression(node) {
		if (node.type === "identifier") {
			if (node.id === "true") return "true";
			if (node.id === "false") return "false";
			return "undefined";
		} else
		if (node.type === "value") {
			if (node.id === "&&") {
				var a = evalBooleanExpression(node.left);
				var b = evalBooleanExpression(node.right); 
				if (a === "true" && b === "true") return "true";
				if (a === "false" || b === "false") return "false";
				if (a === "undefined" || b === "undefined") return "undefined";
			}
			if (node.id === "||") {
				var a = evalBooleanExpression(node.left);
				var b = evalBooleanExpression(node.right);
				if (a === "true" || b === "true") return "true";
				if (a === "undefined" && b === "undefined") return "undefined";
				if (a === "false" && b === "false") return "false";
				return "undefined";
			}
			if (node.id === "!") {
				var b = evalBooleanExpression(node.right);
				if (b === "true") return "false";
				if (b === "false") return "true";
				return "undefined";
			}
			if (node.id === "=")	node.warning("Se está usando una asignación en la comprobación del 'if'. Podría ser un error si lo que se pretendía era comparar. La comparación se hace con '=='."); 		
			return "undefined";
		}
	}
	
	function searchForReturn(node, datatype) {
		if (!node) return false;
		if (node.type === "statement") {
			if (node.id === "return") {
				var rtype = datatype.infix("=", node.datatype);
				if (!rtype) {
					if (datatype == VoidDatatype) {
						node.error("Las funciones de tipo 'void' no devuelven nada. Puedes usar 'return;' para terminar la función. Si quieres devolver algo modifica el tipo de la función '" + node.scope.context.id + "'.");
					}					
					node.error("La instrucción 'return' debe devolver un valor del mismo tipo que la función donde se encuentre. En este caso debería ser de tipo '" + datatype + "'. Sin embargo, la expresión '" + source.substring(node.from, node.to) + "' es de tipo '" + node.datatype + "'.");
				}
				if (rtype instanceof Warning) {
					node.warning(rtype.msg);
				}
				// Para facilitar el trabajo a iJava2Javascript.js apunto en el nodo el tipo de dato de la función
				node.functionRtype = datatype;
				return true;
			} else
			if (node.id === "if") {
				var yes = searchForReturn(node.yes, datatype);
				var no = searchForReturn(node.no, datatype);
				var condition = evalBooleanExpression(node.condition);
				return (condition == "true" && yes) || (condition == "false" && no) || (yes && no);
			} else
			// NO se busca dentro de switch porque no es posible determinar si el return se ejecutará o no con seguridad
			if (node.id === "for" || node.id === "while" || node.id === "do") {
				return searchForReturn(node.body, datatype);
			} else
			if (node.id === "(block)") {
				for ( var i = 0 ; i < node.right.length ; i++ ) {
					if (searchForReturn(node.right[i], datatype)) {
						if ( i < node.right.length-1 ) {
							node.warning("Las instrucciones a partir de la línea " + (node.right[i].line+1) + " no se ejecutarán ya que 'return' termina la ejecución de la función en la línea anterior.", "warning");
						}
						return true;
					}
				}
			}
			return false;
		}
	}
	
	
	function checkDeclaredFunctions() {
		var mainFound = false;
		for ( var i = 0 ; i < declaredFunctions.length ; i++ ) {
			if (declaredFunctions[i].id === "main") {
				mainFound = true;
			}
			if (declaredFunctions[i].id === "draw") {
				if (declaredFunctions[i].datatype.params.length > 0) {
//					declaredFunctions[i].error("La función 'draw' no debe tener ningún parámetro.");
				}
			}
			var result = searchForReturn(declaredFunctions[i].body, declaredFunctions[i].datatype.rtype);
			if (declaredFunctions[i].id === "(Constructor)") {
				if (result) {
					declaredFunctions[i].error("Los constructores no deben tener ningún return.");
				}
			} else {
				if (!result && declaredFunctions[i].datatype.rtype != VoidDatatype) {				
					declaredFunctions[i].error("La función '" + declaredFunctions[i].id + "' no tiene ninguna instrucción 'return' que devuelva un valor del tipo adecuado, o la que tiene no se ejecuta siempre por depender del cumplimiento de una condición.");
				}
			}
		}
		return mainFound;
	}
	
	secondPass(tree);	
	checkOverloadedMethods();
	if (!checkDeclaredFunctions()) {
		throw {
			line: 1,
			message: "Falta la función principal.",
			severity: "error"
		};
	}
	
}
