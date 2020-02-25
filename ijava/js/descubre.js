function registerEvent( programID, what ) {
	$.post( "services/events.php", { service: "register", program: programID, what: what },
	function( res ) {				
		// TODO:  Anular porque, en ningún caso informa al usuario		
	}
);
}