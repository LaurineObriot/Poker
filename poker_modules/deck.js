ar Deck = require('./deck'),
	Pot = require('./pot');

/**
 * The table "class"
 * @param string	id (the table id)
 * @param string	name (the name of the table)
 * @param object 	deck (the deck object that the table will use)
 * @param function 	eventEmitter (function that emits the events to the players of the room)
 * @param int 		seatsCount (the total number of players that can play on the table)
 * @param int 		bigBlind (the current big blind)
 * @param int 		smallBlind (the current smallBlind)
 * @param int 		maxBuyIn (the maximum amount of chips that one can bring to the table)
 * @param int 		minBuyIn (the minimum amount of chips that one can bring to the table)
 * @param bool 		privateTable (flag that shows whether the table will be shown in the lobby)
 */
var Table = function( id, name, eventEmitter, seatsCount, bigBlind, smallBlind, maxBuyIn, minBuyIn, privateTable ) {
	// The table is not displayed in the lobby
	this.privateTable = privateTable;
	// The number of players who receive cards at the begining of each round
	this.playersSittingInCount = 0;
	// The number of players that currently hold cards in their hands
	this.playersInHandCount = 0;
	// Reference to the last player that will act in the current phase (originally the dealer, unless there are bets in the pot)
	this.lastPlayerToAct = null;
	// The game has begun
	this.gameIsOn = false;
	// The game has only two players
	this.headsUp = false;
	// References to all the player objects in the table, indexed by seat number
	this.seats = [];
	// The deck of the table
	this.deck = new Deck;
	// The function that emits the events of the table
	this.eventEmitter = eventEmitter;
	// The pot with its methods
	this.pot = new Pot;
	// All the public table data
	this.public = {
		// The table id
		id: id,
		// The table name
		name: name,
		// The number of the seats of the table
		seatsCount: seatsCount,
		// The number of players that are currently seated
		playersSeatedCount: 0,
		// The big blind amount
		bigBlind: bigBlind,
		// The small blind amount
		smallBlind: smallBlind,
		// The minimum allowed buy in
		minBuyIn: minBuyIn,
		// The maximum allowed buy in
		maxBuyIn: maxBuyIn,
		// The amount of chips that are in the pot
		pot: this.pot.pots,
		// The biggest bet of the table in the current phase
		biggestBet: 0,
		// The seat of the dealer
		dealerSeat: null,
		// The seat of the active player
		activeSeat: null,
		// The public data of the players, indexed by their seats
		seats: [],
		// The phase of the game ('smallBlind', 'bigBlind', 'preflop'... etc)
		phase: null,
		// The cards on the board
		board: ['', '', '', '', ''],
		// Log of an action, displayed in the chat
		log: {
			message: '',
			seat: '',
			action: ''
		},
	};
	// Initializing the empty seats
	for( var i=0 ; i<this.public.seatsCount ; i++ ) {
		this.seats[i] = null;
	}
};

// The function that emits the events of the table
Table.prototype.emitEvent = function( eventName, eventData ){
	this.eventEmitter( eventName, eventData );
	this.log({
		message: '',
		action: '',
		seat: '',
		notification: ''
	});
};

/**
 * Finds the next player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findNextPlayer = function( offset, status ) {
	offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
	status = typeof status !== 'undefined' ? status : 'inHand';

	if( status instanceof Array ) {
		var statusLength = status.length;
		if( offset !== this.public.seatsCount ) {
			for( var i=offset+1 ; i<this.public.seatsCount ; i++ ) {
				if( this.seats[i] !== null ) {
					var validStatus = true;
					for( var j=0 ; j<statusLength ; j++ ) {
						validStatus &= !!this.seats[i].public[status[j]];
					}
					if( validStatus ) {
						return i;
					}
				}
			}
		}
		for( var i=0 ; i<=offset ; i++ ) {
			if( this.seats[i] !== null ) {
				var validStatus = true;
				for( var j=0 ; j<statusLength ; j++ ) {
					validStatus &= !!this.seats[i].public[status[j]];
				}
				if( validStatus ) {
					return i;
				}
			}
		}
	} else {
		if( offset !== this.public.seatsCount ) {
			for( var i=offset+1 ; i<this.public.seatsCount ; i++ ) {
				if( this.seats[i] !== null && this.seats[i].public[status] ) {
					return i;
				}
			}
		}
		for( var i=0 ; i<=offset ; i++ ) {
			if( this.seats[i] !== null && this.seats[i].public[status] ) {
				return i;
			}
		}
	}

	return null;
};
