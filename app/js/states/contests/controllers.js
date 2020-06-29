/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 09.11.2015
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.contests', [])

  .controller('ContestsListCtrl', ['$scope', '$rootScope', '$state', 'ContestsManager', 'UserManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, ContestsManager, UserManager, _, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Контесты | ' + _('app_name')
      });
      var defaultCount = 20;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount,
        category: 'all',
        sort: 'byStart',
        sort_order: 'desc',
        query: ''
      };

      $scope.isLoading = true;
      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.contestsList = [];
      $scope.allPages = 0;

      $scope.curSortItem = null;
      $scope.sortCategories = [{
        name: 'По дате создания',
        sort: 'byId'
      }, {
        name: 'По времени начала',
        sort: 'byStart'
      }];

      $scope.curSortOrder = null;
      $scope.sortOrders = [{
        name: 'По убыванию',
        order: 'desc'
      }, {
        name: 'По возрастанию',
        order: 'asc'
      }];

      $scope.curCategory = null;
      $scope.contestCategories = [{
        name: 'Все',
        category: 'all'
      }, {
        name: 'Только активные',
        category: 'showOnlyStarted'
      }, {
        name: 'Только активные с заморозкой',
        category: 'showOnlyFrozen'
      }, {
        name: 'Только завершенные',
        category: 'showOnlyFinished'
      }, {
        name: 'Только дорешивание',
        category: 'showOnlyPractice'
      }, {
        name: 'Только доступные',
        category: 'showOnlyEnabled'
      }, {
        name: 'Только недоступные',
        category: 'showOnlyDisabled'
      }, {
        name: 'Только удалённые',
        category: 'showOnlyRemoved'
      }];

      $scope.curSearchQuery = '';

      function generatePaginationArray(offsetCount) {
        var pages = [],
          curPage = $scope.pageNumber,
          allItems = $scope.all_items_count,
          backOffsetPages = offsetCount,
          upOffsetPages = offsetCount,
          allPages = Math.floor(allItems / defaultCount) +
            (allItems && allItems % defaultCount ? 1 : 0);
        if (!defaultCount) {
          allPages = 1e6;
        }
        $scope.allPages = allPages;
        for (var cur = Math.max(curPage - backOffsetPages, 1);
             cur <= Math.min(curPage + upOffsetPages, allPages); ++cur) {
          pages.push({
            number: cur,
            active: cur === curPage
          });
        }
        return pages;
      }

      var firstInvokeStateChanged = true;
      $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        if (firstInvokeStateChanged) {
          return firstInvokeStateChanged = false;
        }
        $scope.pageNumber = toParams.pageNumber ?
          parseInt(toParams.pageNumber) : 1;
        $scope.params.offset = ($scope.pageNumber - 1) * defaultCount;
        updateContestsList();
      });

      function updateContestsList() {
        $scope.isLoading = true;

        $rootScope.$broadcast('data loading');
        return ContestsManager.getContests($scope.params).then(function (result) {
          $rootScope.$broadcast('data loaded');
          if (!result || !result.hasOwnProperty('contestsNumber')) {
            return;
          }
          $scope.all_items_count = result.contestsNumber;
          $scope.contestsList = result.contests;
          $scope.pagination = generatePaginationArray(5);
        }).catch(function (result) {
          $rootScope.$broadcast('data loaded');
          $state.go('auth.form');
          ErrorService.show(result);
        }).finally(() => {
          $scope.isLoading = false;
        });
      }

      // updateContestsList();

      $scope.$watch('curCategory', function (newVal, oldVal) {
        if (!newVal) {
          return;
        }
        $scope.params.category = newVal;
        $scope.pageNumber !== 1 ?
          $state.go('contests.list') : updateContestsList();
        console.log('updating contests list...');
      });

      $scope.$watch('curSortItem', function (newVal, oldVal) {
        if (!newVal) {
          return;
        }
        $scope.params.sort = newVal;
        updateContestsList();
        console.log('updating contests list...');
      });

      $scope.$watch('curSortOrder', function (newVal, oldVal) {
        if (!newVal) {
          return;
        }
        $scope.params.sort_order = newVal;
        updateContestsList();
        console.log('updating contests list...');
      });

      const debounce = (cb, delay = 200) => {
        let timeout = null;
        return function(data) {
          if (timeout) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(_ => cb( data ), delay);
        };
      };

      $scope.$watch('curSearchQuery', debounce((newVal, oldVal) => {
        $scope.params.query = newVal;
        $scope.params.offset = 0;
        updateContestsList();
        console.log('updating contests list...');
      }));

      $scope.$on('contests list update needed', function() {
        $scope.pageNumber = 1;
        $scope.params = {
          count: defaultCount,
          offset: ($scope.pageNumber - 1) * defaultCount,
          category: 'all',
          sort: 'byStart',
          sort_order: 'desc'
        };
        $scope.curSortItem = null;
        $scope.curSortOrder = null;
        $scope.curCategory = null;
        updateContestsList();
      });
    }
  ])

  .controller('ContestListItem', [
    '$scope', 'ContestsManager', 'UserManager', '$mdDialog', '$state', 'ErrorService',
    function ($scope, ContestsManager, UserManager, $mdDialog, $state, ErrorService) {
      $scope.user = {};
      UserManager.getCurrentUser().then(function (user) {
        $scope.user = user;
        safeApply($scope);
      }).catch(function (result) {
        ErrorService.show(result);
      });

      $scope.loadingData = false;
      $scope.updateContest = function () {
        if (!$scope.contest || !$scope.contest.id) {
          return;
        }
        $scope.loadingData = true;
        var contestId = $scope.contest.id;
        ContestsManager.getContest({ contestId: contestId }).then(function (result) {
          $scope.loadingData = false;
          safeReplaceObject($scope.contest, result.contest);
        }).catch(function (result) {
          $scope.loadingData = false;
          ErrorService.show(result);
        });
      };

      $scope.joinContest = function (contest) {
        $scope.loadingData = true;
        ContestsManager.canJoin({ contestId: contest.id }).then(function (result) {
          handleResponse(result);
        }).catch(function (result) {
          $scope.loadingData = false;
          ErrorService.show(result);
        });

        function handleResponse(result) {
          if (!result.can) {
            $scope.loadingData = false;
            if (result.reason === 'NOT_IN_TIME') {
              ErrorService.showMessage('Контест еще не начат или уже завершен.');
            } else {
              ErrorService.showMessage('Доступ запрещен. Вы не состоите в нужной группе, контест недоступен или удален.');
            }
          } else {
            if (result.confirm) {
              var confirm = $mdDialog.confirm()
                .title('Предупреждение')
                .content('Вы действительно хотите войти в контест? Вы будете добавлены в таблицу результатов.')
                .clickOutsideToClose(true)
                .ariaLabel('Confirm dialog')
                .ok('Да')
                .cancel('Отмена');
              $mdDialog.show(confirm).then(function() {
                $scope.loadingData = false;
                join();
              }).catch(function () {
                $scope.loadingData = false;
              });
            } else if (!result.joined) {
              $scope.loadingData = false;
              join();
            } else {
              $scope.loadingData = false;
              $state.go('contest.item', {
                contestId: contest.id
              });
            }
          }
        }

        function join() {
          ContestsManager.joinContest(contest.id).then(function (result) {
            if (result.result) {
              success();
            }
          });

          function success() {
            $state.go('contest.item', {
              contestId: contest.id
            });
          }
        }
      };
    }
  ])
;