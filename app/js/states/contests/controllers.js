/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 09.11.2015
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.contests', [])

    .controller('ContestsListCtrl', ['$scope', '$rootScope', '$state', 'ContestsManager', '_',
        function ($scope, $rootScope, $state, ContestsManager, _) {
            $scope.$emit('change_title', {
                title: 'Контесты | ' + _('app_name')
            });
            var defaultCount = 10;

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

            $scope.curSortItem = null;
            $scope.sortCategories = [{
                name: 'По дате создания',
                sort: 'byId'
            }, {
                name: 'По времени завершения',
                sort: 'byEnd'
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
                    if (result && result.error) {
                        return $state.go('auth.form');
                    }
                    if (!result || !result.hasOwnProperty('all_items_count')) {
                        return;
                    }
                    $scope.all_items_count = result.all_items_count;
                    $scope.contestsList = result.contests;
                    $scope.pagination = generatePaginationArray(5);
                }).catch(function (err) {
                    console.log(err);
                });
            }

            updateContestsList();

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

            $scope.$on('contests list update needed', function() {
                $scope.pageNumber = 1;
                $scope.params = {
                    count: defaultCount,
                    offset: ($scope.pageNumber - 1) * defaultCount,
                    category: 'all',
                    sort: 'byId',
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
        '$scope', 'ContestsManager', '$mdDialog', '$state',
        function ($scope, ContestsManager, $mdDialog, $state) {
            //console.log($scope.contest);

            $scope.loadingData = false;
            $scope.updateContest = function () {
                if (!$scope.contest || !$scope.contest.id) {
                    return;
                }
                $scope.loadingData = true;
                var contestId = $scope.contest.id;
                ContestsManager.getContest({ contest_id: contestId })
                    .then(function (result) {
                        $scope.loadingData = false;
                        if (!result) {
                            return;
                        }
                        //console.log(result.contest);
                        safeReplaceObject($scope.contest, result.contest);
                    });
            };

            $scope.joinContest = function (contest) {
                $scope.loadingData = true;
                ContestsManager.canJoin({ contest_id: contest.id })
                    .then(function (result) {
                        if (!result || !result.result || !result.result.hasOwnProperty('can')) {
                            $scope.loadingData = false;
                            return;
                        }
                        handleResponse(result.result);
                    });

                function handleResponse(result) {
                    if (!result.can) {
                        $scope.loadingData = false;
                        var alert = $mdDialog.alert()
                            .clickOutsideToClose(true)
                            .title('Уведомление')
                            .ariaLabel('Alert Dialog')
                            .ok('Ок');
                        if (result.reason === 'NOT_IN_TIME') {
                            alert.content('Контест еще не начат или уже завершен.');
                        } else {
                            alert.content(
                                'Доступ запрещен. Вы не состоите в нужной группе, контест недоступен или удален.'
                            );
                        }
                        $mdDialog.show(alert);
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
                    ContestsManager.joinContest(contest.id)
                        .then(function (result) {
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