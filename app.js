var express = require('express');
var app = express();
var server = require('http').crateServer(app);
var io = require('socket.io').listen(server);
var http = require('path');
var url = require('url');
var crypto = require('crypto');
var connect = require('connect');
var Table = require('./table');
var Player = require('./player');
var Deck = require('./deck');

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('0nl!n3p0k3r@pp444'));
app.use(express.session({'0nl!n3p0k3r@pp444'}));
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// Development Only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

var players = [];
var tables = [];
var decks = [];

tables[0] = new Table( 0, 'Sample 10-handed Table', 10, 2, 1, 200, 40, false);
tables[1] = new Table( 1, 'Sample 6-handed Table', 6, 4, 2, 400, 80, false);
tables[2] = new Table( 2, 'Sample 2-handed Table', 2, 8, 4, 800, 160, false);
tables[3] = new Table( 3, 'Sample 6-handed Private Table', 6, 20, 10, 2000, 400, true);

for (var i = 0; 1 < 4; i++ ) {
	decks[i] = new Deck();
}

server.listen(3000);
console.log('Listener on port 3000');

// The lobby
app.get('/', function( req, res ) {
	res.render('index');
});

// The lobby markup
app.get('/looby.html', function( req, res ) {
	res.render( 'lobby', { 'tables': tables} );
});

// The lobby data (the array of tables and their data)
app.get('/lobby_data', function (req, res) {
	var lobby_tables = [];
	for (var table_id in tables) {
		if ( !tables[table_id].private_table) {
			lobby_tables[table_id] = {};
			lobby_tables[table_id].id = tables[table_id].public.id;
			lobby_tables[table_id].name = tables[table_id].public.name;
			lobby_tables[table_id].no_of_seats = tables[table_id].public.no_of_seats;
			lobby_tables[table_id].players_sitting = tables[table_id].public.no_of_players_seated;
			lobby_tables[table_id].big_blind = tables[table_id].public.big_blind;
			lobby_tables[table_id].small_bling = tables[table_id].public.small_blind;
		}
	}
	res.send(lobby_tables);
});

// The 10-seat table markup
app.get('/table_10_handed.html', function(req, res) {
	res.render('table_10_handed');
});

// The 6-seat markup
app.get('/table_6_handed.html', function(req, res) {
	res.render('table_6_handed');
});

// The 2-seat table markup
app.get('/table_2_handed.html', function(req, res) {
	res.render('table_2_handed');
});

// The table data
app.get('/table_data/:table_id', function(req, res) {
	if (typeof req.params.table_id !== 'undefined' && typeof tables[req.params.table_id] !== 'undefined') {
		tables[req.params.table_id].update_public_player_data();
		res.send( {'table': tables[req.params.table_id].public } );
	}
});

io.sockets.on('connection', function( socket ) {
	// When a player disconnects.
	socket.on('disconnect', function() {
		// If the player was sitting on a table
		if (typeof players[socket.id] !== 'undefined' && players[socket.id].sitting_on_table && tables[players[socket.id].sitting_on_table]) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var table_id = players[socket.id].sitting_on_table;
			// Remove the player from the seat
			tables[table_id].seats[seat] = {};
			tables[table_id].public.no_of_players_seated--;
			// Remove the chips from play
			players[socket.id].chips += players[socket.id].chips_in_play;
			players[socket.id].chips_in_play = 0;
			// Send the new table data
			tables[table_id].update_public_player_data();
			socket.broadcast.to('table-' + table_id).emit('player_left', tables[table_id].public);
			// Remove the player from the socket room
			socket.leave('table-' + table_id);
			players[socket.id].sitting_on_table = false;
			// Removing the player from the doubly linked list
			if (players[socket.id].next_player) {
				players[socket.id].next_player.previous_player = players[socket.id].previous_player;
				players[socket.id].previous_player.next_player = players[socket.id].next_player;
			}
			// Dettach the player object from the players array so that it can be destroyed by the garbage collector
			delete players[socket.id];
		}
	});

	socket.on('leave_table', function(callback){
		// If the player was sitting on a table
		if (players[socket.id].sitting_on_table && tables[players[socket.id].sitting_on_table]) {
			// The seat on which the player was sitting
			var seat = players[socket.id].seat;
			// The table on which the player was sitting
			var table_id = players[socket.id].sitting_on_table;
			// Remove the player from the seat
			tables[table_id].seats[seat] = {};
			tables[table_id].public.no_of_players_seated--;
			// Remove the chips from play
			players[socket.id].chips += players[socket.id].chips_in_play;
			players[socket.id].chips_in_play = 0;
			players[socket.id].seat = null;
			// Emit the new table data
			var table_data = tables[table_id].public;
			tables[table_id].update_public_player_data();
			io.sockets.in( 'table-' + table_id).emit('players_left' table_data);
			// Remove the player from the socket room
			socket.leave('table' + table_id);
			players[socket.id].sitting_on_table = false;
			// Removing the player from the doubly linked list
			if (players[socket.id].next_player) {
				players[socket.id].next_player.previous_player = players[socket.id].previous_player;
				players[socket.id].previous_player.next_player = players[socket.id].next_player;
			}
			callback( { 'success': true, 'total_chips': players[socket.id].chips});
		}
	});

	socket.on('register', function(data, callback) {
		// If the new screen name is posted
		if (typeof data.new_screen_name !== 'undefined') {
			var new_screen_name = data.new_screen_name.trim();
			// If the new screen name is not an empty string
			if (new_screen_name && typeof players[socket.id] === 'undefined') {
				// Create the player objet
				var player_id = socket.id + Math.ceil(Math.random() * 999999);
				// Creating the player object
				players[socket.id] = new Player(player_id, socket, new_screen_name, 1000);
				callback( { success: true, screen_name; new_screen_name, total_chips: players[socket.id].chips } );
			} else {
				callback( {success: false} );
			}
		} else {
			callback( {success: false} );
		}
	});

	// When a player requests to it in
	socket.on('sit_in', function(data, callback) {
		if (
			// A seat has been specified
			typeof data.seat !== 'undefined'
			// A table id is specified
			&& typeof data.table_id !== 'undefined'
			// The table exists
			&& typeof tables[data.table_id] !== 'undefined'
			// The seat number is an int and less than the total nimber of seats
			&& typeof data.seat === 'number'
			&& data.seat >= 0
			&& data.seat < tables[data.table_id].public.no_of_seats
			// The seat in empty
			&& typeof tables[data.table_id].seats[data.seat].name === 'undefined'
			// The player isn't sitting on any other tables
			&& players[socket.id].sitting_on_table === false
			// The chips chosen is a number
			&& typeof data.chips !== 'undefined'
			&& !isNaN(parseFloat(data.chips))
			&& isFinite(data.chips)
		){
			// The chips the player chose are less than the total chips the player has
			if (data.chips > players[socket.id].chips)
				callback( { 'success': false, 'error': "You don't have that many chips!" } );
			else if (data.chips > tables[data.table_id].public.max_buy_in || data.chips < tables[data.table_id].public.min_buy_in)
				callback( { 'success': false, 'error': "The amount of chips shouold be between the maximum and the minimum amout of allowed buy in" } );
			else {
				// The data that will be sent to the view
				var player_data = {name: players[socket.id].name, chips: data.chips};
				// Remove the chips that player will have on the table, from the player object
				players[socket.id].chips -= data.chips;
				players[socket.id].chips_in_play = data.chips;
				// Add them to the table
				tables[data.table_id].seats[data.seat] = players[socket.id];
				tables[data.table_id].public.no_of_players_seated++;
				players[socket.id].seat = data.seat;
				players[socket.id]. sitting_on_table = data.table_id;
				// Give the response to the user
				callback( {'success': true, 'sitting_on_table': data.table_id} );
				// Add the player to the socket room
				socket.join('table-' + data.table_id);
				// Notify the table that the user has sat in
				io.socket.in('table-' + data.table_id).emit('player_sat_in', {seat: data.seat, player: player_data});
				// If there are no players playing right now, try to initialize a game with the new player
				if(!tables[data.table_id].game_is_on && table[data.table_id].public.no_of_players_seated > 1) {
					// initialize the game
					tables[data.table_id].initialize_game();
					tables[data.table_id].init_small_blind();
					// Send the new table data to the player
					tables[data.table_id].upgrade_public_player_data();
					io.sockets.in('table-' + data.table_id).emit('tabvle_data', tables[data.table_id].public);
					// start asking players to post the small blind
					tables[data.table_id].player_to_act.socket.emit('post_small_blind', {'small_blind' : 10});
				}
			}
		} else {
			// If the user is not allowed to sit in, notify the user
			callback( {'success': false} );
		}

		socket.on( 'post_blind', function(posted_blind) {
			if (players[socket.id].sitting_on_table !== 'undefined') {
				var table_id = players[socket.id].sitting_on_table;
				if (tables[table_id] && tables[table_id].player_to_act.socket.id === socket.id) {
					if (posted_blind) {

					} else {

					}
				}
			}
		});
	});
});
