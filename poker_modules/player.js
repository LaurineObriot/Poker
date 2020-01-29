/**
* The player "class"
* @param string id (player's id, never change)
* @param object socket (the current socket of the player)
* @param string name (the user's screen name)
* @param int chips (the total amount of chip the user has)
*/

var Player = function(id, socket, name, chips) {
	// The user id
	this.id = id;
	// The socket object of the user
	this.socket = socket;
	// The name of the user
	this.name = name;
	// The chips that are available in the user's account
	this.chips = chips;
	// The chips that the player plays on the table
	this.chips_in_play = 0;
	// Flag that shows whether the player is sitting on a table or not
	this.sitting_on_table = false;
	// Flag that shows whether a player who is sitting on the table, wants to be dealt cards
	this.sits_in = false;
	// Flag that shows whether a player who is sitting in, has not folded their hand
	this.is_in_hand = false;
	// The number of the seat of the table that the player is sitting
	this.seat = null;
	// Reference tot he player who is sitting after the current Player
	this.next_player = {};
	// reference to the player who is sitting before the current player
	this.previous_player = {};
}

module.exports = Player;
