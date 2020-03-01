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
