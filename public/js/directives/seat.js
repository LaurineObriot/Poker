/**
 * The seat directive. It requires two attributes.
 * seatIndex: The index of the player in the "seats" array
 * cellNumber: The number of the cell in the grid (used for styles)
 */
app.directive( 'seat', [function() {
	return {
		restrict: 'E',
		templateUrl: '/partials/seat.html',
		replace: true,
		scope: {
			player: '=',
			mySeat: '=',
			myCards: '=',
			activeSeat: '=',
			selectedSeat: '=',
			sittingOnTable: '=',
			dealerSeat: '=',
			notifications: '=',
			showBuyInModal: '&'
		},
