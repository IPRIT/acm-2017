/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 09.11.2015
 */

'use strict';

import md5 from 'md5';

/* Controllers */

/* global angular */
angular.module('Qemy.controllers.admin', [])

  .controller('AdminBaseController', ['$scope', '$rootScope', '$state', '_', 'UserManager',
    function ($scope, $rootScope, $state, _, UserManager) {
      $scope.$emit('change_title', {
        title: 'Панель администратора | ' + _('app_name')
      });
      $scope.user = {};

      $rootScope.$broadcast('data loading');
      UserManager.getCurrentUser().then(function (user) {
        $rootScope.$broadcast('data loaded');
        if (!user || !user.id) {
          return $state.go('auth.form');
        } else if (!user.isSupervisor) {
          return $state.go('contests.list');
        }
        $scope.user = user;
      }).catch(function (err) {
        $state.go('auth.form');
      });
    }
  ])

  .controller('AdminMenuController', ['$scope', '$rootScope', '$state', '_',
    function ($scope, $rootScope, $state, _) {
      $scope.menu = [{
        uiSref: 'admin.index',
        name: 'Контесты',
        group: 'admin.index',
      }, {
        uiSref: 'admin.users-list',
        name: 'Пользователи',
        group: 'admin.users-list'
      }, {
        uiSref: 'admin.groups.index',
        name: 'Группы пользователей',
        group: 'admin.groups'
      }, {
        uiSref: 'admin.problems',
        name: 'Задачи',
        group: 'admin.problems',
        onlyFor: 4096
      }, {
        uiSref: 'admin.server',
        name: 'Сервер',
        group: 'admin.server',
        onlyFor: 4096
      }, {
        uiSref: 'admin.contests-rating.create.index',
        name: 'Рейтинги',
        group: 'admin.contests-rating'
      }];

      $rootScope.$state = $state;
    }
  ])

  .controller('AdminIndexController', ['$scope', '$rootScope', '$state', '_', 'ContestsManager', 'AdminManager', '$mdDialog',
    function ($scope, $rootScope, $state, _, ContestsManager, AdminManager, $mdDialog) {
      $scope.$emit('change_title', {
        title: 'Управление контестами | ' + _('app_name')
      });
      var defaultCount = 10;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount,
        category: 'all',
        sort: 'byId',
        sort_order: 'desc',
        query: ''
      };

      const debounce = (cb, delay = 200) => {
        let timeout = null;
        return function(data) {
          if (timeout) {
            clearTimeout(timeout);
          }
          timeout = setTimeout(_ => cb( data ), delay);
        };
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

      function updateContestsList(loading = true) {
        loading && $rootScope.$broadcast('data loading');
        var contestsPromise = ContestsManager.getContests($scope.params);
        contestsPromise.then(function (result) {
          loading && $rootScope.$broadcast('data loaded');
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

      $scope.curSearchQuery = '';

      $scope.$watch('curSearchQuery', debounce((newVal, oldVal) => {
        $scope.params.query = newVal;
        $scope.params.offset = 0;
        updateContestsList(false);
      }));

      $scope.$on('admin update contest list', function () {
        updateContestsList();
      });
    }
  ])

  .controller('AdminEditContestController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Редактирование контеста | ' + _('app_name')
      });

      var contestId = $state.params.contestId;
      var zF = function (num) { return num < 10 ? '0' + num : num };
      var currentDate = new Date();

      $scope.form = {};
      $scope.startTimes = [];
      $scope.startTimesMinutes = [];
      $scope.durationMinutes = [];

      $scope.$watch('form.contestStartTime', function (newVal) {
        if (newVal > 1 && newVal < 6) {
          var confirm = $mdDialog.confirm()
            .title('Начало контеста будет ночью')
            .content('Серьезно?')
            .ariaLabel('Lucky day')
            .ok('Да')
            .cancel('Нет');

          $mdDialog.show(confirm);
        }
      });

      for (var i = 0; i < 24; ++i) {
        $scope.startTimes.push({
          time: i,
          name: zF(i)
        });
      }
      for (i = 0; i < 60; ++i) {
        $scope.startTimesMinutes.push({
          time: i,
          name: zF(i)
        });
        $scope.durationMinutes.push({
          time: i,
          name: zF(i)
        });
      }

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(function (data) {
          return data.groups;
        });
      };

      $scope.systemType = 'all';
      $scope.problems = [];
      $scope.qProblems = '';
      $scope.systems = [{
        type: 'all',
        name: 'Все'
      }, {
        type: 'timus',
        name: 'Timus'
      }, {
        type: 'acmp',
        name: 'ACMP'
      }, {
        type: 'cf',
        name: 'Codeforces'
      }, {
        type: 'sgu',
        name: 'SGU'
      }, {
        type: 'ejudge',
        name: 'ejudge'
      }, {
        type: 'yandex',
        name: 'Яндекс.Контест'
      }, {
        type: 'yandexOfficial',
        name: 'Яндекс.Контест (Official)'
      }];

      $scope.selectedProblems = [];

      var newQ = '';
      $scope.searchProblems = function () {
        newQ = $scope.qProblems;
        AdminManager.searchProblems({
          q: $scope.qProblems,
          systemType: $scope.systemType
        }).then(function (results) {
          if (results.error) {
            return alert('Произошла ошибка: ' + results.error);
          }
          if (newQ !== results.q) {
            return console.log('Skipped result');
          }
          $scope.problems = results.problems.map(function (problem) {
            switch (problem.systemType) {
              case 'cf':
                var pTypeObj = problem.foreignProblemIdentifier.split(':');
                if (!pTypeObj || pTypeObj.length !== 2) {
                  problem.task_number = problem.foreignProblemIdentifier;
                } else {
                  problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                    '. ' + pTypeObj[1];
                }
                break;
              default: {
                problem.task_number = problem.foreignProblemIdentifier;
              }
            }
            return problem;
          });
        });
      };

      $scope.$watch('qProblems', function () {
        $scope.searchProblems();
      });

      $scope.$watch('systemType', function () {
        $scope.searchProblems();
      });

      $scope.existsProblem = function (problem, selectedProblems) {
        return selectedProblems.some(function (curProblem) {
          return curProblem.id === problem.id;
        });
      };

      $scope.toggleProblem = function (problem, selectedProblems) {
        var exists = $scope.existsProblem(problem, selectedProblems);
        if (exists) {
          selectedProblems.forEach(function (curProblem, index) {
            if (curProblem.id === problem.id) {
              selectedProblems.splice(index, 1);
            }
          });
        } else {
          selectedProblems.push(problem);
        }
      };

      $scope.showProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        $mdDialog.show({
          controller: 'AdminProblemDialogController',
          templateUrl: templateUrl('admin', 'admin-problem-dialog'),
          targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            condition: { ...problem }
          }
        });
      };
      $scope.deleteProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить эту задачу? В случае удаления, эта задача удалится из каждого контеста.')
          .ariaLabel('Confirm dialog')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          return AdminManager.deleteProblem({ problemId: problem.id });
        }).then(function () {
          return $scope.searchProblems();
        });
      };
      $scope.isShowingSelected = false;
      $scope.toggleSelected = function (ev) {
        $scope.isShowingSelected = !$scope.isShowingSelected;
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;
      };

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var form = angular.copy($scope.form);

        var contestStartDate = form.contestStartDate;
        contestStartDate = {
          year: contestStartDate.getFullYear(),
          month: contestStartDate.getMonth(),
          day: contestStartDate.getDate(),
          hours: parseInt(form.contestStartTime),
          minutes: parseInt(form.contestStartTimeMinutes)
        };
        //year,month,date,hours,minutes
        contestStartDate = new Date(
          contestStartDate.year, contestStartDate.month,
          contestStartDate.day, contestStartDate.hours,
          contestStartDate.minutes
        );

        var problems = $scope.selectedProblems;
        form.groups = (form.groups || []).map(function (group) {
          return group.id;
        });

        var durationTimeMs = (form.contestRelativeFinishTimeHours * 3600 + Number(form.contestRelativeFinishTimeMinutes) * 60) * 1000;
        var data = {
          startTimeMs: contestStartDate.getTime(),
          durationTimeMs: durationTimeMs,
          relativeFreezeTimeMs: Math.max(0, durationTimeMs - form.contestFreezeTime * 3600 * 1000),
          practiceDurationTimeMs: form.hasPractice ? form.contestPracticeTime * 3600 * 1000 : 0,
          name: form.contestName,
          groupIds: form.groups,
          problemIds: (problems || []).map(function (problem) {
            return problem.id;
          }),
          contestId: contestId,
          isRated: form.isRated
        };

        AdminManager.updateContest(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            $state.go('admin.index');
          })
          .catch(function (err) {
            ErrorService.show(err);
          })
          .finally(function () {
            $rootScope.$broadcast('data loaded');
          });
      };

      $scope.indexGenerator = function (curIndex) {
        var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split(''),
          symbolsNumber = Math.floor(curIndex / alphabet.length) + 1;
        if (symbolsNumber === 1) {
          return alphabet[ curIndex ];
        } else {
          return alphabet[ symbolsNumber - 2 ] + alphabet[ curIndex % alphabet.length ];
        }
      };

      $scope.objectRow = {};

      function getContestInfo() {
        $rootScope.$broadcast('data loading');
        AdminManager.getContestInfo({ contestId: contestId })
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            if (result.error) {
              return alert('Произошла ошибка');
            }
            $scope.objectRow = result;
            var startDate = new Date(result.startTimeMs);
            $scope.form = {
              contestName: result.name,
              contestStartDate: startDate,
              contestRelativeFinishTimeHours: Math.floor(result.durationTimeMs / (1000 * 60 * 60)),
              contestRelativeFinishTimeMinutes: Math.ceil((result.durationTimeMs / (1000 * 60 * 60) - Math.floor(result.durationTimeMs / (1000 * 60 * 60))) * 60),
              contestFreezeTime: (result.durationTimeMs - result.relativeFreezeTimeMs) / (1000 * 60 * 60),
              contestPracticeTime: result.practiceDurationTimeMs / (1000 * 60 * 60),
              contestStartTime: startDate.getHours(),
              contestStartTimeMinutes: startDate.getMinutes(),
              hasPractice: result.hasPracticeTime,
              groups: result.allowedGroups || [],
              isRated: result.isRated
            };
            $scope.selectedProblems = result.problems.map(function (problem) {
              switch (problem.systemType) {
                case 'cf':
                  var pTypeObj = problem.foreignProblemIdentifier.split(':');
                  if (!pTypeObj || pTypeObj.length !== 2) {
                    problem.task_number = problem.foreignProblemIdentifier;
                  } else {
                    problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                      '. ' + pTypeObj[1];
                  }
                  break;
                default: {
                  problem.task_number = problem.foreignProblemIdentifier;
                }
              }
              return problem;
            });
          });
      }

      getContestInfo();
    }
  ])

  .controller('AdminCopyContestController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Создание контеста | ' + _('app_name')
      });

      var contestId = $state.params.contestId;
      var zF = function (num) { return num < 10 ? '0' + num : num };
      var currentDate = new Date();

      $scope.form = {};
      $scope.startTimes = [];
      $scope.startTimesMinutes = [];
      $scope.durationMinutes = [];

      $scope.$watch('form.contestStartTime', function (newVal) {
        if (newVal > 1 && newVal < 6) {
          var confirm = $mdDialog.confirm()
            .title('Начало контеста будет ночью')
            .content('Серьезно?')
            .ariaLabel('Lucky day')
            .ok('Да')
            .cancel('Нет');

          $mdDialog.show(confirm);
        }
      });

      for (var i = 0; i < 24; ++i) {
        $scope.startTimes.push({
          time: i,
          name: zF(i)
        });
      }
      for (i = 0; i < 60; ++i) {
        $scope.startTimesMinutes.push({
          time: i,
          name: zF(i)
        });
        $scope.durationMinutes.push({
          time: i,
          name: zF(i)
        });
      }

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(function (data) {
          return data.groups;
        });
      };

      $scope.systemType = 'all';
      $scope.problems = [];
      $scope.qProblems = '';
      $scope.systems = [{
        type: 'all',
        name: 'Все'
      }, {
        type: 'timus',
        name: 'Timus'
      }, {
        type: 'acmp',
        name: 'ACMP'
      }, {
        type: 'cf',
        name: 'Codeforces'
      }, {
        type: 'sgu',
        name: 'SGU'
      }, {
        type: 'ejudge',
        name: 'ejudge'
      }, {
        type: 'yandex',
        name: 'Яндекс.Контест'
      }, {
        type: 'yandexOfficial',
        name: 'Яндекс.Контест (Official)'
      }];

      $scope.selectedProblems = [];

      var newQ = '';
      $scope.searchProblems = function () {
        newQ = $scope.qProblems;
        AdminManager.searchProblems({
          q: $scope.qProblems,
          systemType: $scope.systemType
        }).then(function (results) {
          if (results.error) {
            return alert('Произошла ошибка: ' + results.error);
          }
          if (newQ !== results.q) {
            return console.log('Skipped result');
          }
          $scope.problems = results.problems.map(function (problem) {
            switch (problem.systemType) {
              case 'cf':
                var pTypeObj = problem.foreignProblemIdentifier.split(':');
                if (!pTypeObj || pTypeObj.length !== 2) {
                  problem.task_number = problem.foreignProblemIdentifier;
                } else {
                  problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                    '. ' + pTypeObj[1];
                }
                break;
              default: {
                problem.task_number = problem.foreignProblemIdentifier;
              }
            }
            return problem;
          });
        });
      };

      $scope.$watch('qProblems', function () {
        $scope.searchProblems();
      });

      $scope.$watch('systemType', function () {
        $scope.searchProblems();
      });

      $scope.existsProblem = function (problem, selectedProblems) {
        return selectedProblems.some(function (curProblem) {
          return curProblem.id === problem.id;
        });
      };

      $scope.toggleProblem = function (problem, selectedProblems) {
        var exists = $scope.existsProblem(problem, selectedProblems);
        if (exists) {
          selectedProblems.forEach(function (curProblem, index) {
            if (curProblem.id === problem.id) {
              selectedProblems.splice(index, 1);
            }
          });
        } else {
          selectedProblems.push(problem);
        }
      };

      $scope.showProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        $mdDialog.show({
          controller: 'AdminProblemDialogController',
          templateUrl: templateUrl('admin', 'admin-problem-dialog'),
          targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            condition: { ...problem }
          }
        });
      };
      $scope.deleteProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить эту задачу? В случае удаления, эта задача удалится из каждого контеста.')
          .ariaLabel('Confirm dialog')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          return AdminManager.deleteProblem({ problemId: problem.id });
        }).then(function () {
          return $scope.searchProblems();
        });
      };
      $scope.isShowingSelected = false;
      $scope.toggleSelected = function (ev) {
        $scope.isShowingSelected = !$scope.isShowingSelected;
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;
      };

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var form = angular.copy($scope.form);

        var contestStartDate = form.contestStartDate;
        contestStartDate = {
          year: contestStartDate.getFullYear(),
          month: contestStartDate.getMonth(),
          day: contestStartDate.getDate(),
          hours: parseInt(form.contestStartTime),
          minutes: parseInt(form.contestStartTimeMinutes)
        };
        //year,month,date,hours,minutes
        contestStartDate = new Date(
          contestStartDate.year, contestStartDate.month,
          contestStartDate.day, contestStartDate.hours,
          contestStartDate.minutes
        );

        var problems = $scope.selectedProblems;
        form.groups = (form.groups || []).map(function (group) {
          return group.id;
        });

        var durationTimeMs = (form.contestRelativeFinishTimeHours * 3600 + Number(form.contestRelativeFinishTimeMinutes) * 60) * 1000;
        var data = {
          startTimeMs: contestStartDate.getTime(),
          durationTimeMs: durationTimeMs,
          relativeFreezeTimeMs: Math.max(0, durationTimeMs - form.contestFreezeTime * 3600 * 1000),
          practiceDurationTimeMs: form.hasPractice ? form.contestPracticeTime * 3600 * 1000 : 0,
          name: form.contestName,
          groupIds: form.groups,
          problemIds: (problems || []).map(function (problem) {
            return problem.id;
          }),
          isRated: form.isRated
        };

        AdminManager.createContest(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            $state.go('admin.index');
          })
          .catch(function (err) {
            ErrorService.show(err);
          })
          .finally(function () {
            $rootScope.$broadcast('data loaded');
          });
      };

      $scope.indexGenerator = function (curIndex) {
        var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split(''),
          symbolsNumber = Math.floor(curIndex / alphabet.length) + 1;
        if (symbolsNumber === 1) {
          return alphabet[ curIndex ];
        } else {
          return alphabet[ symbolsNumber - 2 ] + alphabet[ curIndex % alphabet.length ];
        }
      };

      $scope.objectRow = {};

      function getContestInfo() {
        $rootScope.$broadcast('data loading');
        AdminManager.getContestInfo({ contestId: contestId })
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            if (result.error) {
              return alert('Произошла ошибка');
            }
            $scope.objectRow = result;
            var startDate = new Date(result.startTimeMs);
            $scope.form = {
              contestName: result.name,
              contestStartDate: startDate,
              contestRelativeFinishTimeHours: Math.floor(result.durationTimeMs / (1000 * 60 * 60)),
              contestRelativeFinishTimeMinutes: Math.ceil((result.durationTimeMs / (1000 * 60 * 60) - Math.floor(result.durationTimeMs / (1000 * 60 * 60))) * 60),
              contestFreezeTime: (result.durationTimeMs - result.relativeFreezeTimeMs) / (1000 * 60 * 60),
              contestPracticeTime: result.practiceDurationTimeMs / (1000 * 60 * 60),
              contestStartTime: startDate.getHours(),
              contestStartTimeMinutes: startDate.getMinutes(),
              hasPractice: result.hasPracticeTime,
              groups: result.allowedGroups || [],
              isRated: result.isRated
            };
            $scope.selectedProblems = result.problems.map(function (problem) {
              switch (problem.systemType) {
                case 'cf':
                  var pTypeObj = problem.foreignProblemIdentifier.split(':');
                  if (!pTypeObj || pTypeObj.length !== 2) {
                    problem.task_number = problem.foreignProblemIdentifier;
                  } else {
                    problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                      '. ' + pTypeObj[1];
                  }
                  break;
                default: {
                  problem.task_number = problem.foreignProblemIdentifier;
                }
              }
              return problem;
            });
          });
      }

      getContestInfo();
    }
  ])

  .controller('AdminCreateContestController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Создание контеста | ' + _('app_name')
      });

      var zF = function (num) { return num < 10 ? '0' + num : num };
      var currentDate = new Date();

      function getMonthName(num) {
        num = num || 0;
        if (num < 0 || num > 12) {
          num = 0;
        }
        var month = Config.I18n.locale === 'ru-ru'
          ? ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
            'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря']
          : ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        return month[num];
      }

      $scope.form = {
        contestRelativeFinishTimeHours: 5,
        contestRelativeFinishTimeMinutes: 0,
        contestFreezeTime: 1,
        contestPracticeTime: 0,
        contestStartDate: currentDate,
        contestStartTime: 0,
        contestStartTimeMinutes: 0,
        contestName: zF(currentDate.getDate()) + ' ' + getMonthName(currentDate.getMonth()) + ' ' + zF(currentDate.getFullYear()) + ' • Название контеста',
        groups: [],
        isRated: true
      };
      $scope.startTimes = [];
      $scope.startTimesMinutes = [];
      $scope.durationMinutes = [];

      for (var i = 0; i < 24; ++i) {
        $scope.startTimes.push({
          time: i,
          name: zF(i)
        });
      }
      for (i = 0; i < 60; ++i) {
        $scope.startTimesMinutes.push({
          time: i,
          name: zF(i)
        });
        $scope.durationMinutes.push({
          time: i,
          name: zF(i)
        });
      }

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(function (data) {
          return data.groups;
        });
      };

      $scope.systemType = 'all';
      $scope.problems = [];
      $scope.qProblems = '';
      $scope.systems = [{
        type: 'all',
        name: 'Все'
      }, {
        type: 'timus',
        name: 'Timus'
      }, {
        type: 'acmp',
        name: 'ACMP'
      }, {
        type: 'cf',
        name: 'Codeforces'
      }, {
        type: 'sgu',
        name: 'SGU'
      }, {
        type: 'ejudge',
        name: 'ejudge'
      }, {
        type: 'yandex',
        name: 'Яндекс.Контест'
      }, {
        type: 'yandexOfficial',
        name: 'Яндекс.Контест (Official)'
      }];

      $scope.selectedProblems = [];

      var newQ = '';
      $scope.searchProblems = function () {
        newQ = $scope.qProblems;
        AdminManager.searchProblems({
          q: $scope.qProblems,
          systemType: $scope.systemType
        }).then(function (results) {
          if (results.error) {
            return alert('Произошла ошибка: ' + results.error);
          }
          if (newQ !== results.q) {
            return console.log('Skipped result');
          }
          $scope.problems = results.problems.map(function (problem) {
            switch (problem.systemType) {
              case 'cf':
                var pTypeObj = problem.foreignProblemIdentifier.split(':');
                if (!pTypeObj || pTypeObj.length !== 2) {
                  problem.task_number = problem.foreignProblemIdentifier;
                } else {
                  problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                    '. ' + pTypeObj[1];
                }
                break;
              default: {
                problem.task_number = problem.foreignProblemIdentifier;
              }
            }
            return problem;
          });
        });
      };

      $scope.$watch('qProblems', function () {
        $scope.searchProblems();
      });

      $scope.$watch('systemType', function () {
        $scope.searchProblems();
      });

      $scope.existsProblem = function (problem, selectedProblems) {
        return selectedProblems.some(function (curProblem) {
          return curProblem.id === problem.id;
        });
      };

      $scope.toggleProblem = function (problem, selectedProblems) {
        var exists = $scope.existsProblem(problem, selectedProblems);
        if (exists) {
          selectedProblems.forEach(function (curProblem, index) {
            if (curProblem.id === problem.id) {
              selectedProblems.splice(index, 1);
            }
          });
        } else {
          selectedProblems.push(problem);
        }
      };

      $scope.showProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        $mdDialog.show({
          controller: 'AdminProblemDialogController',
          templateUrl: templateUrl('admin', 'admin-problem-dialog'),
          targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            condition: { ...problem }
          }
        });
      };
      $scope.deleteProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить эту задачу? В случае удаления, эта задача удалится из каждого контеста.')
          .ariaLabel('Confirm dialog')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          return AdminManager.deleteProblem({ problemId: problem.id });
        }).then(function () {
          return $scope.searchProblems();
        });
      };
      $scope.isShowingSelected = false;
      $scope.toggleSelected = function (ev) {
        $scope.isShowingSelected = !$scope.isShowingSelected;
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;
      };

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var form = angular.copy($scope.form);

        var contestStartDate = form.contestStartDate;
        contestStartDate = {
          year: contestStartDate.getFullYear(),
          month: contestStartDate.getMonth(),
          day: contestStartDate.getDate(),
          hours: parseInt(form.contestStartTime),
          minutes: parseInt(form.contestStartTimeMinutes)
        };
        //year,month,date,hours,minutes
        contestStartDate = new Date(
          contestStartDate.year, contestStartDate.month,
          contestStartDate.day, contestStartDate.hours,
          contestStartDate.minutes
        );

        var problems = $scope.selectedProblems;
        form.groups = (form.groups || []).map(function (group) {
          return group.id;
        });

        var durationTimeMs = (form.contestRelativeFinishTimeHours * 3600 + Number(form.contestRelativeFinishTimeMinutes) * 60) * 1000;
        var data = {
          startTimeMs: contestStartDate.getTime(),
          durationTimeMs: durationTimeMs,
          relativeFreezeTimeMs: Math.max(0, durationTimeMs - form.contestFreezeTime * 3600 * 1000),
          practiceDurationTimeMs: form.hasPractice ? form.contestPracticeTime * 3600 * 1000 : 0,
          name: form.contestName,
          groupIds: form.groups,
          problemIds: (problems || []).map(function (problem) {
            return problem.id;
          }),
          isRated: form.isRated
        };

        AdminManager.createContest(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            $state.go('admin.index');
          })
          .catch(function (err) {
            ErrorService.show(err);
          })
          .finally(function () {
            $rootScope.$broadcast('data loaded');
          });
      };

      $scope.indexGenerator = function (curIndex) {
        var alphabet = 'abcdefghijklmnopqrstuvwxyz'.split(''),
          symbolsNumber = Math.floor(curIndex / alphabet.length) + 1;
        if (symbolsNumber === 1) {
          return alphabet[ curIndex ];
        } else {
          return alphabet[ symbolsNumber - 2 ] + alphabet[ curIndex % alphabet.length ];
        }
      };
    }
  ])

  .controller('AdminProblemDialogController', [
    '$sce', '$scope', 'condition', '$mdDialog',
    function ($sce, $scope, condition, $mdDialog) {
      $scope.condition = prepareFiles( condition );
      $scope.close = function () {
        $mdDialog.hide();
      };

      function prepareFiles( result ) {
        if (result.attachments
          && Array.isArray( result.attachments.files )) {
          result.attachments.files = result.attachments.files.map(file => {
            if (file.embedUrl && typeof file.embedUrl === 'string') {
              //file.embedUrl = $sce.trustAsResourceUrl(file.embedUrl);
            } else if (file.type === 'pdf'
              && file.downloadUrl
              && typeof file.downloadUrl === 'string') {
              /*file.embedUrl = $sce.trustAsResourceUrl(
                file.downloadUrl.replace(/(export=download&)/i, '')
              );*/
              file.embedUrl = file.downloadUrl.replace(/(export=download&)/i, '');
            } else if (typeof file.downloadUrl === 'string') {
              // file.url = $sce.trustAsResourceUrl(file.url);
            }
            return file;
          });
          if (result.attachments.config.files_show_embed) {
            result.attachments.files = result.attachments.files.sort((a, b) => {
              if (a.embedUrl && b.embedUrl) {
                return 0;
              } else if (b.embedUrl) {
                return 1;
              }
              return -1;
            });
          }
        }
        return result;
      }
    }
  ])

  .controller('AdminUsersListController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Список пользователей | ' + _('app_name')
      });

      var defaultCount = 10;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount
      };

      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.usersList = [];
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
        loadUsers();
      });

      $scope.$on('admin update users list', function () {
        loadUsers();
      });

      $scope.query = '';

      function loadUsers(params) {
        $scope.dataLoading = true;
        $scope.params.q = $scope.query;
        angular.extend($scope.params, params);

        return AdminManager.getUsers($scope.params).then(function (result) {
          if (!result || !result.hasOwnProperty('usersNumber') || $scope.query !== result.q) {
            return;
          }
          $scope.dataLoading = false;
          $scope.all_items_count = result.usersNumber;
          $scope.usersList = result.users;
          $scope.pagination = generatePaginationArray(5);
        }).catch(function (err) {
          ErrorService.show(err);
        });
      }

      $scope.$watch('query', function () {
        loadUsers();
      })
    }
  ])

  .controller('AdminCreateUserController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', '$filter',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, $filter) {
      $scope.$emit('change_title', {
        title: 'Создание пользователя | ' + _('app_name')
      });

      $scope.form = {
        groups: []
      };

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(function (data) {
          return data.groups;
        });
      };

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var form = angular.copy($scope.form);
        form.groups = (form.groups || []).map(function (group) {
          return group.id;
        });
        var data = {
          username: form.username,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          groupIds: form.groups
        };
        AdminManager.createUser(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            if (result.error) {
              return alert('Произошла ошибка: ' + result.error);
            }
            $state.go('admin.users-list');
          });
      };

      var fioChanged = function () {
        var firstName = $scope.form.firstName || '',
          lastName = $scope.form.lastName || '',
          username;
        if (!firstName && !lastName) {
          $scope.form.username = '';
          $scope.form.password = '';
          return;
        } else if (!firstName) {
          username = $filter('latinize')(lastName);
        } else if (!lastName) {
          username = $filter('latinize')(firstName);
        } else {
          username = $filter('latinize')(firstName[0]) + '.' + $filter('latinize')(lastName);
        }
        $scope.form.username = username;
        $scope.form.password = username;
      };

      $scope.$watch('form.firstName', fioChanged);
      $scope.$watch('form.lastName', fioChanged);
    }
  ])

  .controller('AdminCreateUsersIntoGroupController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', '$filter', 'Upload', 'ErrorService', '$mdToast',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, $filter, Upload, ErrorService, $mdToast) {
      $scope.$emit('change_title', {
        title: 'Регистрация пользователей в группу | ' + _('app_name')
      });

      $scope.form = {
        groups: []
      };

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(function (data) {
          return data.groups;
        });
      };

      $scope.upload = function (file) {
        $rootScope.$broadcast('data loading');
        var form = angular.copy($scope.form);
        var groupIds = (form.groups || []).map(function (group) {
          return group.id;
        });
        Upload.upload({
          url: '/api/admin/users-groups',
          data: {
            file: file,
            groupIds: groupIds.join(',')
          }
        }).then(function (response) {
          $rootScope.$broadcast('data loaded');
          $state.go('admin.users-list');
          var toast = $mdToast.simple()
            .hideDelay(2000)
            .textContent('Пользователи успешно созданы')
            .action('OK')
            .parent(document.querySelector('.notifications'))
            .highlightAction(true)
            .highlightClass('md-warn')
            .position('top right');

          $mdToast.show(toast).catch(function (error) {
            console.log('Toast rejected');
          });
        }, function (result) {
          $rootScope.$broadcast('data loaded');
          console.log('Error status: ' + result);
        }, function (evt) {
          var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
          console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        }).catch(function (result) {
          ErrorService.show(result);
        });
      };

      $scope.files = [{
        type: 'spreadsheet',
        url: '/files/docs/users.csv',
        title: 'users.csv'
      }];
    }
  ])

  .controller('AdminEditUserController', ['$scope', '$rootScope', '$state', '_', 'AdminManager', '$mdDialog', '$filter', '$timeout',
    function ($scope, $rootScope, $state, _, AdminManager, $mdDialog, $filter, $timeout) {
      $scope.$emit('change_title', {
        title: 'Редактирование пользователя | ' + _('app_name')
      });

      $scope.currentUser = {
        groups: []
      };
      var userId = $state.params.userId;

      AdminManager.getUser({ userId: userId })
        .then(function (currentUser) {
          currentUser.password = '';
          currentUser.accessGroupMask = currentUser.accessGroup.mask;
          $scope.currentUser = currentUser;
          $scope.$watch('currentUser.firstName', fioChanged);
          $scope.$watch('currentUser.lastName', fioChanged);
        });

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.accessGroups = [{
        mask: 256,
        name: 'Обычный пользователь'
      }, {
        mask: 1024,
        name: 'Модератор'
      }, {
        mask: 4096,
        name: 'Администратор'
      }];

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(function (data) {
          return data.groups;
        });
      };

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var form = angular.copy($scope.currentUser);
        form.groups = (form.groups || []).map(function (group) {
          return group.id;
        });
        form.userId = +userId;

        var data = {
          username: form.username,
          password: form.password,
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          groupIds: form.groups,
          userId: +userId,
          accessGroup: form.accessGroupMask
        };
        AdminManager.updateUser(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            if (result.error) {
              return alert('Произошла ошибка: ' + result.error);
            }
            $state.go('admin.users-list');
          });
      };

      var fioChangesNumber = 0;
      var fioChanged = function () {
        if (fioChangesNumber++ < 2) {
          return;
        }
        var firstName = $scope.currentUser.firstName || '',
          lastName = $scope.currentUser.lastName || '',
          username;
        if (!firstName && !lastName) {
          $scope.currentUser.username = '';
          $scope.currentUser.password = '';
          return;
        } else if (!firstName) {
          username = $filter('latinize')(lastName);
        } else if (!lastName) {
          username = $filter('latinize')(firstName);
        } else {
          username = $filter('latinize')(firstName[0]) + '.' + $filter('latinize')(lastName);
        }
        $scope.currentUser.username = username;
      };
    }
  ])

  .controller('AdminUserListItemCtrl', ['$scope', '$rootScope', '$mdDialog', 'ContestsManager', '$state', 'AdminManager',
    function($scope, $rootScope, $mdDialog, ContestsManager, $state, AdminManager) {
      $scope.deleteUser = function () {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить пользователя?')
          .ariaLabel('Lucky day')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          $rootScope.$broadcast('data loading');
          AdminManager.deleteUser({ userId: $scope.user.id })
            .then(function (result) {
              $rootScope.$broadcast('data loaded');
              if (result.error) {
                return alert('Произошла ошибка: ' + result.error);
              }
              $scope.$emit('admin update users list');
            });
        });
      };
    }
  ])

  .controller('AdminYandexContestImportController', ['$scope', '$rootScope', '$mdDialog', 'ContestsManager', '$state', 'AdminManager', 'Upload', 'ErrorService',
    function($scope, $rootScope, $mdDialog, ContestsManager, $state, AdminManager, Upload, ErrorService) {

      $scope.fileExt = '';
      $scope.$watch('file', function (file) {
        if (file && file.name) {
          $scope.fileExt = (file.name || '').match(/\.(\w+)$/i)[1];
        }
      });

      // reset file
      $scope.clearFile = function () {
        $scope.file = null;
      };

      // upload later on form submit or something similar
      $scope.submit = function () {
        if ($scope.importForm.file.$valid && $scope.file) {
          console.log($scope.file);
          $scope.sending = true;
          $scope.upload($scope.file);
        }
      };

      // upload on file select or drop
      $scope.upload = function (file) {
        $rootScope.$broadcast('data loading');
        Upload.upload({
          url: '/files/yandex-polygon-import',
          data: {
            file: file
          }
        }).then(function (response) {
          console.log(response);
          $scope.sent = true;
        }, function (result) {
          console.error('Error status: ' + result);
        }, function (evt) {
          var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
          console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $scope.sending = false;
          $rootScope.$broadcast('data loaded');
        });
      };
    }
  ])

  .controller('AdminYandexContestImportByLinkController', ['$scope', '$rootScope', '$mdDialog', 'ContestsManager', '$state', 'AdminManager', 'Upload', 'ErrorService',
    function($scope, $rootScope, $mdDialog, ContestsManager, $state, AdminManager, Upload, ErrorService) {

      $scope.official = false;

      $scope.$watch('link', function (link) {
        if (!link) {
          return;
        }
        var yandexContestIdRegexp =
          /(?:https?:\/\/)?contest\.yandex\.(?:ru|com)(?:\/[a-zA-Z0-9а-яА-Я_.-]+)?\/contest\/(\d+)(?:.*)?/i;
        if (yandexContestIdRegexp.test(link)) {
          $scope.linkError = false;
          $scope.contestId = Number(link.match(yandexContestIdRegexp)[1]);
        } else {
          $scope.linkError = true;
        }
      });

      $scope.submit = function () {
        if (!$scope.contestId) {
          return;
        }
        $scope.$emit('data loading');
        $scope.sent = true;
        $scope.sending = true;
        var promise = $scope.official ?
          AdminManager.yandexOfficialImportByContestId({ contestId: $scope.contestId })
          : AdminManager.yandexImportByContestId({ contestId: $scope.contestId });
        promise.catch(function (error) {
          ErrorService.show(error);
        }).finally(function () {
          $scope.sending = false;
          $scope.$emit('data loaded');
        });
      }
    }
  ])

  .controller('AdminProblemsController', ['$scope', '$rootScope', '$mdDialog', '$state', 'AdminManager', 'ErrorService', 'SocketService', '$timeout',
    function($scope, $rootScope, $mdDialog, $state, AdminManager, ErrorService, SocketService, $timeout) {
      $scope.loading = false;

      $scope.scanParams = {
        update: false, // updating exists problems (rewrite exists problems)
        insert: true // insert new problems
      };

      $scope.availableSystems = [{
        systemType: 'timus',
        name: 'Timus'
      }, {
        systemType: 'cf',
        name: 'Codeforces'
      }, {
        systemType: 'acmp',
        name: 'ACMP.ru'
      }];
      $scope.selectedSystemType = 'timus';

      $scope.scan = function () {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите произвести сканирование?')
          .ariaLabel('Подтверждение')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          $scope.$emit('data loading');
          var params = $scope.availableSystems.filter(function (value, index) {
            return value.systemType === $scope.selectedSystemType;
          })[0];
          params.insert = $scope.scanParams.insert;
          params.update = $scope.scanParams.update;
          AdminManager.scanProblems(params).then(function (data) {
            console.log(data);
          }).catch(function (error) {
            ErrorService.show(error);
          }).finally(function () {
            $scope.scanning = true;
            $scope.$emit('data loaded');
          });
        });
      };

      $scope.$on('scanner-console.log', function (ev, args) {
        if (args.message === 'finished'
          || args.message.indexOf('error') >= 0) {
          $scope.scanning = false;
        }
        safeApply($scope);
      });

      $scope.systemType = 'all';
      $scope.problems = [];
      $scope.qProblems = '';
      $scope.systems = [{
        type: 'all',
        name: 'Все'
      }, {
        type: 'timus',
        name: 'Timus'
      }, {
        type: 'acmp',
        name: 'ACMP'
      }, {
        type: 'cf',
        name: 'Codeforces'
      }, {
        type: 'sgu',
        name: 'SGU'
      }, {
        type: 'ejudge',
        name: 'ejudge'
      }, {
        type: 'yandex',
        name: 'Яндекс.Контест'
      }, {
        type: 'yandexOfficial',
        name: 'Яндекс.Контест (Official)'
      }];

      $scope.selectedProblems = [];

      var newQ = '';
      $scope.searchProblems = function () {
        newQ = $scope.qProblems;
        return AdminManager.searchProblems({
          q: $scope.qProblems,
          systemType: $scope.systemType
        }).then(function (results) {
          if (newQ !== results.q) {
            return console.log('Skipped result');
          }
          $scope.problems = results.problems.map(function (problem) {
            switch (problem.systemType) {
              case 'cf':
                var pTypeObj = problem.foreignProblemIdentifier.split(':');
                if (!pTypeObj || pTypeObj.length !== 2) {
                  problem.task_number = problem.foreignProblemIdentifier;
                } else {
                  problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                    '. ' + pTypeObj[1];
                }
                break;
              default: {
                problem.task_number = problem.foreignProblemIdentifier;
              }
            }
            return problem;
          });
          return $scope.problems;
        });
      };

      $scope.$watch('qProblems', function () {
        $scope.searchProblems();
      });

      $scope.showProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        $mdDialog.show({
          controller: 'AdminProblemDialogController',
          templateUrl: templateUrl('admin', 'admin-problem-dialog'),
          targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            condition: { ...problem }
          }
        });
      };

      $scope.deleteProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить эту задачу? В случае удаления, эта задача удалится из каждого контеста.')
          .ariaLabel('Confirm dialog')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          return AdminManager.deleteProblem({ problemId: problem.id });
        }).then(function () {
          return $scope.searchProblems();
        });
      };

      $scope.editProblem = function (ev, problem) {
        if (problem) {
          $state.go('admin.problems-edit', { problemId: problem.id });
        }
      };

      $scope.createEjudgeProblem = function (problem) {
        if (problem) {
          AdminManager.createEjudgeProblem(problem)
            .then(function (response) {
              if (response.error) {
                return alert('Error: ' + response.error);
              }
              var newId = response.id;
              if (!newId) {
                return;
              }
              $state.go('admin.problems-edit', { problemId: newId });
            });
        }
      };

      $scope.importAcmpProblem = function (problemId) {
          if (!problemId) {
             return;
          }
          return AdminManager.importAcmpProblem({ problemId }).then(function (response) {
              if (response.error) {
                  return alert('Error: ' + response.error);
              }
              var newId = response.id;
              if (!newId) {
                  return;
              }
              $state.go('problems.item', { problemId: newId });
          });
      };
    }
  ])

  .controller('AdminProblemsItemEditController', ['$scope', '$rootScope', '_', '$mdDialog', '$state', 'AdminManager', 'ContestItemManager', '$sce',
    function($scope, $rootScope, _, $mdDialog, $state, AdminManager, ContestItemManager, $sce) {
      $scope.$emit('change_title', {
        title: 'Редактирование задачи | ' + _('app_name')
      });

      $scope.confirmExit = false;
      $scope.problemId = $state.params.problemId;

      $scope.action = function(name, ev) {
        var actions = {
          exit: exitAction,
          save: saveAction,
          polygonify
        };
        if (name && name in actions) {
          actions[name].call(this, ev);
        }
      };

      function exitAction(ev) {
        $state.go('admin.problems');
      }

      function polygonify(ev) {
        let htmlStatement = $scope.condition.htmlStatement;
        let $html = $( htmlStatement );
        if (!$html.find('.task__my-problem-statement').length) {
          $html = $('<div class="task__my-problem-statement"></div>').prepend($html);
          $html = $('<div></div>').prepend($html);
        }
        $html.find('*').each(function () {
          let $this = $(this);
          if (!this.className.includes('task__my-')) {
            let classes = $this.attr('class');
            if (!classes) {
              return;
            }
            classes = classes.split(' ');
            for (let j = 0; j < classes.length; ++j) {
              classes[j] = 'task__my-' + classes[j];
            }
            $this.attr('class', classes.join(' '));
          }
        });
        htmlStatement = $html.html();
        $scope.condition.htmlStatement = htmlStatement;
      }

      function saveAction(ev) {
        syncWithCondition();
        $scope.confirmExit = false;
        AdminManager.updateCondition($scope.condition)
          .then(function (res) {
            if (res.error) {
              return alert('Произошла ошибка: ' + res.error);
            }
            $mdDialog.show(
              $mdDialog.alert()
                .clickOutsideToClose(true)
                .title('Сохранено')
                .textContent('Действие выполнено успешно.')
                .ariaLabel('Saved')
                .ok('Ок')
                .targetEvent(ev)
            );
          });
      }

      $scope.settings = {
        replace: false,
        merge: true,
        mode: {
          own: false,
          original: true
        },
        files_location: 'top',
        files_show_embed: true,
        files: [],
        content: {
          text: ''
        }
      };

      $scope.$watch('settings.mode.own', function (newVal, oldVal) {
        $scope.settings.mode.original = !newVal;
        $scope.confirmExit = true;
      });
      $scope.$watch('settings.mode.original', function (newVal, oldVal) {
        $scope.settings.mode.own = !newVal;
        $scope.confirmExit = true;
      });

      $scope.$watch('settings.replace', function (newVal, oldVal) {
        $scope.settings.merge = !newVal;
        $scope.confirmExit = true;
      });
      $scope.$watch('settings.merge', function (newVal, oldVal) {
        $scope.settings.replace = !newVal;
        $scope.confirmExit = true;
      });

      $scope.condition = {};
      $rootScope.$broadcast('data loading');
      AdminManager.getCondition({ problemId: $scope.problemId })
        .then(function (result) {
          $rootScope.$broadcast('data loaded');
          if (result.error) {
            return $state.go('^.problems');
          }
          if (result.attachments
            && Array.isArray( result.attachments.files )) {
            result.attachments.files = result.attachments.files.map(file => {
              if (file.embedUrl) {
                //file.embedUrl = $sce.trustAsResourceUrl(file.embedUrl);
              } else if (file.type === 'pdf' && file.downloadUrl) {
                /*file.embedUrl = $sce.trustAsResourceUrl(
                  file.downloadUrl.replace(/(export=download&)/i, '')
                );*/
                file.embedUrl = file.downloadUrl.replace(/(export=download&)/i, '');
              } else {
                // file.url = $sce.trustAsResourceUrl(file.url);
              }
              return file;
            });
            if (result.attachments.config.files_show_embed) {
              result.attachments.files = result.attachments.files.sort((a, b) => {
                if (a.embedUrl && b.embedUrl) {
                  return 0;
                } else if (b.embedUrl) {
                  return 1;
                }
                return -1;
              });
            }
          }
          result.htmlStatement = result.htmlStatement
            .replace(/(\<\!\–\–\s?google_ad_section_(start|end)\s?\–\–\>)/gi, '');
          $scope.condition = result;
          if (!$scope.condition.htmlStatement.trim()) {
            $scope.condition.htmlStatement = '<br>';
          }
          if (result.attachments.config) {
            $scope.settings.replace = result.attachments.config.replaced;
            $scope.settings.merge = !result.attachments.config.replaced;
            $scope.settings.mode.own = result.attachments.config.replaced;
            $scope.settings.mode.original = !result.attachments.config.replaced;
            $scope.settings.files_location = result.attachments.config.files_location;
            $scope.settings.files_show_embed = result.attachments.config.files_show_embed;
            $scope.settings.files = result.attachments.files;
            $scope.settings.content.text = result.attachments.content.text;
          }
        });
      $scope.addFile = function (ev) {
        $(document).scrollTop(0);
        $mdDialog.show({
          controller: 'AddFilesController',
          templateUrl: templateUrl('admin', 'problems/edit-section/add-file'),
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: false,
          locals: {
            '$parentScope': $scope
          }
        });
        $scope.confirmExit = true;
      };

      $scope.deleteFile = function (file) {
        $scope.settings.files.splice(
          $scope.settings.files.reduce(function (acc, cur, i) {
            return cur === file ? i : 0;
          }, 0), 1
        );
        $scope.confirmExit = true;
      };
      $scope.tabIndex = 0;
      $scope.$watch('tabIndex', function (newVal) {
        if (!newVal) {
          return;
        }
        syncWithCondition();
      });

      function syncWithCondition() {
        if (!$scope.condition.attachments.config) {
          $scope.condition.attachments = {};
          $scope.condition.attachments.config = {
            markup: 'markdown'
          };
          $scope.condition.attachments.files = [];
          $scope.condition.attachments.content = {};
        }
        $scope.condition.attachments.config.replaced = $scope.settings.replace;
        $scope.condition.attachments.config.files_location = $scope.settings.files_location;
        $scope.condition.attachments.config.files_show_embed = $scope.settings.files_show_embed;
        $scope.condition.attachments.files = $scope.settings.files;
        $scope.condition.attachments.content.text = $scope.settings.content.text;
      }

      $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams, options) {
        if ($scope.confirmExit) {
          let confirm = window.confirm('Вы действительно хотите выйти без сохранения?');
          if (!confirm) {
            event.preventDefault();
          } else {
            $scope.confirmExit = false;
          }
        }
      })
    }
  ])

  .controller('AddFilesController', ['$scope', '$parentScope', '$mdDialog', function ($scope, $parentScope, $mdDialog) {
      $scope.close = function () {
        $mdDialog.hide();
      };
      $scope.file = {
        type: 'pdf',
        url: '',
        title: 'Statement'
      };
      $scope.save = function () {
        $parentScope.settings.files.push($scope.file);
        $scope.close();
      };

      function detectFileType( mimeType ) {
        const defaultFileType = 'doc';
        if (/(word|ms-word|officedocument|document)/i.test( mimeType )) {
          return 'doc';
        } else if (/(text)/i.test( mimeType )) {
          return 'txt';
        } else if (/(photo|image|jpe?g|png|gif|webp|svg|ico)/i.test( mimeType )) {
          return 'image';
        } else if (/(excel|xls|sheet)/i.test( mimeType )) { // https://stackoverflow.com/questions/974079/setting-mime-type-for-excel-document
          return 'spreadsheet';
        } else if (/(pdf)/i.test( mimeType )) {
          return 'pdf';
        }
        return defaultFileType;
      }

      $scope.onPicked = function (docs) {
        angular.forEach(docs, function (file, index) {
          const {
            url, mimeType, name, embedUrl,
            downloadUrl
          } = file;
          const type = detectFileType( mimeType );
          $parentScope.settings.files.push({
            ...file,
            url: type === 'image' && downloadUrl ? downloadUrl : url,
            type,
            title: name.replace(/(\.[a-z0-9]+)$/i, ''),
          });
        });
        console.log($parentScope.settings.files);
        $scope.close();
      };

      $scope.types = [ 'pdf', 'txt', 'doc', 'image', 'spreadsheet' ];
    }]
  )

  .controller('AdminServerController', ['$scope', '$rootScope', '$mdDialog', '$state', 'AdminManager', '$timeout',
    function($scope, $rootScope, $mdDialog, $state, AdminManager, $timeout) {

      $scope.restart = function () {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите произвести рестарт системы? Перезапуск занимает от 1 до 2 секунд.')
          .ariaLabel('Seriously?')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          $scope.loading = true;
          $scope.$emit('data loading');

          AdminManager.restart().then(function (data) {
            $timeout(function () {
              $scope.loading = false;
            }, 2000);
            $scope.$emit('data loaded');
            if (data.error) {
              return alert('Произошла ошибка: ' + data.error);
            }
          });
        });
      };
    }
  ])

  .controller('AdminServerStatusController', ['$scope', '$rootScope', '$interval', '$mdDialog', '$state', 'AdminManager', '$timeout',
    function($scope, $rootScope, $interval, $mdDialog, $state, AdminManager, $timeout) {

      let lastHash = '';

      async function updateStatus() {
        let systems = await AdminManager.getServerStatus();
        let newHash = computeHash(JSON.stringify(systems));
        if (lastHash !== newHash) {
          $scope.systems = systems;
          lastHash = newHash;
        }
      }

      function computeHash( content ) {
        return md5(content);
      }

      updateStatus();
      let promise = $interval(updateStatus, 500);


      $scope.$on('$destroy', _ => {
        $interval.cancel(promise);
      });
    }
  ])

  /* Base rating controller */
  .controller('AdminRatingBaseController', ['$scope', '$rootScope', '$state', 'AdminManager',
    function($scope, $rootScope, $state, AdminManager) {}
  ])

  /* Base create rating controller */
  .controller('AdminRatingCreateBaseController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService', '$mdToast',
    function($scope, $rootScope, $state, AdminManager, _, ErrorService, $mdToast) {
      $scope.$emit('change_title', {
        title: 'Создание рейтинга | ' + _('app_name')
      });

      $scope.isComputing = false;
      $scope.computeRatings = function () {
        $scope.isComputing = true;
        var toast = $mdToast.simple()
          .hideDelay(2000)
          .textContent('Рейтинги для всех групп будут обновлены в течение 2-3 минут')
          .action('OK')
          .parent(document.querySelector('.notifications'))
          .highlightAction(true)
          .highlightClass('md-warn')
          .position('top right');

        $mdToast.show(toast).catch(function (error) {
          console.log('Toast rejected');
        });
        return AdminManager.computeRatings().catch(function (err) {
          ErrorService.show(err);
        }).finally(function () {
          $scope.isComputing = false;
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

      $scope.createRating = function () {
        if (!$scope.selectedContests.length) {
          return;
        }
        $state.go('admin-contests-rating-table', {
          contests: $scope.selectedContests.map(function (contest) {
            return contest.id;
          }).join(',')
        });
      };
    }
  ])

  .controller('AdminRatingCreateController', ['$scope', '$rootScope', '$state', 'AdminManager', 'ContestsManager', '_',
    function($scope, $rootScope, $state, AdminManager, ContestsManager, _) {
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

      $scope.$on('admin update contest list', function () {
        updateContestsList();
      })
    }
  ])

  .controller('AdminRatingTableController', ['$scope', '$rootScope', '$state', 'AdminManager', '_',
    function($scope, $rootScope, $state, AdminManager, _) {
      $scope.$emit('change_title', {
        title: 'Рейтинг | ' + _('app_name')
      });

      var contestIds = ( $state.params.contests || '' ).split( ',' ) || [ ];

      contestIds = contestIds.map(function (element) {
        return +element;
      }).filter(function (element) {
        return typeof element === 'number' && element > 0;
      });

      if (!contestIds.length) {
        return $state.go('admin.contests-rating.create.index');
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

  .controller('AdminGroupsBaseController', ['$scope', '$rootScope', '$state', 'AdminManager', '_',
    function($scope, $rootScope, $state, AdminManager, _) {
      $scope.$emit('change_title', {
        title: 'Группы пользователей | ' + _('app_name')
      });
    }
  ])

  .controller('AdminGroupsController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', '$mdDialog', 'ErrorService',
    function($scope, $rootScope, $state, AdminManager, _, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Группы пользователей | ' + _('app_name')
      });

      var defaultCount = 10;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount
      };

      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.groups = [];
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
        updateGroupsList();
      });

      function updateGroupsList() {
        $rootScope.$broadcast('data loading');
        var contestsPromise = AdminManager.getGroups($scope.params);
        contestsPromise.then(function (result) {
          $rootScope.$broadcast('data loaded');
          if (!result || !result.hasOwnProperty('groupsNumber')) {
            return;
          }
          $scope.all_items_count = result.groupsNumber;
          $scope.groups = result.groups;
          $scope.pagination = generatePaginationArray(5);
        }).catch(function (err) {
          console.log(err);
        });
      }

      updateGroupsList();

      $scope.deleteGroup = function (ev, group) {
        if (!group) {
          return;
        }
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить группу?')
          .ariaLabel('Lucky day')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          $rootScope.$broadcast('data loading');
          AdminManager.deleteGroup({ groupId: group.id })
            .then(function (result) {
              $rootScope.$broadcast('data loaded');
              if (result.error) {
                return alert('Произошла ошибка: ' + result.error);
              }
              updateGroupsList();
            });
        });
      };

      $scope.copyLink = group => {
        $rootScope.$broadcast('data loading');
        return AdminManager.createGroupRegisterLink({ groupId: group.id }).then(result => {
          $rootScope.$broadcast('data loaded');
          let link = `${location.protocol}//${location.host}/auth/register?groupKey=${result.registerKey}`;
          copyTextToClipboard(link, () => alert('Ссылка скопирована!'));
        }).catch(error => {
          ErrorService.show(error);
        });
      };
    }
  ])

  .controller('AdminGroupsCreateController', ['$scope', '$rootScope', '$state', 'AdminManager', '_',
    function($scope, $rootScope, $state, AdminManager, _) {
      $scope.$emit('change_title', {
        title: 'Создания группы | ' + _('app_name')
      });

      $scope.group = {
        color: '#EF9A9A',
        users: []
      };

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var group = angular.copy($scope.group);
        group.users = group.users.map(function (item) {
          return item.id;
        });
        var data = {
          userIds: group.users,
          name: group.name,
          color: group.color
        };
        AdminManager.createGroup(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            if (!result || result.error) {
              return alert('Произошла ошибка ' + result.error);
            }
            $state.go('admin.groups.index');
          });
      };

      $scope.$on('users sync', function (e, args) {
        $scope.group.users = args.users;
      });
    }
  ])

  .controller('AdminGroupsUserControlController', ['$scope', '$rootScope', '$state', 'AdminManager', '_',
    function($scope, $rootScope, $state, AdminManager, _) {

      var defaultCount = 10;

      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount
      };

      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.users = [];
      $scope.selectedUsers = [];
      $scope.allPages = 0;
      $scope.searchUserText = '';

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
        curPage = Math.max(Math.min(curPage, allPages), 1);
        if (curPage !== $scope.pageNumber) {
          $scope.setPageNumber(null, curPage);
        }
        for (var cur = Math.max(curPage - backOffsetPages, 1);
             cur <= Math.min(curPage + upOffsetPages, allPages); ++cur) {
          pages.push({
            number: cur,
            active: cur === curPage
          });
        }
        return pages;
      }

      function updateUsersList() {
        var requestPromise;
        if (!$scope.searchUserText) {
          requestPromise = AdminManager.getUsers($scope.params);
        } else {
          var params = angular.extend($scope.params, {
            q: $scope.searchUserText
          });
          requestPromise = AdminManager.searchUsers(params);
        }
        requestPromise.then(function (result) {
          if (!result || !result.hasOwnProperty('usersNumber')) {
            return;
          }
          $scope.all_items_count = result.usersNumber;
          $scope.users = result.users;
          $scope.pagination = generatePaginationArray(5);
        }).catch(function (err) {
          console.log(err);
        });
      }

      updateUsersList();

      $scope.searchUsers = function (ev, q) {
        $scope.searchUserText = q;
        updateUsersList();
      };

      $scope.setPageNumber = function (ev, pageNumber) {
        $scope.pageNumber = pageNumber;
        $scope.params.offset = (pageNumber - 1) * defaultCount;
        updateUsersList();
      };

      $scope.existsUser = function (user, selected) {
        return selected.some(function (item) {
          return item.id === user.id;
        });
      };

      $scope.toggleUser = function (user, selected) {
        var foundUserIndex, foundUser = selected.filter(function (item, index) {
          if (item.id === user.id) {
            foundUserIndex = index;
            return true;
          }
          return false;
        });
        if (foundUser.length && foundUserIndex !== undefined) {
          $scope.selectedUsers.splice(foundUserIndex, 1);
        } else {
          $scope.selectedUsers.push( user );
        }
        $scope.sync();
      };

      $scope.onSwipeLeft = function () {
        var tabIndexLimit = 1;
        $scope.selectedIndex = $scope.selectedIndex < tabIndexLimit ?
        $scope.selectedIndex + 1 : $scope.selectedIndex;
      };

      $scope.onSwipeRight = function () {
        $scope.selectedIndex = $scope.selectedIndex > 0 ?
        $scope.selectedIndex - 1 : $scope.selectedIndex;
      };

      $scope.sync = function () {
        $scope.$emit('users sync', {
          users: $scope.selectedUsers
        });
      };

      $scope.$on('users sync', function (e, args) {
        $scope.selectedUsers = args.users;
      });
    }
  ])

  .controller('AdminGroupsEditController', ['$scope', '$rootScope', '$state', 'AdminManager', '_',
    function($scope, $rootScope, $state, AdminManager, _) {
      $scope.$emit('change_title', {
        title: 'Редактирование группы | ' + _('app_name')
      });

      var groupId = $state.params.groupId;
      $scope.group = {
        color: '#EF9A9A',
        users: []
      };

      $scope.links = [];

      $scope.createLink = _ => {
        return AdminManager.createGroupRegisterLink({ groupId: groupId }).then(link => {
          $scope.copyLink( link );
          return AdminManager.getGroupRegisterLinks({ groupId });
        }).then(links => {
          $scope.links = links;
        });
      };

      $scope.copyLink = link => {
        const text = `${location.protocol}//${location.host}/auth/register?groupKey=${link && link.registerKey}`;
        copyTextToClipboard(text, () => alert('Ссылка скопирована!'))
      };

      $scope.revokeLink = link => {
        return AdminManager.deleteGroupRegisterLink({ groupId: groupId, linkUuid: link.uuid }).then(_ => {
          return AdminManager.getGroupRegisterLinks({ groupId });
        }).then(links => {
          $scope.links = links;
        });
      };

      function fetchGroupData() {
        $rootScope.$broadcast('data loading');
        AdminManager.getGroup({ groupId: groupId }).then(function (result) {
          $rootScope.$broadcast('data loaded');
          if (result.error) {
            return alert('Произошла ошибка: ' + result.error);
          }
          $scope.group = result.group;
          $scope.group.users = result.users;
          if (result.users.length) {
            $scope.selectedIndex = 1;
          }
          $scope.$broadcast('users sync', {
            users: $scope.group.users
          });

          return AdminManager.getGroupRegisterLinks({ groupId });
        }).then(links => {
          $scope.links = links;
        });
      }

      fetchGroupData(); // initialize

      $scope.submitForm = function () {
        $rootScope.$broadcast('data loading');
        var group = angular.copy($scope.group);
        group.groupId = groupId;
        group.users = group.users.map(function (item) {
          return item.id;
        });
        var data = {
          userIds: group.users,
          name: group.name,
          color: group.color,
          groupId: group.groupId
        };
        AdminManager.updateGroup(data)
          .then(function (result) {
            $rootScope.$broadcast('data loaded');
            if (!result || result.error) {
              return alert('Произошла ошибка ' + result.error);
            }
            $state.go('admin.groups.index');
          });
      };
    }
  ])

  .controller('AdminAddProblemDialogController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', '$mdDialog', 'ErrorService', '$q',
    function($scope, $rootScope, $state, AdminManager, _, $mdDialog, ErrorService, $q) {
      var contestId = $state.params.contestId;
      $scope.close = function () {
        $mdDialog.hide();
      };
      $scope.save = function () {
        var data = {
          contestId: contestId,
          problemIds: ($scope.selectedProblems || []).map(function (problem) {
            return problem.id;
          })
        };
        $rootScope.$broadcast('data loading');
        return AdminManager.setProblemsForContest(data).then(function () {
          $scope.close();
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $rootScope.$broadcast('data loaded');
        });
      };

      $scope.indexGenerator = function (index) {
        var alphabetLength = 26, symbolIndex = '';
        while (index >= 0) {
          symbolIndex += String.fromCharCode( index % alphabetLength + 0x61 );
          index = Math.floor(index / alphabetLength) - 1;
        }
        return symbolIndex.split('').reverse().join('');
      };

      $scope.systemType = 'all';
      $scope.problems = [];
      $scope.qProblems = '';
      $scope.systems = [{
        type: 'all',
        name: 'Все'
      }, {
        type: 'timus',
        name: 'Timus'
      }, {
        type: 'acmp',
        name: 'ACMP'
      }, {
        type: 'cf',
        name: 'Codeforces'
      }, {
        type: 'sgu',
        name: 'SGU'
      }, {
        type: 'ejudge',
        name: 'ejudge'
      }, {
        type: 'yandex',
        name: 'Яндекс.Контест'
      }, {
        type: 'yandexOfficial',
        name: 'Яндекс.Контест (Official)'
      }];

      $scope.selectedProblems = [];

      var newQ = '';
      $scope.dataLoading = false;
      var currentOutgoingRequest;

      $scope.searchProblems = function () {
        newQ = $scope.qProblems;
        if (currentOutgoingRequest) {
          currentOutgoingRequest.resolve();
        }
        currentOutgoingRequest = $q.defer();
        $scope.dataLoading = true;
        AdminManager.searchProblems({
          q: $scope.qProblems,
          systemType: $scope.systemType
        }, {
          timeout: currentOutgoingRequest.promise
        }).then(function (results) {
          if (newQ !== results.q) {
            return console.log('Skipped result');
          }
          currentOutgoingRequest = null;
          $scope.dataLoading = false;
          $scope.problems = results.problems.map(function (problem) {
            switch (problem.systemType) {
              case 'cf':
                var pTypeObj = problem.foreignProblemIdentifier.split(':');
                if (!pTypeObj || pTypeObj.length !== 2) {
                  problem.task_number = problem.foreignProblemIdentifier;
                } else {
                  problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                    '. ' + pTypeObj[1];
                }
                break;
              default: {
                problem.task_number = problem.foreignProblemIdentifier;
              }
            }
            return problem;
          });
        }).catch(function (error) {
          if (error.status !== -1) {
            ErrorService.show(error, {
              parentSelector: 'md-dialog-content'
            });
          }
        });
      };

      $scope.$watch('qProblems', function () {
        $scope.searchProblems();
      });

      $scope.$watch('systemType', function () {
        $scope.searchProblems();
      });

      $scope.existsProblem = function (problem, selectedProblems) {
        return selectedProblems.some(function (curProblem) {
          return curProblem.id === problem.id;
        });
      };

      $scope.toggleProblem = function (problem, selectedProblems) {
        var exists = $scope.existsProblem(problem, selectedProblems);
        if (exists) {
          selectedProblems.forEach(function (curProblem, index) {
            if (curProblem.id === problem.id) {
              selectedProblems.splice(index, 1);
            }
          });
        } else {
          selectedProblems.push(problem);
        }
      };

      $scope.showProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        $mdDialog.show({
          controller: 'AdminProblemDialogController',
          templateUrl: templateUrl('admin', 'admin-problem-dialog'),
          targetEvent: ev,
          clickOutsideToClose: true,
          locals: {
            condition: { ...problem }
          }
        });
      };
      $scope.deleteProblem = function (ev, problem) {
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;

        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить эту задачу? В случае удаления, эта задача удалится из каждого контеста.')
          .ariaLabel('Confirm dialog')
          .ok('Да')
          .cancel('Отмена');

        $mdDialog.show(confirm).then(function () {
          return AdminManager.deleteProblem({ problemId: problem.id });
        }).then(function () {
          return $scope.searchProblems();
        });
      };
      $scope.isShowingSelected = false;
      $scope.toggleSelected = function (ev) {
        $scope.isShowingSelected = !$scope.isShowingSelected;
        ev.stopPropagation();
        ev.preventDefault();
        ev.cancelBubble = true;
      };

      function getContestInfo() {
        $rootScope.$broadcast('data loading');
        AdminManager.getContestInfo({ contestId: contestId }).then(function (result) {
          $rootScope.$broadcast('data loaded');
          $scope.selectedProblems = result.problems.map(function (problem) {
            switch (problem.systemType) {
              case 'cf':
                var pTypeObj = problem.foreignProblemIdentifier.split(':');
                if (!pTypeObj || pTypeObj.length !== 2) {
                  problem.task_number = problem.foreignProblemIdentifier;
                } else {
                  problem.task_number = (pTypeObj[0] === 'gym' ? 'Тренировка' : 'Архив') +
                    '. ' + pTypeObj[1];
                }
                break;
              default: {
                problem.task_number = problem.foreignProblemIdentifier;
              }
            }
            return problem;
          });
        }).catch(function (result) {
          ErrorService.show(result);
        });
      }

      getContestInfo();
    }
  ])
;