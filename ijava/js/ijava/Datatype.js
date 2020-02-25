function Warning(msg, guess) {
	this.msg = msg;
	this.guess = guess;
}

function Datatype(id) {
	this.id = id;
	this.type = "datatype";		
}

// Devuelve el mayor tipo compatible con ambos. Por defecto sólo si son iguales devuelve a uno de ellos	
Datatype.prototype.gcd = function(other) {
	if (this.id == other.id) return this;
	else return null;
}

// Para comprobar si se puede hacer el casting
Datatype.prototype.isConvertibleTo = function(other) {
	return false;
}

Datatype.prototype.prefix = function(operator) {
	return null;
}

Datatype.prototype.sufix = function(operator) {
	return null;
}

Datatype.prototype.infix = function(operator, right) {
	return null;
}

Datatype.prototype.toString = function() {
	return this.id;
}

Datatype.prototype.complete = function() {
	return true;
}

Datatype.prototype.fillTheGap = function(element) {
}

Datatype.prototype.getDefaultValue = function() {
	return null;
}

Datatype.prototype.getDefaultInitializer = function() {
	return this.getDefaultValue();
}

// Tipos básicos

function NumberDatatype(id, precission) {
	Datatype.call(this, id);
	this.precission = precission;
}

NumberDatatype.prototype = Object.create(Datatype.prototype);
NumberDatatype.prototype.constructor = NumberDatatype;

NumberDatatype.prototype.gcd = function(other) {
	if (other instanceof NumberDatatype) {
		if (other.precission > this.precission) return other;
		else return this;
	}
	return null;
}

NumberDatatype.prototype.prefix = function(operator) {
	if (operator === "-" || operator === "++" || operator === "--") return this;
	return null;
}

NumberDatatype.prototype.sufix = function(operator) {
	if (operator === "++" || operator === "--") return this;
	return null;
}

NumberDatatype.prototype.infix = function(operator, right) {
	var left = this;
	if (right instanceof NumberDatatype) {
		if (operator === "+" || operator === "-" || operator === "*" || operator === "/" || operator === "%" || operator === "<<" || operator === ">>" || operator === "&" || operator === "|" || operator === "^") { 
			if (right.precission > this.precission) return right;
			return left;
		}
		if (operator === ">" || operator === "<" || operator === ">=" || operator === "<=") {
			return BooleanDatatype;
		}
		if (operator === "==" || operator === "!=") {
			if (right.precission != left.precission) {
				//error("", line, col);
				return new Warning("La comparación de enteros y reales puede dar resultados inesperados.", BooleanDatatype);
			}
			return BooleanDatatype;
		}
		if (operator === "=" || 
		    operator === "+=" || operator === "-=" || operator === "/=" || operator === "*=" || operator === "%=") {		
			if (left.precission < right.precission) {
				return new Warning("El resultado de guardar valores reales en variables enteras puede no ser el esperado.", left);
				
			}
			return left;
		}
	}
	// Para hacer la suma con String asociativa por la izquierda
	if (right == StringDatatype && operator === "+") {
		return right;
	}
	return null;
}

NumberDatatype.prototype.getDefaultValue = function() {
	return 0;
}

var ByteDatatype = new NumberDatatype('byte', 1);
var ShortDatatype = new NumberDatatype('short', 2);
var IntegerDatatype = new NumberDatatype('int', 4);
var LongDatatype = new NumberDatatype('long', 8);
var FloatDatatype = new NumberDatatype('float', 16);
var DoubleDatatype = new NumberDatatype('double', 32);


IntegerDatatype.isConvertibleTo = function(other) {
	if (other == IntegerDatatype) return true;
	if (other == CharDatatype) return true;
	return false;
}

DoubleDatatype.isConvertibleTo = function(other) {
	if (other == DoubleDatatype) return true;
	if (other == IntegerDatatype) return true;
	return false;
}

var CharDatatype = new Datatype('char');

CharDatatype.isConvertibleTo = function(other) {
	if (other == IntegerDatatype) return true;
	return false;
}

CharDatatype.infix = function(operator, right) {
	var left = this;
	if (right == CharDatatype) {
		if (operator === ">" || operator === "<" || operator === ">=" || operator === "<=") {
			return BooleanDatatype;
		}
		if (operator === "==" || operator === "!=") {
			return BooleanDatatype;
		}
		if (operator === "=") {		
			return left;
		}
	}
	// Para hacer la suma con String asociativa por la izquierda
	if (right == StringDatatype && operator === "+") {
		return right;
	}
	return null;
}

CharDatatype.getDefaultValue = function() {
	return '""';
}

var BooleanDatatype = new Datatype('boolean');

BooleanDatatype.prefix =  function(operator) {
	if (operator === "!") return this;
	return null;
}

BooleanDatatype.infix = function(operator, right) {
	var left = this;
	if (right == BooleanDatatype) {
		if (operator === "&&" || operator === "||" || operator === "==" || operator === "!=") {
			return BooleanDatatype;
		}
		if (operator === "=") {		
			return left;
		}
	}
	// Para hacer la suma con String asociativa por la izquierda
	if (right == StringDatatype && operator === "+") {
		return right;
	}
	return null;
}

BooleanDatatype.getDefaultValue = function() {
	return false;
}

// Funciones


var VoidDatatype = new Datatype('void');

VoidDatatype.infix = function(operator, right) {
	if (operator === "=" && right == this) return this;
}


function FunctionDatatype(rtype, params) {
	Datatype.call(this, '(function)');
	this.rtype = rtype || null;
	this.params = params || null;	
}

FunctionDatatype.prototype = Object.create(Datatype.prototype);
FunctionDatatype.prototype.constructor = FunctionDatatype;

FunctionDatatype.prototype.toString = function() {
	var s = this.rtype.toString();
	s = s + "(";
	if (this.params) {
		var i = 0;
		for ( i = 0 ; i <	this.params.length-1 ; i++ ) {
			s = s + this.params[i].datatype;
			s = s + ", ";
		}
		if (this.params.length > 0) s = s + this.params[i].datatype;
	}
	s = s + ")";
	return s;
}

FunctionDatatype.prototype.infix = function(operator, right) {
	var left = this;
	if (right instanceof FunctionDatatype && operator === "=") {
		var t = null;
		t = left.rtype.infix("=", right.rtype);
		if (!t || t instanceof Warning) return null;
		if (left.params.length != right.params.length) return null;
		var n = numberOfSimilarParams(left.params, right.params);
		if (n == left.params.length) return left;
	}
	return null;
}



FunctionDatatype.prototype.complete = function() {
	if (!this.rtype) return false;
	if (!this.rtype.complete()) return false;
	if (this.params) {
		for ( var i = 0 ; i < this.params.length ; i++ ) {
			if (!this.params[i].datatype) return false;
			if (!this.params[i].datatype.complete()) return false;
		}
	}
	return true;
}

FunctionDatatype.prototype.fillTheGap = function(element) {
	if (!this.rtype) {
		this.rtype = element;				
	} else {
		this.rtype.fillTheGap(element);
	}
	// No se hace nada con los parámetros
}

function numberOfSimilarParams(args, params) {
	if (!args && !params) return 0;
	if (args && !params) return args.length;
	if (!args && params) return params.length;
	var n = 0;
	for ( var i = 0 ; i <	args.length ; i++ ) {
		if (!params[i].datatype) continue;
		var mixt = params[i].datatype.infix("=", args[i].datatype); 
		if (!mixt) {
			continue;
		}
		// Si hay una diferencia de precisión aunque sea compatible quiero que cuente menos.
		// TODO: Esto puede fallar con la herencia
		if (mixt instanceof Warning || params[i].datatype.id !== args[i].datatype.id) {
			n = n + 0.5;
		} else {
			n = n + 1;
		}
	}
	return n;
}	

// Objetos
function NullDatatype() {
	Datatype.call(this, 'null');	
}

NullDatatype.prototype = Object.create(Datatype.prototype);
NullDatatype.prototype.constructor = NullDatatype;

NullDatatype.prototype.gcd = function(other) {
	if (other instanceof ArrayDatatype ||
			other == StringDatatype ||
			other instanceof ClassDatatype ) {
		return other;
	}
	return null;
}

NullDatatype.prototype.infix = function(operator, right) {
	var left = this;
	if (right instanceof ArrayDatatype || right == GenericArrayDatatype ||
			right == StringDatatype ||
			right instanceof ClassDatatype ||
			right instanceof NullDatatype) {
		if (operator === "==" || operator === "!=") {
			return BooleanDatatype;
		}
	}
	// Para hacer la suma con String asociativa por la izquierda
	if (right == StringDatatype && operator === "+") {
		return right;
	}
	return null;
}

NullDatatype.prototype.isConvertibleTo = function(other) {
	if (other instanceof ClassDatatype) return true;
	return false;
}



function ClassDatatype(token, father) {
	Datatype.call(this, token.id);
	this.line = token.line;
	this.col = token.col;	
	this.from = token.from;
	this.to = token.to;	
	this.internalScope = null;
	this.datatype = this; // Truco para que los métodos de SemanticChecker que resuelven tipos declarados más tarde funcionen
	this.father = father;
}

ClassDatatype.prototype = Object.create(Datatype.prototype);
ClassDatatype.prototype.constructor = ClassDatatype;

ClassDatatype.prototype.gcd = function(other) {
	if (other instanceof NullDatatype) {
		return this;
	} 
	// TODO: Esto no funciona con herencia de más de 1 nivel, hay que buscar antepasados comunes
	if (other instanceof ClassDatatype && (this.id === other.id || (other.father && this.id === other.father.id))) {
		return this;
	}
	return null;
}

ClassDatatype.prototype.infix = function(operator, right) {
	var left = this;
	if (right instanceof ClassDatatype ||
			right instanceof NullDatatype ) {
		if (operator === "==" || operator === "!=" || operator === "instanceof") {
			return BooleanDatatype;
		}
		if (operator === "=") {
			return left.gcd(right);
		}
	}
	// Para hacer la suma con String asociativa por la izquierda
	if (right == StringDatatype && operator === "+") {
		return right;
	}
	return null;
}

ClassDatatype.prototype.getDefaultValue = function() {
//	return "new __" + this.id + "()";
	return "NullObject";
	return null;
}

ClassDatatype.prototype.getDefaultInitializer = function() {
	return "NullObject";
}

ClassDatatype.prototype.addMethod = function(id, rtype, params) {
	var identifier = {
		id: id,
		line: 0,
		col: 0,
		from: 0,
		to: 0			
	}
	var datatype = new FunctionDatatype(rtype, params);
	var entry = new Declaration(identifier, null, datatype);
	entry.type = "function";
	entry.method = true;
	entry.visibility = "public";
	entry.static = false;
	entry.error = identifier.error;
	if (entry.id === this.id) {
		entry.id = "(Constructor)";
	}
	this.internalScope.define(entry);		
}

ClassDatatype.prototype.addMember = function(id, datatype) {
	var identifier = {
		id: id,
		line: 0,
		col: 0,
		from: 0,
		to: 0			
	}
	var entry = new Declaration(identifier, null, datatype);
	entry.type = "variable";		
	entry.member = true;
	entry.visibility = "public";
	entry.static = false;
	entry.error = identifier.error;			
	if (entry.id === this.id) {
		identifier.error("Error al tratar de declarar un miembro con el nombre de la clase donde se encuentra.");
	}
	this.internalScope.define(entry);
}

ClassDatatype.prototype.sonOf = function(father) {
	return father == this.father;
}

ClassDatatype.prototype.isConvertibleTo = function(other) {
	console.log("is convertible", this, other);
	if (other instanceof ClassDatatype) return true;
	return false;
}

var ObjectDatatype = new ClassDatatype({id:'Object', line:0, col:0, from:0, to:0});
ObjectDatatype.internalScope = new Environment(null, ObjectDatatype);
ObjectDatatype.addMethod("equals", BooleanDatatype, [{datatype:ObjectDatatype}]);

var GenericArrayDatatype = new Datatype("GenericArray");

GenericArrayDatatype.infix = function(operator, right) {
	var left = this;
	if (right instanceof ArrayDatatype ||
			right instanceof NullDatatype ) {
		if (operator === "==" || operator === "!=" || operator === "instanceof") {
			return BooleanDatatype;
		}
		if (operator === "=") {
			return left.gcd(right);
		}
	}
	return null;
}

GenericArrayDatatype.gcd = function(other) {
	if (other instanceof NullDatatype) {
		return this;
	}
	if (other instanceof ArrayDatatype) {
		return this;
	}
	return null;
}

GenericArrayDatatype.complete = function() {
	return true;
}

// El tipo de dato Array hago que herede de Clase porque tiene un miembro y se comporta como los objetos al interactuar con null
function ArrayDatatype(dimensions, celltype) {
	ClassDatatype.call(this, {id:'(array)', line:0, col:0, from:0, to:0}, ObjectDatatype); 
	this.dimensions = dimensions || 0;
	this.celltype = celltype || null;
	this.internalScope = new Environment(null, this);
	this.addMember("length", IntegerDatatype);	
}

ArrayDatatype.prototype = Object.create(ClassDatatype.prototype);
ArrayDatatype.prototype.constructor = ArrayDatatype;

ArrayDatatype.prototype.gcd = function(other) {
	if (other instanceof NullDatatype) {
		return this;
	}
	if (other instanceof ArrayDatatype) {
	/* Con este if se impide que un array de enteros se pase como parámetro a una función que lo espera de doubles
		 Pero también obliga a hacer un caso especial en iJavaSemantic para permitir inicializar arrays de doubles
		 con valores enteros.
	*/
		if (this.dimensions === other.dimensions && this.celltype.id === other.celltype.id) return this;
	// Con este se permite eso y también inicializar un array de doubles con enteros entre llaves
//		if (this.dimensions === other.dimensions && this.celltype.gcd(other.celltype) == this.celltype) return this;
	}
	return null;
}

ArrayDatatype.prototype.toString = function() {
	var str = this.celltype.toString();
	for ( var i = 0 ; i < this.dimensions ; i++ ) str = str + "[]";
	return str;
}

ArrayDatatype.prototype.complete = function() {
	return this.celltype && this.celltype.complete();// || this.generic;
}

ArrayDatatype.prototype.fillTheGap = function(element) {
	if (!this.celltype) {
		this.celltype = element;
	}
}

ArrayDatatype.prototype.getDefaultValue = function() {
	return "new MyArray(null, " + this.celltype.getDefaultInitializer() + ")";
}

var StringDatatype = new ClassDatatype({id:'String', line:0, col:0, from:0, to:0}, ObjectDatatype);
StringDatatype.super = ClassDatatype.prototype; 

StringDatatype.infix = function(operator, right) {
	var left = this;
	var result = this.super.infix.call(this,operator,right);
	if (result) return result;
	// Para permitir concatenar cadenas
	if (operator === "+" || operator === "+=") { 
		return left;
	}	
	return null;
}
// Para que funcione la función find de environment debe seguir buscando en el padre en caso de herencia
StringDatatype.internalScope = new Environment(ObjectDatatype.internalScope, StringDatatype);		
StringDatatype.addMethod("String", StringDatatype, []); 
StringDatatype.addMethod("String", StringDatatype, [{datatype:new ArrayDatatype(1,CharDatatype)}]); 
StringDatatype.addMethod("String", StringDatatype, [{datatype:StringDatatype}]); 
StringDatatype.addMethod("length", IntegerDatatype, []);
StringDatatype.addMethod("charAt", CharDatatype, [{datatype:IntegerDatatype}]);
StringDatatype.addMethod("equals", BooleanDatatype, [{datatype:ObjectDatatype}]); // StringDatatype
StringDatatype.addMethod("concat", StringDatatype, [{datatype:StringDatatype}]);
StringDatatype.addMethod("compareTo", IntegerDatatype, [{datatype:StringDatatype}]);
StringDatatype.addMethod("indexOf", IntegerDatatype, [{datatype:CharDatatype}]);
StringDatatype.addMethod("substring", StringDatatype, [{datatype:IntegerDatatype}]);
StringDatatype.addMethod("substring", StringDatatype, [{datatype:IntegerDatatype}, {datatype: IntegerDatatype}]);
StringDatatype.addMethod("toCharArray", new ArrayDatatype(1, CharDatatype), []);

// Lo pongo aquí porque hasta este momento no estaba definido StringDatatype y es necesario para usarlo como parámetro
ObjectDatatype.addMethod("toString", StringDatatype, []);
