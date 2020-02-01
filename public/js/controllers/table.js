/**
* The table controller. It keeps trackof the data on the interface
* depending on the replies from the server.
*/

app.controller('TableController', function($scope, $rootScope, $http, $routeParams) {
	$scope.table = {};
	$scope.showing_chips_modal = false;
	$scope.action_state = '';
	$scope.table.dealer_seat = null;
	$rootScope.sitting_on_table = null;

	$http({
		url: '/table_data' + $routeParams.table_id,
		method: 'GET'
	}).success(function(data, status, headers, config) {
		$scope.table = data.table;
	});

	$scope.sit_in = function(seat) {
		socket.emit('sit_in', {'seat': seat, 'table_id': $routeParams.table_id, 'chips': $scope.buy_in_amount}, function (response) {
			if (response.success) {
				$scope.show_buy_in_modal = false;
				$rootScope.sitting_on_table = response.sitting_on_table;
				$scope.buy_in_error = null;
			} else {
				if (response.error) {
					$scope.buy_in_error = response.error;
					$scope.$digest();
				}
			}
		});
	}

	$scope.leave_table = function() {
		socket.emit('leave_table', function(response) {
			if (response.success) {
				$rootScope.sitting_on_table = null;
				$rootScope.total_chips = reponse.total_chips;
				$rootScope.sitting_in = false;
				$rootScope.action_state = '';
				$rootScope.$digest();
				$scope.$digest();
			}
		});
	}

	$scope.post_blind = function(posted) {
		socket.emit('post_blind', posted);
	}

	socket.on('table_data', function(data) {
		$scope.table = data;
		scope.$digest();
	});

	socket.on('player_sat_in', function(data) {
		$scope.table.seats[data.seat].name = data.player.name;
		$scope.table.seats[data.seat].chips = data.player.chips;
		$scope.$digest();
	});

	socket.on('player_left', function(data) {
		$scope.table.seats = data.seats;
		$scope.$digest();
	});

	socket.on('post_small_blind', function(data) {
		$scope.post_small_blind = true;
		$scope.$digest;
	});
});
