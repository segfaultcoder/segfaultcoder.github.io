// Soporte OO

function remove__(str) {
	if (str[0] === "_" && str[1] == "_") str = str.substring(2,str.length);
	else console.log("Error:", str);
	var n = str.lastIndexOf("__");
	if (n >= 0) str = str.substring(0,n);
	return str;
}

function __Object(id) {
	this.__id = id || "Object";
	this.__instance = __Object.prototype.instances;
	this.__created = false;
	__Object.prototype.instances++;
}

__Object.prototype.__ObjectConstructor = function() {
	this.__created = true;
	return this;
}

__Object.prototype.isNull = function() {
	return !this.__created;
}

__Object.prototype.testNull = function(line) {
	if (this.isNull()) throw {
		message: "Error en la línea " + line + " al intentar utilizar un objeto que aún no ha sido creado.",
		line: line
	};  
}

__Object.prototype.execute = function(method, args, line) {
	if (this.isNull()) {
		method = remove__(method);
		throw {
			message: "Error en la línea " + line + " al intentar invocar el método '" + method + "' sobre un objeto que no está creado.",
			line: line
		};  
	} else {
		return this[method].apply(this,args);
	}
}

__Object.prototype.getValue = function(member, line) {
	if (this.isNull()) {
		var msg = "Error en la línea " + line + " al intentar utilizar un objeto que aún no ha sido creado.";
		if (member instanceof String || typeof member == "string") {
			msg = "Error en la línea " + line + " al intentar acceder al miembro  '" + remove__(member) + "' de un objeto que no está creado.";
		}
		throw {
			message: msg,
			line: line
		};
	} else {
		return this[member];
	}
}

// TODO: Hacer que devuelva el valor para encadenar asignaciones
__Object.prototype.putValue = function(member, value, line) {
	if (this.isNull()) {
		var msg = "Error en la línea " + line + " al intentar utilizar un objeto que aún no ha sido creado.";
		if (member instanceof String || typeof member == "string") {
			msg = "Error en la línea " + line + " al intentar modificar el miembro  '" + remove__(member) + "' de un objeto que no está creado.";
		}
		throw {
			message: msg,
			line: line
		};
	} else {
		this[member] = value;
	}
}

__Object.prototype.autoInc = function(member, value, line) {
	if (this.isNull()) {
		member = remove__(member);
		throw {
			message: "Error en la línea " + line + " al intentar modificar el miembro  '" + member + "' de un objeto que no está creado.",
			line: line
		};
	} else {
		this[member] += value;
	}
}

__Object.prototype.autoDec = function(member, value, line) {
	if (this.isNull()) {
		member = remove__(member);
		throw {
			message: "Error en la línea " + line + " al intentar modificar el miembro  '" + member + "' de un objeto que no está creado.",
			line: line
		};
	} else {
		this[member] -= value;
	}
}

__Object.prototype.autoDiv = function(member, value, line, isInteger) {
	if (this.isNull()) {
		member = remove__(member);
		throw {
			message: "Error en la línea " + line + " al intentar modificar el miembro  '" + member + "' de un objeto que no está creado.",
			line: line
		};
	} else {
		if (isInteger) {
			this[member] = parseInt(this[member] / value);
		} else {
			this[member] /= value;
		}
	}
}

__Object.prototype.autoMul = function(member, value, line) {
	if (this.isNull()) {
		member = remove__(member);
		throw {
			message: "Error en la línea " + line + " al intentar modificar el miembro  '" + member + "' de un objeto que no está creado.",
			line: line
		};
	} else {
		this[member] *= value;
	}
}

__Object.prototype.autoMod = function(member, value, line, isInteger) {
	if (this.isNull()) {
		member = remove__(member);
		throw {
			message: "Error en la línea " + line + " al intentar modificar el miembro  '" + member + "' de un objeto que no está creado.",
			line: line
		};
	} else {
		if (isInteger) {
			this[member] = parseInt(this[member] % value);
		} else {
			this[member] %= value;
		}
	}
}

__Object.prototype.__toString__0 = function() {
	if (this.isNull()) return new __String("null");
	return new __String(this.__id.replace("__", "") + "@" + this.__instance);
}

__Object.prototype.__equals__0 = function(other) {
	return this === other;
}

__Object.prototype.instances = 0;

// El objeto que se asigna en lugar de null
var NullObject = new __Object('null');

// Array
function MyArray(sizes, defaultCellValue) {
	__Object.call(this, 'MyArray');
	this.ndims = 0;
	this.offsets = [];
	this.limits = [];
	this.data = [];
	this.defaultCellValue = defaultCellValue;
	this.__length = 0;	

	if (sizes) this.initialize(sizes);
}

MyArray.prototype = Object.create(__Object.prototype);
MyArray.prototype.constructor = MyArray;

MyArray.prototype.initialize = function(sizes) {
	this.__ObjectConstructor();
	this.ndims = sizes.length;
	var index = 1;
	for ( var i = 0 ; i < sizes.length ; i++ ) {
		this.limits[i] = sizes[i];
		this.offsets[this.ndims-1-i] = index;
		index = index * sizes[this.ndims-1-i];
	}
	this.__length = sizes[0];
	// Rellenar con valores por defecto para el tipo de dato
	for ( var i = 0 ; i < index ; i++ ) {
		this.data[i] = this.defaultCellValue;
	}
}

MyArray.prototype.sizeOf = function(dimension) {
	if (this.ndims === 0) {
		throw {
			message: "Error al intentar calcular el tamaño de un array que aún no ha sido creado.",
			line: 1
		};  			
	}
	if (dimension < 1 || dimension > this.ndims) {
		throw {
			message: "Error al usar sizeOf: El array sólo tiene " + this.ndims + " dimensiones y se intenta saber el tamaño de la nº " + dimension + ".",
			line: 1
		};  			
	}
	return this.limits[dimension-1];
}

MyArray.prototype.transform = function(indices, line) {
	// TODO: cambiar por this.ndims == 0 
	if (indices.length != this.ndims) {
		throw {
			message: "Error en la línea " + line + " al intentar utilizar un array que aún no ha sido creado.",
			line: line
		};  			
	}
	var index = 0;
	for ( var i = 0 ; i < this.ndims ; i++ ) {
		if (indices[i] < 0 || indices[i] >= this.limits[i]) {
			throw {
				message: "Error en la línea " + line + " al intentar acceder a la celda [" + indices + "].",
				line: line
			};  			
		}
		index = index + indices[i]*this.offsets[i];				
	}
	return index;
}

// Sobreescribe el método getValue de __Object para diferenciar entre las dos únicas propiedades de un array
MyArray.prototype.getValue = function(indices, line) {
	if (this.ndims === 0) {
		throw {
			message: "Error en la línea " + line + " al intentar utilizar un array que aún no ha sido creado.",
			line: line
		};  			
	}
	if (indices === "__length") return this.__length;
	var index = this.transform(indices, line);
	return this.data[index];
}

// Sobreescribe el método putValue de __Object para diferenciar entre las dos únicas propiedades de un array
MyArray.prototype.putValue = function(indices, value, line) {
	if (this.ndims === 0) {
		throw {
			message: "Error en la línea " + line + " al intentar utilizar un array que aún no ha sido creado.",
			line: line
		};  			
	}
	if (indices === "__length") {
		throw {
			message: "La propiedad 'length' no puede ser modificada (Línea " + line + ").",
			line: line
		};  				
	}
	var index = this.transform(indices, line);
	this.data[index] = value;
}

MyArray.prototype.autoInc = function(indices, value, line) {
	var index = this.transform(indices, line);
	this.data[index] += value;
}

MyArray.prototype.autoDec = function(indices, value, line) {
	var index = this.transform(indices, line);
	this.data[index] -= value;
}

MyArray.prototype.autoDiv = function(indices, value, line, isInteger) {
	var index = this.transform(indices, line);
	if (isInteger) {
		this.data[index] = parseInt(this.data[index] / value)	
	} else {
		this.data[index] /= value;
	}
}

MyArray.prototype.autoMul = function(indices, value, line) {
	var index = this.transform(indices, line);
	this.data[index] *= value;
}

MyArray.prototype.autoMod = function(indices, value, line, isInteger) {
	var index = this.transform(indices, line);
	if (isInteger) {
		this.data[index] = parseInt(this.data[index] % value)	
	} else {
		this.data[index] %= value;
	}
}

var _auxGetData = function(array, dimension, offset) {
	if (dimension == array.ndims-1)  {
		return array.data.slice(offset, offset+array.limits[dimension]);
	} else {
		var result = [];
		for ( var i = 0 ; i < array.limits[dimension] ; i++ ) {
			result.push(_auxGetData(array, dimension+1, offset + i*array.offsets[dimension]));
		}
		return result;
	}
}

MyArray.prototype.getData = function() {
	if (this.isNull()) return null;
	return _auxGetData(this, 0, 0);
}

MyArray.prototype.__toString__0 = function() {
	if (this.isNull()) return "null";
	var s = "";
	if (this.ndims == 2) {
		for ( var j = 0 ; j < this.limits[0] ; j++ ) {
			s = s + "[";
			var i = 0;
			for ( i = 0 ; i < this.limits[1]-1 ; i++ ) {
				s = s + this.data[j*this.offsets[0]+i];
				s = s + ", ";
			}
			if (this.limits[1] > 0) {			
				s = s + this.data[j*this.offsets[0]+i];
			}
			s = s + "]";
			if (j < this.limits[0]-1) s = s + "\n";
		}
	} else {
		s = s + "[";
		var i = 0;
		for ( i = 0 ; i < this.__length-1 ; i++ ) {
			var str = "";
			if (this.data[i] instanceof __Object) str = this.data[i].__toString__0();
			else str = this.data[i];
			s = s + str;
			s = s + ", ";
		}
		if (this.__length > 0) {
			var str = "";
			if (this.data[i] instanceof __Object) str = this.data[i].__toString__0();
			else str = this.data[i];
			s = s + str;
		}
		s = s + "]";
	}
	return new __String(s);
}



function fillArray(myarray, indices, dimension, array, line) {
	if (!array) return;
	for ( var i = 0 ; i < array.length ; i++ ) {
			indices[dimension] = i;
		if (array[i] instanceof Array) {
			fillArray(myarray, indices, dimension+1, array[i], line);
		} else {
			myarray.putValue(indices, array[i], line);
			indices[dimension]++;  		
		}
	}  	
}

function MyArrayInitializer(dimensions, array, line, defaultCellValue) {
	var sizes = [];
	var ref = array;
	var index = 0;
	while (index < dimensions) {
		sizes[index] = ref.length;
		ref = ref[0];
		index++;
	}
	var element = new MyArray(sizes, defaultCellValue);
	// Guardar todos los elementos
	fillArray(element, [], 0, array, line);
	return element;
}

///////////////////////
// Me salto la regla de creación de clases para simplificar el código generado ya que es muy habitual el crear Objetos de tipo String a partir de literales
function __String(literal) {
	__Object.call(this, '__String');
	if (literal !== undefined) {
		this.__ObjectConstructor();
		if (literal instanceof __Object) literal = literal.__toString__0();
		this.__data = literal;
	} else {
		this.__data = null;
	}
}

__String.prototype = Object.create(__Object.prototype);
__String.prototype.constructor = __String;

__String.prototype.__Constructor__0 = function() { // Constructor vacío
	this.__ObjectConstructor();
	this.__data = "";
	return this;
}

__String.prototype.__Constructor__1 = function(myarray) { // Constructor array of char
	if (myarray instanceof __Object && myarray.isNull()) {
		throw {
			message: "Error al intentar crear un String a partir de 'null'.",
			line: 1			
		}
	}
	this.__ObjectConstructor();
	this.__data = myarray.data.join("");
	return this;
}

__String.prototype.__Constructor__2 = function(str) { // Constructor String
	if (str instanceof __Object && str.isNull()) {
		throw {
			message: "Error al intentar crear un String a partir de otro que no está creado.",
			line: 1			
		}
	}
	this.__ObjectConstructor();
	if (str instanceof __String) {
		// String objeto
		this.__data = str.__data;
	} else {
		// String literal
		this.__data = str;
	}
	return this;
}

__String.prototype.__length__0 = function() {
	return this.__data.length;
}

// Este método sobreescribe el toString de Object original de javascript.
// Es necesario para que print, println y readX funcionen correctamente
__String.prototype.toString = function() {
	if (this.isNull()) return "null";
	return this.__data;
}

__String.prototype.__toString__0 = function() {
	if (this.isNull()) return new __String("null");
	return this;
}

__String.prototype.__equals__0 = function(other) {
	return this.__data === other.__data;
}

__String.prototype.__compareTo__0 = function(other) {
	if (other instanceof __Object && other.isNull()) {
		throw {
			message: "Error al intentar usar el método compareTo con 'null'.",
			line: 1
		};  
	}
	if (this.__data < other.__data) return -1;
	if (this.__data > other.__data) return 1;
	return 0;
}

__String.prototype.__concat__0 = function(other) {
	var right = other;
	if (other instanceof __Object) right = other.__toString__0(0);
	return new __String(this.__data + right);
}

__String.prototype.__append__0 = function(other) {
	var right = other;
	if (other instanceof __Object) right = other.__toString__0(0);
	this.__data += right;
	return this;
}

__String.prototype.__indexOf__0 = function(other) {
	return this.__data.indexOf(other);
}

__String.prototype.__substring__0 = function(begin) {
	return this.__substring__1(begin);
}

__String.prototype.__substring__1 = function(begin, end) {
	end = end || this.__data.length;
	return new __String(this.__data.substring(begin,end));
}

__String.prototype.__toCharArray__0 = function() {
	var array = this.__data.split("");
	var ma = MyArrayInitializer(1, array, 0, null);
	return ma;
}

__String.prototype.__charAt__0 = function(pos) {
	if (pos < 0 || pos >= this.__data.length) throw {
		message: "Error al intentar acceder a la posición " + pos + " de la cadena '" + this.__data + "'. En este caso, las posiciones válidas van desde 0 hasta " + (this.__data.length-1) + ".",
		line: 1
	};  
	return this.__data[pos];
}