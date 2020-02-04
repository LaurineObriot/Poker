var Deck = require('./deck'),
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

/**
 * Finds the previous player of a certain status on the table
 * @param  number offset (the seat where search begins)
 * @param  string|array status (the status of the player who should be found)
 * @return number|null
 */
Table.prototype.findPreviousPlayer = function( offset, status ) {
	offset = typeof offset !== 'undefined' ? offset : this.public.activeSeat;
	status = typeof status !== 'undefined' ? status : 'inHand';

	if( status instanceof Array ) {
		var statusLength = status.length;
		if( offset !== 0 ) {
			for( var i=offset-1 ; i>=0 ; i-- ) {
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
		for( var i=this.public.seatsCount-1 ; i>=offset ; i-- ) {
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
		if( offset !== 0 ) {
			for( var i=offset-1 ; i>=0 ; i-- ) {
				if( this.seats[i] !== null && this.seats[i].public[status] ) {
					return i;
				}
			}
		}
		for( var i=this.public.seatsCount-1 ; i>=offset ; i-- ) {
			if( this.seats[i] !== null && this.seats[i].public[status] ) {
				return i;
			}
		}
	}

	return null;
};

/**
 * Method that starts a new game
 */
Table.prototype.initializeRound = function( changeDealer ) {
	changeDealer = typeof changeDealer == 'undefined' ? true : changeDealer ;

	if( this.playersSittingInCount > 1 ) {
		// The game is on now
		this.gameIsOn = true;
		this.public.board = ['', '', '', '', ''];
		this.deck.shuffle();
		this.headsUp = this.playersSittingInCount === 2;
		this.playersInHandCount = 0;

		for( var i=0 ; i<this.public.seatsCount ; i++ ) {
			// If a player is sitting on the current seat
			if( this.seats[i] !== null && this.seats[i].public.sittingIn ) {
				if( !this.seats[i].public.chipsInPlay ) {
					this.seats[seat].sitOut();
					this.playersSittingInCount--;
				} else {
					this.playersInHandCount++;
					this.seats[i].prepareForNewRound();
				}
			}
		}

		// Giving the dealer button to a random player
		if( this.public.dealerSeat === null ) {
			var randomDealerSeat = Math.ceil( Math.random() * this.playersSittingInCount );
			var playerCounter = 0;
			var i = -1;

			// Assinging the dealer button to the random player
			while( playerCounter !== randomDealerSeat && i < this.public.seatsCount ) {
				i++;
				if( this.seats[i] !== null && this.seats[i].public.sittingIn ) {
					playerCounter++;
				}
			}
			this.public.dealerSeat = i;
		} else if( changeDealer || this.seats[this.public.dealerSeat].public.sittingIn === false ) {
			// If the dealer should be changed because the game will start with a new player
			// or if the old dealer is sitting out, give the dealer button to the next player
			this.public.dealerSeat = this.findNextPlayer( this.public.dealerSeat );
		}

		this.initializeSmallBlind();
	}
};

/**
 * Method that starts the "small blind" round
 */
Table.prototype.initializeSmallBlind = function() {
	// Set the table phase to 'smallBlind'
	this.public.phase = 'smallBlind';

	// If it's a heads up match, the dealer posts the small blind
	if( this.headsUp ) {
		this.public.activeSeat = this.public.dealerSeat;
	} else {
		this.public.activeSeat = this.findNextPlayer( this.public.dealerSeat );
	}
	this.lastPlayerToAct = 10;

	// Start asking players to post the small blind
	this.seats[this.public.activeSeat].socket.emit('postSmallBlind');
	this.emitEvent( 'table-data', this.public );
};

/**
* Method that starts the big blind round
*/
Table.prototype.initializeBigBlind = function() {
	// Set the table phase to 'bigBlind'
	this.public.phase = 'bigBlind';
	this.actionToNextPlayer();
};

/**
* Method that starts the "preflop" round
*/
Table.prototype.InitializePreflop = function() {
	// Set the table phase to 'preflop'
	this.public.phase = 'preflop';
	var currentPlayer = this.public.activeSeat;
	// The player that placed the big blind is the last player to act for the round
	this.lastPlayerToAct = this.public.activeSeat;

	for (var i = ; i < this.playersInHandCount; i++) {
		this.seats[currentPlayer].cards = this.decks.deal(2);
		this.seats[currentPlayer].public.hasCards = true;
		this.seats[currentPlayer].socket.emit('dealingCards',  this.seats[currentPlayer].cards);
		currentPlayer = this.findNextPlayer(currentPlayer);
	}
	this.actionToNextPlayer();
};

/**
* Method that starts the next phase of the round
*/
