// Basado en el trabajo de Douglas Crockford

// Produce an array of simple token objects from a string.
// A simple token object contains these members:
//	  type: 'name', 'string', 'number', 'operator'
//	  value: string or number value of the token
//	  from: index of first character of the token
//	  to: index of the last character + 1
//		line:
//		col:

function createTokens(source) {
	var c;					  // The current character.
	var from;				   // The index of the start of the token.
	var i = 0;				  // The index of the current character.
	var line = 1;				// The line of the current character
	var startcol = 1;		// The column of the first character in current token
	var col = 1;				// The column of the current character
	var length = source.length;
	var n;					  // The number value.
	var q;					  // The quote character.
	var str;					// The string value.

	var result = [];			// An array to hold the results.

	var make = function (type, value) {

// Make a token object.

		return {
			type: type,					// identifier, integer, real, string, char, operator
			value: value,
			from: from,
			to: i,
			line: line,
			col: startcol,
			error: function (message) {
				this.message = message;
				this.severity = "error";
				throw this;
			}
		};
	};

// Begin tokenization. If the source string is empty, return nothing.

	if (!this) {
		return;
	}

// Loop through this text, one character at a time.

	c = source.charAt(i);
	while (c) {
		from = i;

// Ignore whitespace.

		if (c <= ' ') {
			i++;
			col++;
			if (c === '\n') {
				line++;
				col = 1;
				if (source.charAt(i) === '\r') {
					i++;
					
				}
			} else 
			if (c === '\r') {
				line++;
				col = 1;
				if (source.charAt(i) === '\n') {
					i++;
				}
			}
			c = source.charAt(i);

// name.

		} else 
		if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === "_") {
				startcol = col;
			str = c;
			i++;
			col++;
			for (;;) {
				c = source.charAt(i);
				if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
						(c >= '0' && c <= '9') || c === '_') {
					str += c;
					i ++;
					col++;
				} else {
					break;
				}
			}
			result.push(make('identifier', str));

// number.

// A number cannot start with a decimal point. It must start with a digit,
// possibly '0'.

		} else if (c >= '0' && c <= '9') {
			var integer = true;
			startcol = col;
			str = c;
			i++;
			col++;

// Look for an hexadecimal number
						if (c === "0" && i < length && source.charAt(i).toUpperCase() === "X") {
							c = source.charAt(i);
							str += c;
							col++;
							i++;
							col++;
							c = source.charAt(i);
						while ( (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') ) {
							str += c;
							i++;
							col++;
							c = source.charAt(i);								
							}
						}
// Look for more digits.

			for (;;) {
				c = source.charAt(i);
				if (c < '0' || c > '9') {
					break;
				}
				i++;
				col++;
				str += c;
			}

// Look for a decimal fraction part.

			if (c === '.') {
				integer = false;
				i++;
				col++;
				str += c;
				for (;;) {
					c = source.charAt(i);
					if (c < '0' || c > '9') {
						break;
					}
					i++;
					col++;
					str += c;
				}
			}

// Look for an exponent part.

						var tipo = "real";
						if (integer) tipo = "integer";
						
			if (c === 'e' || c === 'E') {
				i++;
				col++;
				str += c;
				c = source.charAt(i);
				if (c === '-' || c === '+') {
					i++;
					col++;
					str += c;
					c = source.charAt(i);
				}
				if (c < '0' || c > '9') {
					make(tipo, str).error("El exponente debe ser un número entero. No es correcto utilizar '" + c + "' como parte del exponente.");
				}
				do {
					i++;
					col++;
					str += c;
					c = source.charAt(i);
				} while (c >= '0' && c <= '9');
			}

// Make sure the next character is not a letter.

			if ((c >= 'a' && c <= 'z') || c === "_") {
				str += c;
				i++;
				col++;
				make(tipo, str).error("La cadena '" + str + "' no es un número ni un nombre. Debe haber un espacio en blanco entre el último dígito y la primera letra.");
			}

// Convert the string value to a number. If it is finite, then it is a good
// token.

			n = +str;
			if (isFinite(n)) {
				result.push(make(tipo, str));
			} else {
				make(tipo, str).error("El número '" + str + "' no se puede representar en el ordenador.");
			}

// string

		} else if (c === '\'' || c === '"') {
			var escapement = false;
			startcol = col;
			str = '';
			q = c;
			i++;
			col++;
			for (;;) {
				c = source.charAt(i);
				if (c < ' ') {
					var msg1 = "";
					
					if (q === "'") {
						if (str.length > 0) {
							msg1 = "El carácter " + q + str + q +" no está completamente definido. ";
						}
					} else {
						msg1 = "La cadena " + q + str + q +" no está completamente definida. ";
					}
					msg1 += "Las cadenas de caracteres se deben encerrar entre comillas dobles y los caracteres individuales entre comillas simples.";
					var msg2 = "Las cadenas de caracteres no pueden interrumpirse con un salto de línea.";
					make('string', str).error(c === '\n' || c === '\r' || c === '' ? msg2 : msg1);				
				}

// Look for the closing quote.

				if (c === q) {
					break;
				}

// Look for escapement.
				if (c === '\\') {
					escapement = true;
					str += c;
					i++;
					col++;
					if (i >= length) {
						make('string', str).error("La cadena '" + str + "' no se ha terminado de definir.");
					}
					c = source.charAt(i);
					switch (c) {
					case 'b':
						c = '\b';
						break;
					case 'f':
						c = '\f';
						break;
					case 'n':
						c = '\n';
						break;
					case 'r':
						c = '\r';
						break;
					case 't':
						c = '\t';
						break;
					case 'u':
						if (i >= length) {
							make('string', str).error("La cadena '" + str + "' no se ha terminado de definir.");
						}
						c = parseInt(source.substr(i + 1, 4), 16);
						if (!isFinite(c) || c < 0) {
							make('string', str).error("La cadena '" + str + "' no se ha terminado de definir.");
						}
						c = String.fromCharCode(c);
						i += 4;
						col += 4;
						break;
					}
				}
				str += c;
				i++;
				col++;
			}
			i++;
			col++;
			if (q === "'") {
				if (str.length != 1 && !escapement) make('char', str).error("Las comillas simples se usan para encerrar un único caracter, no una cadena.");
				result.push(make('char', str));
			} else 
			if (q === '"') result.push(make('string', str));
			c = source.charAt(i);

// comment.

		} else if (c === '/' && source.charAt(i + 1) === '/') {
			i += 2;
			col += 2;
			for (;;) {
				c = source.charAt(i);
				if (c === '\n' || c === '\r' || c === '') {
					if (c === '\n') {
						col = 1;
					}
					break;
				}
				i++;
				col++;
			}

// multiline comment

		} else if (c === '/' && source.charAt(i + 1) === '*') {
			startcol = col;
			str = c + source.charAt(i+1);
			i += 2;
			col += 2;
					for (;;) {
						c = source.charAt(i);
						str += c;
						if (c === '/' && source.charAt(i - 1) === '*') {
							i++;
							col++;
							c = source.charAt(i);
							str += c;
							break;
						}
						if (c === '\n') {
							line++;
							col = 1;
						}
						if (c === '') {
							break;
						}
						i++;
						col++;
					}
//					result.push(make('comment', str));
				} else if (c === '=') {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '=') {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
				} else if ((c === '+') ||  (c === '-')) {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '=' || c === str) {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
				} else if ((c === '*') || (c === '/') || (c === '%')) {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '=') {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
				} else if ((c === '<') || (c === '>')) {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '=') {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
				} else if (c === '&') {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '&') {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
				} else if (c === '|') {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '|') {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
				} else if (c === '!') {
					startcol = col;
					str = c;
					i++;
					c = source.charAt(i);
					if (c === '=') {
						str += c;
						i++;
						c = source.charAt(i);
						col++;
					}
					result.push(make('operator', str));
// single-character operator

		} else {
				startcol = col;
						i++;
						col++;
			result.push(make('operator', c));
			c = source.charAt(i);
		}
	}
	result.push(make('(end)'));
	return result;
}

