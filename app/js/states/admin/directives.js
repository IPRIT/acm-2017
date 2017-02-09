/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 11.11.2015
 */

"use strict";

/* Directives */

angular.module('Qemy.directives.admin', [])
    .directive('adminMenu', [function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: templateUrl('admin', 'admin-menu'),
            controller: 'AdminMenuController'
        }
    }])

    .directive('contestListItemAdmin', function() {
        return {
            restrict: 'E',
            templateUrl: templateUrl('admin', 'contests/list-item'),
            scope: {
                contest: '='
            },
            controller: ['$scope', '$rootScope', '$mdDialog', 'ContestsManager', '$state', 'AdminManager',
                function($scope, $rootScope, $mdDialog, ContestsManager, $state, AdminManager) {
                    $scope.loadingData = false;

                    $scope.joinContest = function (contest) {
                        $scope.loadingData = true;
                        ContestsManager.canJoin({ contestId: contest.id })
                            .then(function (result) {
                                if (!result || !result.hasOwnProperty('can')) {
                                    $scope.loadingData = false;
                                    return;
                                }
                                handleResponse(result);
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

                    $scope.deleteContest = function (contest) {
                        var confirm = $mdDialog.confirm()
                            .title('Подтверждение')
                            .content('Вы действительно хотите удалить контест?')
                            .ariaLabel('Lucky day')
                            .ok('Да')
                            .cancel('Отмена');

                        $mdDialog.show(confirm).then(function () {
                            $rootScope.$broadcast('data loading');
                            AdminManager.deleteContest({ contestId: contest.id })
                                .then(function (result) {
                                    $rootScope.$broadcast('data loaded');
                                    if (result.error) {
                                        return;
                                    }
                                    $scope.$emit('admin update contest list');
                                });
                        });
                    };

                    $scope.repairContest = function (contest) {
                        var confirm = $mdDialog.confirm()
                            .title('Подтверждение')
                            .content('Вы действительно хотите восстановить контест?')
                            .ariaLabel('Lucky day')
                            .ok('Да')
                            .cancel('Отмена');

                        $mdDialog.show(confirm).then(function () {
                            $rootScope.$broadcast('data loading');
                            AdminManager.repairContest({ contestId: contest.id })
                                .then(function (result) {
                                    $rootScope.$broadcast('data loaded');
                                    if (result.error) {
                                        return;
                                    }
                                    $scope.$emit('admin update contest list');
                                });
                        });
                    };
                }
            ]
        }
    })

    .directive('contestListItemAdminRating', function() {
        return {
            restrict: 'E',
            templateUrl: templateUrl('admin', 'ratings/list-item'),
            scope: true,
            controller: ['$scope', '$rootScope', '$mdDialog', 'ContestsManager', '$state', 'AdminManager',
                function($scope, $rootScope, $mdDialog, ContestsManager, $state, AdminManager) {
                    $scope.loadingData = false;

                    $scope.joinContest = function (contest) {
                        $scope.loadingData = true;
                        ContestsManager.canJoin({ contestId: contest.id })
                            .then(function (result) {
                                if (!result || !result.hasOwnProperty('can')) {
                                    $scope.loadingData = false;
                                    return;
                                }
                                handleResponse(result);
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

                    $scope.deleteContest = function (contest) {
                        var confirm = $mdDialog.confirm()
                            .title('Подтверждение')
                            .content('Вы действительно хотите удалить контест?')
                            .ariaLabel('Lucky day')
                            .ok('Да')
                            .cancel('Отмена');

                        $mdDialog.show(confirm).then(function () {
                            $rootScope.$broadcast('data loading');
                            AdminManager.deleteContest({ contestId: contest.id })
                                .then(function (result) {
                                    $rootScope.$broadcast('data loaded');
                                    if (result.error) {
                                        return;
                                    }
                                    $scope.$emit('admin update contest list');
                                });
                        });
                    };

                    $scope.repairContest = function (contest) {
                        var confirm = $mdDialog.confirm()
                            .title('Подтверждение')
                            .content('Вы действительно хотите восстановить контест?')
                            .ariaLabel('Lucky day')
                            .ok('Да')
                            .cancel('Отмена');

                        $mdDialog.show(confirm).then(function () {
                            $rootScope.$broadcast('data loading');
                            AdminManager.repairContest({ contestId: contest.id })
                                .then(function (result) {
                                    $rootScope.$broadcast('data loaded');
                                    if (result.error) {
                                        return;
                                    }
                                    $scope.$emit('admin update contest list');
                                });
                        });
                    };
                }
            ]
        }
    })

    .directive('userListItemAdmin', function() {
        return {
            restrict: 'E',
            templateUrl: templateUrl('admin', 'users/list-item'),
            scope: {
                user: '='
            },
            controller: 'AdminUserListItemCtrl'
        }
    })

    .directive('taskContenteditable', function() {
        return {
            restrict: 'A',
            require: '?ngBindHtml',
            scope: true,
            link: function (scope, element, attrs) {
                console.log(scope.condition);

                var element = angular.element(element);
                element.on('keyup keydown mouseup mousedown input', function (ev) {
                    if (!ev.target) {
                        return;
                    }
                    scope.condition.htmlStatement = ev.target.innerHTML;
                    scope.condition.textStatement = angular.element(ev.target).text();
                    scope.confirmExit = true;
                });
                element.attr('contenteditable', 'true');
                element.addClass('task__problem-editing');
            }
        }
    })
;