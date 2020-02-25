/**
	* parent: Environment padre o null si se trata del global
	* context: Nodo del árbol AST bajo el cual se vayan a producir nuevas declaraciones
	* Los contextos son tres: null para el global, Nodo de tipo Clase, Nodo de tipo función o método
	*/
function Environment(parent, context) {
	this.parent = parent || null;
	this.context = context || (parent ? parent.context : null);
	this.identifiers = {};
	
	this.getParent = function() {
		return this.parent;
	}
	/**
	  * element: Objeto con la información del elemento que se está definiendo.
	  	{
	  		id
	  		type: "variable", "constant", "function", "datatype"
	  		line
	  		col
	  		from
	  		to
	  	}
	  * Al definirlo se le añade automáticamente una referencia cruzada al propio environment 
	  * Esta función almacena el elemento independientemente de si existe o no. Si ya existe lo añade a la lista de elementos con el mismo identificador, si no crea una lista asociada al identificador y lo almacena ahí.	  
	  */
	this.define = function(element) {		
		var identifier = this.identifiers["_iJava_"+element.id];
		if (!identifier) {
			identifier = [];
			this.identifiers["_iJava_"+element.id] = identifier;
		}
		identifier.push(element);
		element.scope = this;
		element.version = identifier.length-1;
		return element;
	}
	/**
	  * Esta función busca el elemento dentro del environment actual y si no lo encuentra lo busca en el superior
	  */
	this.find = function(id, limited) {
		var elements = this.findAll(id, limited);
		if (elements) {
			if (elements.length > 1) {
				return null;
			}
			return elements[0];
		}
		return null;
	}
	
	this.findAll = function(id, limited) {
//		console.log("Find all " + id + " in", this.context, limited);
		if (limited && this.context != limited && !limited.sonOf(this.context)) return null;
		var elements = null;
		elements = this.identifiers["_iJava_"+id];
		if (elements) return elements;
		if (this.parent) return this.parent.findAll(id, limited);
		return null;
	}
	
	this.findMethod = function(id, args, limited) {
//		console.log("findMethod " + id + " con argumentos ", args);
		var elements = this.findAll(id, limited);
		if (!elements) return null;
		var method = null;
		for ( var i = 0 ; i < elements.length && !method; i++ ) {
			var theMethod = elements[i];
			if (!theMethod.datatype) {
				console.log("Desconocido environtment");
				return null;
			}
			if (!theMethod.datatype instanceof FunctionDatatype) {
				continue;
			}
			if (theMethod.datatype.params && theMethod.datatype.params.length === args.length) {
				var fail = false;
				for ( var j = 0 ; j < theMethod.datatype.params.length && !fail; j++ ) {
					var parameter = theMethod.datatype.params[j];
					var mix = parameter.datatype.infix("=", args[j].datatype);
					if (!mix || mix instanceof Warning) {
						fail = true;
					}								
				}
				if (!fail) {
					method = theMethod;
					break;
				}
			}
		}
		return method;
	}

	var identifierdistance = function(a, b) {
		// Checking words with equal length: distance equals number of differences
		if (a.length === b.length) {
			if (a === b) return 0;
			var fails = 0;
			for ( var i = 0 ; i < a.length ; i++ ) {
				if (a[i] !== b[i]) {
					if (a[i].toUpperCase() === b[i].toUpperCase()) {
						fails += 0.5;
					} else {
						fails++; 
					}
				}
			}
			return fails;
		} else 
		if (a.length < b.length) {
			var o = a;
			a = b;
			b = o;
		}
		// Insertion/deletion of one character: distance equals 
		if (a.length-b.length == 1) {
			var fails = 1;
			var bindex = 0;		
			var aindex = 0;
			while ( aindex < a.length-1 ) {
				if (a[aindex] !== b[bindex]) {
					if (a[aindex].toUpperCase() === b[bindex].toUpperCase()) {
						aindex++;
						fails += 0.5;
					} else {
						aindex++;
						fails++;
					}
				} else {
					aindex++;
					bindex++;
				}
			}
			return fails;
		}
		return 100;
	}
	/**
	  * Esta función devuelve la lista de entradas con identificadores similares al pasado como parámetro del environment o de alguno de sus ancestros. 
	  */
	this.findSimilar = function(id, limited) {
		var mindist = 3;
		var similars = {};
		
		if (limited && this.context != limited && !limited.sonOf(this.context)) return null;
		if (this.parent) {
			similars = this.parent.findSimilar(id, limited);
			if (similars) {
				for (var key in similars) {
					mindist = similars[key];
					break;
				}
			} else {
				similars = {};
			}
		}
		
		for (var key in this.identifiers) {
			var dist = identifierdistance("_iJava_"+id, key);
			if (similars[key] && similars[key] !== dist) token.error("Unknown error 1");
			if (dist <= mindist) {
				similars[key] = dist;
				if (dist < mindist) {
					mindist = dist;
				}
			}
		}
		for (key in similars) {
			if (similars[key] > mindist) delete similars[key];
		}
		return similars;
	}
}

function Declaration(token, basetype, datatype) {
	this.id = token.id;
	this.scope = null; // Lo asigna el propio environment al registrar este objeto
	this.basetype = basetype;
	this.datatype = datatype || null;
	this.type = ""; // variable, constant, function, datatype
	this.body = null;
	this.internalScope = null;
	this.line = token.line;
	this.col = token.col;	
	this.sonOf = function(other) {
		return false;
	}
}
