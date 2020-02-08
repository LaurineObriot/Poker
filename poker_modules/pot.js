/**
 * The pot object
 */
var Pot = function() {
  // The pot may be split to several amounts, since not all players
  // have the same money on the table
  // Each portion of the pot has an amount and an array of the
  // contributors (players who have betted in the pot and can
  // win it in the showdown)
  this.pots = [
    {
      amount: 0,
      contributors: []
    }
  ];
};

/**
 * Method that resets the pot to its initial state
 */
Pot.prototype.reset = function() {
  this.pots.length = 1;
  this.pots[0].amount = 0;
  this.pots[0].contributors = [];
};

/**
 * Method that gets the bets of the players and adds them to the pot
 * @param array players (the array of the tables as it exists in the table)
 */
Pot.prototype.addTableBets = function( players ) {
  // Getting the current pot (the one in which new bets should be added)
  var currentPot = this.pots.length-1;

  // The smallest bet of the round
  var smallestBet = 0;
  // Flag that shows if all the bets have the same amount
  var allBetsAreEqual = true;

  // Trying to find the smallest bet of the player
  // and if all the bets are equal
  for( var i in players ) {
    if( players[i] && players[i].public.bet ) {
      if( !smallestBet ) {
        smallestBet = players[i].public.bet;
      }
      else if( players[i].public.bet != smallestBet ) {
        allBetsAreEqual = false;

        if( players[i].public.bet < smallestBet ) {
          smallestBet = players[i].public.bet;
        }
      }
    }
  }
