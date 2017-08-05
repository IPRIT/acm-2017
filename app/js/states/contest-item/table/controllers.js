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

  .controller('ContestTable', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'Storage', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, Storage, ErrorService) {
      var contestId = $state.params.contestId;
      $scope.params = {
        contestId: contestId,
        count: 5,
        offset: 0,
        showInTimeMs: Infinity
      };

      function updateTable(withoutLoading, overlay) {
        if (!withoutLoading) {
          $rootScope.$broadcast('data loading');
        }
        if (overlay) {
          $scope.isRowsLoading = true;
        }
        return Storage.get('table-settings').then(function (settings) {
          angular.extend($scope.params, settings);
          console.log($scope.params);
          return UserManager.getCurrentUser();
        }).then(function (user) {
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
          if (overlay) {
            $scope.isRowsLoading = false;
          }
        });
      }

      updateTable(false, true);
      $scope.updateTable = updateTable;

      $scope.$on('table update', function () {
        updateTable(true);
      });

      $scope.$watch('params.count', function (newVal) {
        if (typeof newVal !== 'number') {
          $scope.params.count = Number(newVal);
        } else {
          saveSettings().then(function () {
            updateTable(true, true);
          });
        }
      });

      $scope.$watch('params.offset', function (newVal) {
        if (typeof newVal !== 'number') {
          $scope.params.offset = Number(newVal);
        } else {
          updateTable(true, true);
        }
      });

      function saveSettings() {
        return Storage.set({
          'table-settings': {
            count: $scope.params.count
          }
        });
      }
    }
  ])

  .controller('ContestTableHeaderRow', ['$scope', '$rootScope', '$state', 'ErrorService',
    function ($scope, $rootScope, $state, ErrorService) {
    }
  ])

  .controller('ContestTableRow', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, ErrorService) {
    }
  ])

  .controller('ContestTableCell', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', '$mdDialog', '$timeout', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, $mdDialog, $timeout, ErrorService) {
      var contestId = $state.params.contestId;

      $scope.openStatusDialog = function (ev, cell, user) {
        if (!cell || !cell.problemSymbol || cell.result === '—'
          || !user || !user.id || (user.id !== $scope.viewAs.id && !$scope.viewAs.isAdmin)) {
          return;
        }
        var userId = user.id,
          problemIndex = cell.problemSymbol;
        cell._loading = true;

        ContestItemManager.getSentsForCell({
          contestId: contestId,
          userId: userId,
          symbolIndex: problemIndex
        }).then(function (response) {
          $mdDialog.show({
            controller: 'ContestItemCellStatusController',
            templateUrl: templateUrl('contest-item/contest-monitor', 'contest-monitor-cell-status-dialog'),
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            locals: {
              solutions: response.solutions || [],
              $originalDialogArgs: [ ev, cell, user ],
              $originalDialogScope: $scope
            }
          });
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $timeout(function () {
            cell._loading = false;
          }, 500)
        });
      };
    }
  ])

  .controller('ContestTableFooter', ['$scope', '$rootScope', '$state', 'ErrorService',
    function ($scope, $rootScope, $state, ErrorService) {
      $scope.Math = window.Math;

      $scope.prevPage = function (ev) {
        $scope.params.offset = Math.max($scope.params.offset - $scope.params.count, 0);
      };

      $scope.nextPage = function (ev) {
        $scope.params.offset = Math.min($scope.params.offset + $scope.params.count, $scope.table.rowsNumber - 1);
      };

      $scope.rowNumbers = [
        5, 10, 20, 50
      ];
    }
  ])
;