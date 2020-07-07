/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 13.06.2017
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.rating', [])
  
  .controller('RatingBaseController', ['$scope', '$rootScope', '$state', '_', 'SocketService', '$mdToast', '$mdSidenav', '$log', '$timeout', 'ErrorService', 'UserManager',
    function ($scope, $rootScope, $state, _, SocketService, $mdToast, $mdSidenav, $log, $timeout, ErrorService, UserManager) {
      $scope.user = {};

      function updateUser() {
        return UserManager.getCurrentUser().then(function (user) {
          $scope.user = user;
        }).catch(function (error) {
          ErrorService.show(error);
        });
      }

      updateUser();
    }
  ])

  .controller('RatingIndexController', ['$scope', '$rootScope', '$state', '_', 'ContestsManager',
    function ($scope, $rootScope, $state, _, ContestsManager) {
      $scope.$emit('change_title', {
        title: _('rating-index-title') + ' • ' + _('app_name')
      });

      const defaultCount = 10;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount,
        category: 'all',
        sort: 'byId',
        sort_order: 'desc'
      };

      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.contestsList = [];
      $scope.allPages = 0;

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
        $rootScope.$broadcast('data loading');
        var contestsPromise = ContestsManager.getContests($scope.params);
        contestsPromise.then(function (result) {
          $rootScope.$broadcast('data loaded');
          if (!result || !result.hasOwnProperty('contestsNumber')) {
            return;
          }
          $scope.all_items_count = result.contestsNumber;
          $scope.contestsList = result.contests;
          $scope.pagination = generatePaginationArray(5);
        }).catch(function (err) {
          console.log(err);
        });
      }

      updateContestsList();

      $scope.createRating = function () {
        if (!$scope.selectedContests.length) {
          return;
        }
        $state.go('rating.create', {
          contests: $scope.selectedContests.map(function (contest) {
            return contest.id;
          }).join(',')
        });
      };

      $scope.selectedContests = [];

      $scope.existsContest = function (contest, selectedContests) {
        return selectedContests.some(function (curItem) {
          return curItem.id === contest.id;
        });
      };

      $scope.toggleContest = function (contest, selectedContests) {
        var exists = $scope.existsContest(contest, selectedContests);
        if (exists) {
          selectedContests.forEach(function (curContest, index) {
            if (curContest.id === contest.id) {
              selectedContests.splice(index, 1);
            }
          });
        } else {
          selectedContests.push(contest);
        }
      };
    }
  ])

  .controller('RatingCreateController', ['$scope', '$rootScope', '$state', '_', 'AdminManager',
    function ($scope, $rootScope, $state, _, AdminManager) {
      $scope.$emit('change_title', {
        title: _('rating-index-title') + ' • ' + _('app_name')
      });

      var contestIds = ( $state.params.contests || '' ).split( ',' ) || [ ];

      contestIds = contestIds.map(function (element) {
        return +element;
      }).filter(function (element) {
        return typeof element === 'number' && element > 0;
      });

      if (!contestIds.length) {
        return $state.go('rating.index');
      }

      $scope.scoreInTime = 2;
      $scope.scoreInPractice = 1;

      $scope.table = {};

      function updateRatingTable() {
        $rootScope.$broadcast('data loading');
        AdminManager.getRatingTable({
          contestIds: contestIds,
          scoreInTime: $scope.scoreInTime,
          scoreInPractice: $scope.scoreInPractice
        }).then(function (result) {
          $rootScope.$broadcast('data loaded');
          if (!result || result.error) {
            return alert('Произошла ошибка: ' + result.error);
          }
          $scope.table = result;
        });
      }
      $scope.updateRatingTable = updateRatingTable;
      updateRatingTable();
    }
  ])
;