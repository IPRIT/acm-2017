/*
 * Acm system
 * https://github.com/IPRIT/acm-2017
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 04.08.2017
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.contest-item.table', [])

  .controller('ContestTable', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, ErrorService) {
      var contestId = $state.params.contestId;
      $scope.params = {
        contestId: contestId,
        count: 10,
        offset: 0,
        showInTimeMs: Infinity
      };

      function updateTable(withoutLoading) {
        if (!withoutLoading) {
          $rootScope.$broadcast('data loading');
        }
        return UserManager.getCurrentUser().then(function (user) {
          $scope.user = user;
          return ContestItemManager.getTable2($scope.params);
        }).then(function (table) {
          $scope.table = table;
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          if (!withoutLoading) {
            $rootScope.$broadcast('data loaded');
          }
        });
      }

      updateTable();
      $scope.updateTable = updateTable;

      $scope.$on('table update', function () {
        updateTable(true);
      });
    }
  ])

  .controller('ContestTableHeaderRow', ['$scope', '$rootScope', '$state', 'ErrorService',
    function ($scope, $rootScope, $state, ErrorService) {
      var contestId = $state.params.contestId;
    }
  ])

  .controller('ContestTableRow', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, ErrorService) {
      var contestId = $state.params.contestId;
    }
  ])

  .controller('ContestTableCell', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, ErrorService) {
      var contestId = $state.params.contestId;
    }
  ])
;