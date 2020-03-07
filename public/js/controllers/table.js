/**
 * The table controller. It keeps track of the data on the interface,
 * depending on the replies from the server.
 */
app.controller( 'TableController', ['$scope', '$rootScope', '$http', '$routeParams', '$timeout', 'sounds',
function( $scope, $rootScope, $http, $routeParams, $timeout, sounds ) {
	var seat = null;
	$scope.table = {};
	$scope.notifications = [{},{},{},{},{},{},{},{},{},{}];
	$scope.showingChipsModal = false;
	$scope.actionState = '';
	$scope.table.dealerSeat = null;
	$scope.myCards = ['', ''];
	$scope.mySeat = null;
	$scope.betAmount = 0;
	$rootScope.sittingOnTable = null;
	var showingNotification = false;

	// Existing listeners should be removed
	socket.removeAllListeners();

	// Getting the table data
	$http({
		url: '/table-data/' + $routeParams.tableId,
		method: 'GET'
	}).success(function( data, status, headers, config ) {
		$scope.table = data.table;
		$scope.buyInAmount = data.table.maxBuyIn;
		$scope.betAmount = data.table.bigBlind;
	});

	// Joining the socket room
	socket.emit( 'enterRoom', $routeParams.tableId );

	$scope.minBetAmount = function() {
		if( $scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] === null ) return 0;
		// If the pot was raised
		if( $scope.actionState === "actBettedPot" ) {
			var proposedBet = +$scope.table.biggestBet + $scope.table.bigBlind;
			return $scope.table.seats[$scope.mySeat].chipsInPlay < proposedBet ? $scope.table.seats[$scope.mySeat].chipsInPlay : proposedBet;
		} else {
			return $scope.table.seats[$scope.mySeat].chipsInPlay < $scope.table.bigBlind ? $scope.table.seats[$scope.mySeat].chipsInPlay : $scope.table.bigBlind;
		}
	}

	$scope.maxBetAmount = function() {
		if( $scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] === null ) return 0;
		return $scope.actionState === "actBettedPot" ? $scope.table.seats[$scope.mySeat].chipsInPlay + $scope.table.seats[$scope.mySeat].bet : $scope.table.seats[$scope.mySeat].chipsInPlay;
	}

	$scope.callAmount = function() {
		if( $scope.mySeat === null || typeof $scope.table.seats[$scope.mySeat] === 'undefined' || $scope.table.seats[$scope.mySeat] == null ) return 0;
		var callAmount = +$scope.table.biggestBet - $scope.table.seats[$scope.mySeat].bet;
		return callAmount > $scope.table.seats[$scope.mySeat].chipsInPlay ? $scope.table.seats[$scope.mySeat].chipsInPlay : callAmount;
	}

	$scope.showLeaveTableButton = function() {
		return $rootScope.sittingOnTable !== null && ( !$rootScope.sittingIn || $scope.actionState === "waiting" );
	}

	$scope.showPostSmallBlindButton = function() {
		return $scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot";
	}

	$scope.showPostBigBlindButton = function() {
		return $scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot";
	}

	$scope.showFoldButton = function() {
		return $scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot" || $scope.actionState === "actOthersAllIn";
	}

	$scope.showCheckButton = function() {
		return $scope.actionState === "actNotBettedPot" || ( $scope.actionState === "actBettedPot" && $scope.table.biggestBet == $scope.table.seats[$scope.mySeat].bet );
	}

	$scope.showCallButton = function() {
		return $scope.actionState === "actOthersAllIn" || $scope.actionState === "actBettedPot"  && !( $scope.actionState === "actBettedPot" && $scope.table.biggestBet == $scope.table.seats[$scope.mySeat].bet );
	}

	$scope.showBetButton = function() {
		return $scope.actionState === "actNotBettedPot" && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
	}

	$scope.showRaiseButton = function() {
		return $scope.actionState === "actBettedPot" && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
	}

	$scope.showBetRange = function() {
		return ($scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot") && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
	}

	$scope.showBetInput = function() {
		return ($scope.actionState === "actNotBettedPot" || $scope.actionState === "actBettedPot")  && $scope.table.seats[$scope.mySeat].chipsInPlay && $scope.table.biggestBet < $scope.table.seats[$scope.mySeat].chipsInPlay;
	}

	$scope.showBuyInModal = function( seat ) {
		$scope.buyInModalVisible = true;
		selectedSeat = seat;
	}

	$scope.potText = function() {
		if( typeof $scope.table.pot !== 'undefined' && $scope.table.pot[0].amount ) {
			var potText = 'Pot: ' + $scope.table.pot[0].amount;

			var potCount = $scope.table.pot.length;
			if( potCount > 1 ) {
				for( var i=1 ; i<potCount ; i++ ) {
					potText += ' - Sidepot: ' + $scope.table.pot[i].amount;
				}
			}
			return potText;
		}
	}

	$scope.getCardClass = function( seat, card ) {
		if( $scope.mySeat === seat ) {
			return $scope.myCards[card];
		}
		else if ( typeof $scope.table.seats !== 'undefined' && typeof $scope.table.seats[seat] !== 'undefined' && $scope.table.seats[seat] && typeof $scope.table.seats[seat].cards !== 'undefined' && typeof $scope.table.seats[seat].cards[card] !== 'undefined' ) {
			return 'card-' + $scope.table.seats[seat].cards[card];
		}
		else {
			return 'card-back';
		}
	}

	$scope.seatOccupied = function( seat ) {
		return !$rootScope.sittingOnTable || ( $scope.table.seats !== 'undefined' && typeof $scope.table.seats[seat] !== 'undefined' && $scope.table.seats[seat] && $scope.table.seats[seat].name );
	}

	// Leaving the socket room
	$scope.leaveRoom = function() {
		socket.emit( 'leaveRoom' );
	};

}
