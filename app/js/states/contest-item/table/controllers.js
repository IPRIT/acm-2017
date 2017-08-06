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

  .controller('ContestTable', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'Storage', '$mdDialog', 'AdminManager', '$q', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, Storage, $mdDialog, AdminManager, $q, ErrorService) {
      var contestId = $state.params.contestId;
      $scope.params = {
        contestId: contestId,
        count: 5,
        offset: 0,
        showInTimeMs: Infinity
      };

      $scope.rowsSelected = [];
      $scope.isSelectionState = false;

      function updateTable(withoutLoading, overlay) {
        if (!withoutLoading) {
          $rootScope.$broadcast('data loading');
        }
        if (overlay) {
          $scope.isRowsLoading = true;
        }
        return Storage.get('table-settings').then(function (settings) {
          angular.extend($scope.params, settings);
          return UserManager.getCurrentUser();
        }).then(function (user) {
          $scope.user = user;
          return ContestItemManager.getTable2($scope.params);
        }).then(function (table) {
          $scope.table = table;
          return table;
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

      $scope.$watch('params.count', function (newVal, oldVal) {
        if (oldVal === newVal) {
          return;
        }
        saveSettings().then(function () {
          updateTable(true, true);
        });
      });

      $scope.$watch('params.offset', function (newVal, oldVal) {
        if (oldVal === newVal) {
          return;
        }
        updateTable(true, true);
      });

      function saveSettings() {
        return Storage.set({
          'table-settings': {
            count: $scope.params.count
          }
        });
      }

      $scope.toggleSelectionState = function (value) {
        $scope.rowsSelected = [];
        $scope.isSelectionState = typeof value !== 'undefined'
          ? value : !this.isSelectionState;
      };

      $scope.setSelectionStateFor = function (stateFor) {
        $scope.selectionStateFor = stateFor;
        $scope.toggleSelectionState();
      };

      $scope.toggleAll = function () {
        if ($scope.rowsSelected.length > 0) {
          $scope.rowsSelected = [];
        } else {
          $scope.rowsSelected = $scope.table.rows.slice(0);
        }
        safeApply($scope);
      };

      $scope.isActionExecuting = false;

      $scope.refreshSolutionsForRows = function (ev, rows) {
        return showConfirmationDialogBeforeAction(ev).then(function () {
          $scope.isActionExecuting = true;
          var promises = rows.map(function (row) {
            return AdminManager.refreshSolutionForUser({ contestId: contestId, userId: row.user.id })
          });
          return $q.all(promises).then(function () {
            $scope.toggleSelectionState();
          }).catch(function (err) {
            ErrorService.show(err);
          }).finally(function () {
            $scope.isActionExecuting = false;
          });
        });
      };

      $scope.deleteRowsFromContest = function (ev, rows) {
        return showConfirmationDialogBeforeAction(ev).then(function () {
          $scope.isActionExecuting = true;
          var promises = rows.map(function (row) {
            return AdminManager.deleteUserFromContest({ contestId: contestId, userId: row.user.id })
          });
          return $q.all(promises).then(function () {
            $scope.toggleSelectionState();
            return updateTable(false, true);
          }).catch(function (err) {
            ErrorService.show(err);
          }).finally(function () {
            $scope.isActionExecuting = false;
          });
        });
      };

      function showConfirmationDialogBeforeAction(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите это сделать?')
          .ariaLabel('Подтверждение')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent(ev);
        return $mdDialog.show(confirm);
      }
    }
  ])

  .controller('ContestTableHeaderRow', ['$scope', '$rootScope', '$state', 'ErrorService',
    function ($scope, $rootScope, $state, ErrorService) {
    }
  ])

  .controller('ContestTableRow', ['$scope', '$rootScope', '$state', 'ContestItemManager', 'UserManager', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, UserManager, ErrorService) {

      $scope.exists = function (row, rowsSelected) {
        return (rowsSelected || []).filter(function (rowSelected) {
          return rowSelected.user.id === row.user.id;
        }).length > 0;
      };

      $scope.toggle = function (row, rowsSelected) {
        var idx = -1;
        for (var i = 0; i < rowsSelected.length; ++i) {
          if (rowsSelected[i].user.id === row.user.id) {
            idx = i;
          }
        }
        if (idx > -1) {
          rowsSelected.splice(idx, 1);
        } else {
          rowsSelected.push(row);
        }
        console.log(rowsSelected);
      };
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

      $scope.count = $scope.params.count;

      $scope.$watch('count', function (newVal, oldVal) {
        if (!oldVal) {
          return;
        }
        $scope.params.count = Number($scope.count);
        safeApply($scope);
      });

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