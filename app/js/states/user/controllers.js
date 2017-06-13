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

angular.module('Qemy.controllers.user', [])
  
  .controller('UserBaseController', ['$scope', '$rootScope', '$state', '_', 'SocketService', '$mdToast', '$mdSidenav', '$log', '$timeout', 'ErrorService', 'UserManager',
    function ($scope, $rootScope, $state, _, SocketService, $mdToast, $mdSidenav, $log, $timeout, ErrorService, UserManager) {
      $scope.$emit('change_title', {
        title: 'Профиль | ' + _('app_name')
      });

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
  
  .controller('UserSolutionsController', ['$scope', '$rootScope', '$state', '_', '$element', 'UserManager', 'AdminManager', 'ErrorService', '$mdDialog', '$timeout', 'ContestsManager',
    function ($scope, $rootScope, $state, _, $element, UserManager, AdminManager, ErrorService, $mdDialog, $timeout, ContestsManager) {
      $scope.$emit('change_title', {
        title: 'Решения | ' + _('app_name')
      });

      var defaultCount = 25;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        select: 'all',
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount
      };

      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.solutions = [];
      $scope.allPages = 0;

      $scope.loadingData = false;

      $element.find('input').on('keydown', function (ev) {
        ev.stopPropagation();
      });

      $scope.clearSearchTerm = function() {
        $scope.searchTerm = '';
      };

      $scope.filterParticipants = [];
      $scope.participants = [];

      $scope.loadParticipants = function (q) {
        q = q || '';
        return AdminManager.getUsers({ q: q, count: Infinity }).then(function (data) {
          $scope.participants = data.users;
        });
      };

      $scope.$watch('filterParticipants', function (newVal, oldVal) {
        if (newVal == oldVal) {
          return;
        }
        $scope.params.filterUserIds = (newVal || []).join(',');
        updateSolutionsList();
      });

      $scope.filterVerdicts = [];
      $scope.verdicts = [];

      $scope.loadVerdicts = function () {
        return AdminManager.getVerdicts().then(function (verdicts) {
          $scope.verdicts = verdicts;
        });
      };

      $scope.$watch('filterVerdicts', function (newVal, oldVal) {
        if (newVal == oldVal) {
          return;
        }
        $scope.params.filterVerdictIds = (newVal || []).join(',');
        updateSolutionsList();
      });

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

      updateSolutionsList();

      function updateSolutionsList(page) {
        $rootScope.$broadcast('data loading');
        $scope.loadingData = true;
        UserManager.getSolutions($scope.params).then(function (result) {
          $timeout(function () {
            $rootScope.$broadcast('data loaded');
            $scope.loadingData = false;
          }, 0);
          if (!result || !result.hasOwnProperty('solutionsNumber')) {
            return;
          }
          $scope.all_items_count = result.solutionsNumber;
          $scope.solutions = result.solutions;
          $scope.pagination = generatePaginationArray(6);
        }).catch(function (result) {
          console.log(result);
          $rootScope.$broadcast('data loaded');
          ErrorService.show(result);
        });
      }
      $scope.selectedTabIndex = 0;

      $scope.$on('verdict updated', function (ev, args) {
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === args.id) {
            solutions[i]._currentAttempt = args._currentAttempt;
            var verdict = args.verdict;
            if (!verdict) {
              continue;
            }
            if (!solutions[i].verdict) {
              solutions[i].verdict = {};
            }
            if (typeof verdict.executionTime !== 'undefined') {
              solutions[i].executionTime = verdict.executionTime;
            }
            if (typeof verdict.memory !== 'undefined') {
              solutions[i].memory = verdict.memory;
            }
            if (typeof verdict.testNumber !== 'undefined') {
              solutions[i].testNumber = verdict.testNumber;
            }
            if (typeof verdict.id !== 'undefined') {
              solutions[i].verdictId = verdict.id || -1;
              solutions[i].verdict.id = verdict.id || -1;
              solutions[i].compilationError = args.compilationError;
            }
            if (typeof verdict.name !== 'undefined') {
              solutions[i].verdict.name = verdict.name;
            }
            break;
          }
        }
        safeApply($scope);
      });

      $scope.$on('new solution', function (ev, data) {
        //console.log(data);
        var userId = data.userId,
          canSee = !data.author.isAdmin || $scope.user.isAdmin;
        if (userId !== $scope.user.id
          || $scope.pageNumber !== 1
          || !canSee
          || ($scope.filterParticipants.length && $scope.filterParticipants.indexOf(userId) === -1)) {
          return;
        }
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === data.id) {
            return;
          }
        }
        if (solutions.length >= defaultCount) {
          solutions.pop();
        }
        solutions.unshift(data);
      });

      $scope.$on('reset solution', function (ev, args) {
        var solutionId = args.solutionId;
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === solutionId) {
            solutions[i].verdict = null;
            solutions[i].verdictId = null;
            solutions[i].executionTime = 0;
            solutions[i].testNumber = 0;
            solutions[i].memory = 0;
            solutions[i].compilationError = null;
            break;
          }
        }
        safeApply($scope);
      });

      $scope.actionsMenuItems = [{
        id: 'CHANGE_VERDICT',
        name: 'Изменить вердикт',
        svgIcon: '/img/icons/ic_spellcheck_48px.svg'
      }, {
        id: 'SEND_DUPLICATE',
        name: 'Продублировать решение',
        svgIcon: '/img/icons/ic_content_copy_48px.svg'
      }, {
        id: 'REFRESH_SOLUTION',
        name: 'Перепроверить решение',
        svgIcon: '/img/icons/ic_refresh_48px.svg'
      }, {
        type: 'divider'
      }, {
        id: 'SEND_DUPLICATE_AS_ADMIN',
        name: 'Продублировать решение (как администратор)',
        svgIcon: '/img/icons/ic_content_copy_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_PROBLEM',
        name: 'Переотправить все решения для задачи в этом контесте',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_USER',
        name: 'Переотправить все решения для пользователя в этом контесте',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_PROBLEM_AND_USER',
        name: 'Переотправить все решения для задачи и пользователя в этом контесте',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'SENT_DELETE',
        name: 'Удалить отправку',
        svgIcon: '/img/icons/ic_delete_48px.svg',
        themeClass: 'md-accent'
      }];

      $scope.selectAction = function (ev, action, item) {
        function changeVerdict() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showVerdictSelectionDialog(ev, item);
        }

        function sendDuplicate() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeSendDuplicate(ev).then(function () {
            AdminManager.sendSolutionAgain( { solutionId: item.id } ).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        function sendDuplicateAsAdmin() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeSendDuplicate(ev).then(function () {
            AdminManager.sendSolutionAgain( { solutionId: item.id, asAdmin: true } ).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        function refreshSolution() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            AdminManager.refreshSolution( { solutionId: item.id } ).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        function refreshSolutionForProblem() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            AdminManager.refreshSolutionForProblem( { contestId: item.contestId, symbolIndex: item.internalSymbolIndex } ).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        function refreshSolutionForUser() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            AdminManager.refreshSolutionForUser( { contestId: item.contestId, userId: item.userId } ).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        function refreshSolutionForProblemAndUser() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            AdminManager.refreshSolutionForProblemAndUser( { contestId: item.contestId, symbolIndex: item.internalSymbolIndex, userId: item.userId } ).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        function deleteSolution() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeDeleting(ev).then(function () {
            AdminManager.deleteSolution( { solutionId: item.id } ).then(function (result) {
              updateSolutionsList();
            }).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }

        var actions = {
          'CHANGE_VERDICT': changeVerdict,
          'SEND_DUPLICATE': sendDuplicate,
          'REFRESH_SOLUTION': refreshSolution,

          'SEND_DUPLICATE_AS_ADMIN': sendDuplicateAsAdmin,
          'REFRESH_SOLUTIONS_FOR_PROBLEM': refreshSolutionForProblem,
          'REFRESH_SOLUTIONS_FOR_USER': refreshSolutionForUser,
          'REFRESH_SOLUTIONS_FOR_PROBLEM_AND_USER': refreshSolutionForProblemAndUser,
          'SENT_DELETE': deleteSolution
        };

        if (action && action.id in actions) {
          actions[action.id]();
        }
      };

      function showVerdictSelectionDialog(ev, item) {
        $mdDialog.show({
          controller: ['$scope', 'sentItem', 'AdminManager', function ($scope, sentItem, AdminManager) {
            //console.log(sentItem);
            $scope.close = function () {
              $mdDialog.hide();
            };

            $scope.verdicts = [];
            AdminManager.getVerdicts().then(function (verdicts) {
              $scope.verdicts = verdicts;
            });

            $scope.selectedVerdictId = sentItem.verdictId;

            $scope.save = function () {
              var sentId = sentItem.id,
                verdict = $scope.selectedVerdictId;
              AdminManager.setVerdictForSent( { solutionId: sentId, verdictId: verdict } ).then(function (result) {
                $mdDialog.hide();
                updateSolutionsList();
              }).catch(function (result) {
                ErrorService.show(result);
              });
            };
          }],
          templateUrl: templateUrl('contest-item/contest-status', 'contest-verdict-selection-dialog'),
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            sentItem: item
          }
        });
      }

      function showConfirmationDialogBeforeSendDuplicate(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите отправить это решение еще раз?')
          .ariaLabel('Duplicate confirmation')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent(ev);
        return $mdDialog.show(confirm);
      }

      function showConfirmationDialogBeforeRefreshing(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите переотправить?')
          .ariaLabel('Refresh confirmation')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent(ev);
        return $mdDialog.show(confirm);
      }

      function showConfirmationDialogBeforeDeleting(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить это решение?')
          .ariaLabel('Delete confirmation')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent(ev);
        return $mdDialog.show(confirm);
      }

      function showCompilationErrorDialog($event, solution) {
        $mdDialog.show({
          templateUrl: templateUrl('contest-item/contest-status', 'contest-status-compilation-error-dialog'),
          controller: 'ContestItemStatusCompilationErrorCtrl',
          locals: {
            solution: solution
          },
          parent: document.querySelector('body'),
          clickOutsideToClose: true,
          targetEvent: $event
        });
      }
      $scope.showCompilationErrorDialog = showCompilationErrorDialog;
      $scope.$on('$stateChangeStart', function() {
        $mdDialog.hide();
      });

      $scope.joinContest = function (ev, contest) {
        ev.preventDefault();
        ev.stopPropagation();
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
    }
  ])
;