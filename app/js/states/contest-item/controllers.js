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

angular.module('Qemy.controllers.contest-item', [])
  
  .controller('ContestItemBaseController', ['$scope', '$rootScope', '$state', 'ContestsManager', '_', 'SocketService', 'Battery', '$mdToast', '$mdSidenav', '$log', '$timeout', 'ErrorService',
    function ($scope, $rootScope, $state, ContestsManager, _, SocketService, Battery, $mdToast, $mdSidenav, $log, $timeout, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Контест | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      $scope.contest = {};
      
      function updateContest() {
        $rootScope.$broadcast('data loading');
        ContestsManager.canJoin({contestId: contestId}).then(function (response) {
          if (!response || !response.can || !response.joined) {
            $rootScope.$broadcast('data loaded');
            $state.go('index');
            return ErrorService.showMessage('You have no permissions');
          }
          console.log('Доступ к контесту разрешен. Идет загрузка данных...');
          ContestsManager.getContest({contestId: contestId}).then(function (response) {
            $rootScope.$broadcast('data loaded');
            if (!response) {
              $state.go('contests.list');
            }
            $scope.contest = contestFill(response.contest);
            $scope.$broadcast('contest loaded', {
              contest: response.contest
            });
            $rootScope.$broadcast('header expand open', {
              contest: response.contest
            });
          }).catch(function (result) {
            $rootScope.$broadcast('data loaded');
            $state.go('index');
            ErrorService.show(result);
          });
        }).catch(function (result) {
          $rootScope.$broadcast('data loaded');
          $state.go('index');
          ErrorService.show(result);
        });
      }
      updateContest();
      
      $scope.updateContest = updateContest;
      
      function contestFill(contest) {
        function getMonthName(num) {
          num = num || 0;
          if (num < 0 || num > 12) {
            num = 0;
          }
          var month = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
            'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
          return month[num];
        }
        
        function zeroFill(num) {
          return num >= 0 && num < 10 ? '0' + num : num;
        }
        
        function formatDate(timeMs) {
          var curDate = new Date(timeMs);
          return [curDate.getHours(), curDate.getMinutes(), curDate.getSeconds()]
              .map(zeroFill)
              .join(':') + ' ' +
            zeroFill(curDate.getDate()) + ' ' + getMonthName(curDate.getMonth()) +
            ' ' + zeroFill(curDate.getFullYear());
        }
        
        contest.startDate = formatDate(contest.startTimeMs);
        contest.finishDate = formatDate(contest.absoluteDurationTimeMs);
        contest.finishPracticeDate = formatDate(contest.absolutePracticeDurationTimeMs);
        
        return contest;
      }
      
      var socketId,
        verdictUpdatesListener,
        newSolutionListener,
        tableUpdatesListener,
        messagesUpdatesListener,
        solutionResetListener;
      
      SocketService.onConnect(function () {
        socketId = SocketService.getSocket().id;
        console.log('Connected:', socketId);
        
        SocketService.joinContest(contestId);
        
        SocketService.getSocket().on('reconnect', function (data) {
          console.log('Reconnected', SocketService.getSocket().id);
          setTimeout(function () {
            SocketService.joinContest(contestId);
          }, 500);
          //attachEvents();
        });
        
        attachEvents();
      });
      
      function attachEvents() {
        verdictUpdatesListener = SocketService.setListener('verdict updated', function (data) {
          $rootScope.$broadcast('verdict updated', data);
        });
        newSolutionListener = SocketService.setListener('new solution', function (data) {
          $rootScope.$broadcast('new solution', data);
        });
        tableUpdatesListener = SocketService.setListener('table update', function () {
          $rootScope.$broadcast('table update');
        });
        messagesUpdatesListener = SocketService.setListener('new message', function () {
          $rootScope.$broadcast('inbox.messages.update');
        });
        solutionResetListener = SocketService.setListener('reset solution', function (data) {
          $rootScope.$broadcast('reset solution', data);
        });
      }
      
      function removeEvents() {
        try {
          verdictUpdatesListener.removeListener();
          newSolutionListener.removeListener();
          tableUpdatesListener.removeListener();
          messagesUpdatesListener.removeListener();
          solutionResetListener.removeListener();
        } catch (err) {
          console.log(err);
        }
      }
      
      $scope.$on('$destroy', function () {
        $rootScope.$broadcast('header expand close');
        $rootScope.$broadcast('inbox.messages.update-numbers', {
          unreadMessagesNumber: 0,
          allMessagesNumber: 0
        });
        SocketService.leaveContest(contestId);
        Battery.dispose();
        removeEvents();
      });
      
      var batteryLowEventDispatched = false;
      if (Battery.supported) {
        Battery.setOnLevelChangeListener(function (event) {
          if (!event || !event.target || !event.target.level
            || event.target.charging || !event.target.dischargingTime) {
            return;
          }
          var level = event.target.level,
            dischargingTime = Number.isNaN(event.target.dischargingTime) ? 0 : event.target.dischargingTime;
          if (level < 1) {
            level *= 100;
          }
          if (level <= 15 && !batteryLowEventDispatched) {
            $rootScope.$broadcast( 'battery level low', { level: level, dischargingTime: dischargingTime } );
          }
        });
      }
      
      $scope.$on('battery level low', function (ev, args) {
        var position = [ 'left', 'bottom' ];
        var toast = $mdToast.show({
          hideDelay: 20000,
          parent: document.body,
          templateUrl: templateUrl('contest-item/toast', 'battery-charge-low'),
          controller: ['$scope', function ($scope) {
            $scope.dischargingTime = Date.now() + (args.dischargingTime || 0) * 1000;
            $scope.closeToast = function() {
              $mdToast.hide();
            };
          }],
          position: position.join(' ')
        });
        
        toast.then(function(response) {
          if ( response == 'ok' ) {
            batteryLowEventDispatched = true;
          }
        });
      });
      
      $timeout(function () {
        $rootScope.$broadcast('inbox.messages.update');
      });
      
      $scope.$on('toggleRightSidenav', function (ev, args) {
        $scope.toggleRight();
      });
      
      $scope.isOpenRightSidenav = function(){
        return $mdSidenav('right').isOpen();
      };
      
      $scope.toggleRight = buildToggler('right');
      
      /**
       * Supplies a function that will continue to operate until the
       * time is up.
       */
      function debounce(func, wait, context) {
        var timer;
        return function debounced() {
          var context = $scope,
            args = Array.prototype.slice.call(arguments);
          $timeout.cancel(timer);
          timer = $timeout(function() {
            timer = undefined;
            func.apply(context, args);
          }, wait || 10);
        };
      }
      
      /**
       * Build handler to open/close a SideNav; when animation finishes
       * report completion in console
       */
      function buildDelayedToggler(navID) {
        return debounce(function() {
          $mdSidenav(navID)
            .toggle()
            .then(function () {
              $log.debug("toggle " + navID + " is done");
            });
        }, 200);
      }
      
      function buildToggler(navID) {
        return function() {
          $mdSidenav(navID)
            .toggle()
            .then(function () {
              $log.debug("toggle " + navID + " is done");
            });
        }
      }
  
      $rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams, options) {
        var body = $("html, body");
        body.stop().animate({ scrollTop: 0 }, '200', 'swing', function() {
          console.log("Finished animating");
        });
      })
    }
  ])
  
  .controller('ContestItemController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_',
    function ($scope, $rootScope, $state, ContestItemManager, _) {
      $scope.$emit('change_title', {
        title: 'Информация о контесте | ' + _('app_name')
      });
      console.log('Основной контроллер для контеста. Информация.');
    }
  ])
  
  .controller('ContestItemMonitorController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, UserManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Таблица результатов | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      $scope.contestTable = {};
      $scope.user = {};
      $scope.loadingData = false;
      
      function updateTable(withoutLoading) {
        if (!withoutLoading) {
          $rootScope.$broadcast('data loading');
          $scope.loadingData = true;
        }
        ContestItemManager.getTable({contestId: contestId}).then(function (result) {
          $scope.loadingData = false;
          $scope.contestTable = result;
          UserManager.getCurrentUser().then(function (user) {
            $rootScope.$broadcast('data loaded');
            $scope.user = user;
          }).catch(function (result) {
            $rootScope.$broadcast('data loaded');
            ErrorService.show(result)
          });
        }).catch(function (result) {
          $rootScope.$broadcast('data loaded');
          ErrorService.show(result);
        });
      }
      updateTable();
      $scope.updateTable = updateTable;
      
      $scope.disableUpdating = false;
      
      $scope.$on('table update', function () {
        if (!$scope.disableUpdating) {
          updateTable(true);
        }
      });
      
      $scope.openStatusDialog = function (ev, cell, user) {
        if (!cell || !cell.task || cell.result === '—'
          || !user || !user.id) {
          return;
        }
        var userId = user.id,
          problemIndex = cell.task;
        cell._loading = true;
        
        ContestItemManager.getSentsForCell({
          contestId: contestId,
          userId: userId,
          symbolIndex: problemIndex
        }).then(function (response) {
          cell._loading = false;
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
        });
      };
    }
  ])
  
  .controller('ContestItemConditionsController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, UserManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Условия | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      $scope.conditions = {};
      $rootScope.$broadcast('data loading');
      ContestItemManager.getConditions({ contestId: contestId }).then(function (result) {
        $rootScope.$broadcast('data loaded');
        $scope.conditions = result;
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
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
            condition: problem
          }
        });
      };
      
      $scope.user = {};
      UserManager.getCurrentUser().then(function (user) {
        $scope.user = user;
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
      });
    }
  ])
  
  .controller('ConditionsItemController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$mdMedia', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, $mdMedia, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Условия | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      var problemId = $state.params.problemIndex;
      $scope.condition = {};
      $rootScope.$broadcast('data loading');
      ContestItemManager.getCondition({ contestId: contestId, symbolIndex: problemId }).then(function (result) {
        $rootScope.$broadcast('data loaded');
        result.htmlStatement = result.htmlStatement
          .replace(/(\<\!\–\–\s?google_ad_section_(start|end)\s?\–\–\>)/gi, '');
        $scope.condition = result;
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
        $state.go('^.conditions');
      });
      
      $scope.openImage = function (ev, file) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        $mdDialog.show({
          controller: ['$scope', function ($scope) {
            $scope.file = file;
            $scope.close = function () {
              $mdDialog.hide();
            };
          }],
          template: '<md-dialog aria-label="Image"  ng-cloak>\n  <form>\n    <md-toolbar>\n      <div class="md-toolbar-tools">\n        <h2>{{file.title ? file.title : "Изображение"}}</h2>\n        <span flex></span>\n        <md-button class="md-icon-button" ng-click="close()">\n          <md-icon md-svg-src="/img/icons/ic_close_48px.svg" aria-label="Close dialog"></md-icon>\n        </md-button>\n      </div>\n    </md-toolbar>\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <img class="markdown__image" ng-src="{{file.url}}" title="{{file.title}}">\n      </div>\n    </md-dialog-content>\n    <md-dialog-actions layout="row">\n      <md-button style="margin-right: 20px;" ng-click="close()">\n        Закрыть\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true
        });
        
        ev.preventDefault();
        return false;
      };
    }
  ])
  
  .controller('ContestItemSendController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'Storage', 'Upload', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, Storage, Upload, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Отправить решение | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      $scope.conditions = [];
      $scope.selectedCondition = $state.params.problemIndex;
      $scope.currentLangs = [];
      $scope.selectedLangId = null;
      
      var curLang = {};
      
      $scope.$watch('selectedCondition', function (newValue, oldValue) {
        if (!newValue) {
          return;
        }
        Storage.get('selected_problems').then(function (selectedProblems) {
          selectedProblems = selectedProblems || {};
          selectedProblems[ 'contest' + contestId ] = $scope.selectedCondition;
          Storage.set({ selected_problems: selectedProblems });
        });
        
        $rootScope.$broadcast('data loading');
        ContestItemManager.getLangs({
          contestId: contestId,
          symbolIndex: $scope.selectedCondition
        }).then(function (result) {
          $rootScope.$broadcast('data loaded');
          $scope.currentLangs = result;
          if (result.length) {
            curLang.type = result[0].systemType;
          }
          Storage.get('system_langs').then(function (system_langs) {
            if (!system_langs || typeof system_langs !== 'object') {
              return $scope.selectedLangId = result && result.length ?
                result[0].id : null;
            }
            var langId = system_langs[ curLang.type ];
            if (!langId) {
              return $scope.selectedLangId = result && result.length ?
                result[0].id : null;
            }
            $scope.selectedLangId = langId;
          });
        }).catch(function (result) {
          $rootScope.$broadcast('data loaded');
          ErrorService.show(result);
        });
      });
      
      $scope.$watch('selectedLangId', function (newVal, oldVal) {
        curLang.id = newVal;
        if (newVal == oldVal) {
          return;
        }
        Storage.get('system_langs').then(function (system_langs) {
          if (!system_langs || typeof system_langs !== 'object') {
            system_langs = {};
          }
          if (!curLang.id || !curLang.type) {
            return;
          }
          system_langs[ curLang.type ] = curLang.id;
          Storage.set({ system_langs: system_langs });
        });
      });
      
      $rootScope.$broadcast('data loading');
      ContestItemManager.getConditions({ contestId: contestId }).then(function (result) {
        $rootScope.$broadcast('data loaded');
        $scope.conditions = result;
        Storage.get('selected_problems').then(function (selectedProblems) {
          selectedProblems = selectedProblems || {};
          if (!('contest' + contestId in selectedProblems)) {
            $scope.selectedCondition = $state.params.problemIndex || 'A';
            selectedProblems[ 'contest' + contestId ] = $scope.selectedCondition;
            Storage.set({ selected_problems: selectedProblems });
          } else {
            var curProblemIndex = selectedProblems[ 'contest' + contestId ];
            $scope.selectedCondition = $state.params.problemIndex || curProblemIndex || 'A';
          }
        });
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
      });
      
      $scope.solution = '';
      $scope.sent = false;
      
      $scope.submitSolution = function () {
        var solution = $scope.solution,
          condition = $scope.selectedCondition;
        if (!solution || !condition || !contestId) {
          return;
        }
        $rootScope.$broadcast('data loading');
        $scope.sent = true;
        
        ContestItemManager.sendSolution({
          contestId: contestId,
          symbolIndex: condition,
          solution: solution,
          languageId: $scope.selectedLangId
        }).then(function (result) {
          $rootScope.$broadcast('data loaded');
          $scope.sent = false;
          $state.go('^.status', { select: 'my' });
        }).catch(function (result) {
          $scope.sent = false;
          $rootScope.$broadcast('data loaded');
          ErrorService.show(result);
        });
      };
      
      // upload on file select or drop
      $scope.upload = function (file) {
        Upload.upload({
          url: '/api/contest/' + contestId + '/pipe',
          data: {
            file: file
          }
        }).then(function (resp) {
          console.log('Success ' + resp.config.data.file.name + 'uploaded.');
          $scope.solution = resp.data;
        }, function (result) {
          console.log('Error status: ' + result);
        }, function (evt) {
          var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
          console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        }).catch(function (result) {
          ErrorService.show(result);
        });
      };
    }
  ])
  
  .controller('ContestItemStatusController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$timeout', '$interval', 'UserManager', '$mdDialog', '$mdBottomSheet', 'AdminManager', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, $timeout, $interval, UserManager, $mdDialog, $mdBottomSheet, AdminManager, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Мои посылки | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      var select = $state.params.select;
      var defaultCount = 15;
      
      $scope.pageNumber = parseInt($state.params.pageNumber || 1);
      $scope.params = {
        contestId: contestId,
        count: defaultCount,
        offset: ($scope.pageNumber - 1) * defaultCount,
        select: select
      };
      
      $scope.all_items_count = 0;
      $scope.pagination = [];
      $scope.solutions = [];
      $scope.allPages = 0;
      
      $scope.loadingData = false;
      
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
      
      updateSentsList();
      
      function updateSentsList(page) {
        $rootScope.$broadcast('data loading');
        $scope.loadingData = true;
        ContestItemManager.getSents($scope.params).then(function (result) {
          $timeout(function () {
            $rootScope.$broadcast('data loaded');
            $scope.loadingData = false;
          }, 0);
          if (!result || !result.hasOwnProperty('solutionsNumber')) {
            return;
          }
          $scope.all_items_count = result.solutionsNumber;
          $scope.solutions = result.solutions;
          $scope.pagination = generatePaginationArray(5);
        }).catch(function (result) {
          $rootScope.$broadcast('data loaded');
          ErrorService.show(result);
        });
      }
      
      $scope.showSolutions = function (solutionsType) {
        $scope.selectedTabIndex = solutionsType === 'my' ? 0 : 1;
      };
      
      $scope.selectedTabIndex = select === 'my' ? 0 : 1;
      var firstInvokeStateChanged = true;
      $scope.$watch('selectedTabIndex', function(current, old) {
        if (firstInvokeStateChanged) {
          return (firstInvokeStateChanged = false);
        }
        if (current == old) {
          return;
        }
        $scope.pageNumber = current === old ? ($state.params.pageNumber || 1) : 1;
        $scope.params.offset = ($scope.pageNumber - 1) * defaultCount;
        $scope.params.select = current === 0 ? 'my' : 'all';
        switch (current) {
          case 0: {
            $scope.$emit('change_title', {
              title: 'Мои посылки | ' + _('app_name')
            });
            if ($scope.pageNumber === 1) {
              $state.transitionTo(
                'contest.status',
                { select: 'my' },
                { location: true, inherit: true, relative: $state.$current, notify: false }
              );
            } else {
              $state.transitionTo(
                'contest.status-pagination',
                { select: 'my', pageNumber: $scope.pageNumber },
                { location: true, inherit: true, relative: $state.$current, notify: false }
              );
            }
            break;
          }
          case 1: {
            $scope.$emit('change_title', {
              title: 'Все посылки | ' + _('app_name')
            });
            if ($scope.pageNumber === 1) {
              $state.transitionTo(
                'contest.status',
                { select: 'all' },
                { location: true, inherit: true, relative: $state.$current, notify: false }
              );
            } else {
              $state.transitionTo(
                'contest.status-pagination',
                { select: 'all', pageNumber: $scope.pageNumber },
                { location: true, inherit: true, relative: $state.$current, notify: false }
              );
            }
            break;
          }
        }
        updateSentsList();
      });
      
      $scope.currentUser = {};
      UserManager.getCurrentUser().then(function (user) {
        $scope.currentUser = user;
      }).catch(function (result) {
        ErrorService.show(result);
      });
      
      $scope.$on('verdict updated', function (ev, args) {
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === args.id) {
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
            safeApply($scope);
            break;
          }
        }
      });
      
      $scope.$on('new solution', function (ev, data) {
        //console.log(data);
        var userId = data.userId,
          select = $scope.params.select,
          canSee = !data.author.isAdmin || $scope.currentUser.isAdmin;
        if (select === 'my'
          && userId !== $scope.currentUser.id
          || $scope.pageNumber !== 1 || !canSee) {
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
        name: 'Переотправить все решения для задачи',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_USER',
        name: 'Переотправить все решения для пользователя',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_PROBLEM_AND_USER',
        name: 'Переотправить все решения для задачи и пользователя',
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
              updateSentsList();
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
                updateSentsList();
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
        }).then(function(answer) {
          $scope.status = 'You said the information was "' + answer + '".';
        }, function() {
          $scope.status = 'You cancelled the dialog.';
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
      
      $scope.refreshAllSolutions = function (ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите переотправить все решения в этом контесте?')
          .ariaLabel('Refresh confirmation')
          .ok('Да, хочу')
          .cancel('Отмена')
          .targetEvent(ev);
        $mdDialog.show(confirm).then(function () {
          AdminManager.refreshAllSolutions({ contestId: contestId }).catch(function (result) {
            if (result && result.error) {
              return ErrorService.show(result);
            }
          });
        });
      };
  
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
    }
  ])
  
  .controller('ContestItemCellStatusController', [
    '$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$timeout', 'UserManager', '$mdDialog', '$mdBottomSheet', 'AdminManager', 'solutions', '$originalDialogArgs', '$originalDialogScope', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, $timeout, UserManager, $mdDialog, $mdBottomSheet, AdminManager, solutions, $originalDialogArgs, $originalDialogScope, ErrorService) {
      $scope.close = function () {
        $mdDialog.hide();
      };
  
      $scope.$on('$stateChangeStart', function() {
        $scope.close();
        $mdBottomSheet.hide();
      });
      
      $scope.solutions = solutions;
      
      $scope.currentUser = {};
      UserManager.getCurrentUser().then(function (user) {
        $scope.currentUser = user;
      }).catch(function (result) {
        ErrorService.show(result);
      });
  
      $scope.$on('verdict updated', function (ev, args) {
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === args.id) {
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
            safeApply($scope);
            break;
          }
        }
      });
  
      $scope.$on('new solution', function (ev, data) {
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === data.id) {
            return;
          }
        }
        $scope.solutions.unshift( data );
        safeApply($scope);
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
        name: 'Переотправить все решения для задачи',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_USER',
        name: 'Переотправить все решения для пользователя',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_PROBLEM_AND_USER',
        name: 'Переотправить все решения для задачи и пользователя',
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
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
        
            AdminManager.sendSolutionAgain( { solutionId: item.id } ).catch(function (result) {
              if (result && result.error) {
                return ErrorService.show(result);
              }
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
          });
        }
    
        function sendDuplicateAsAdmin() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeSendDuplicate(ev).then(function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
        
            AdminManager.sendSolutionAgain( { solutionId: item.id, asAdmin: true } ).catch(function (result) {
              ErrorService.show(result);
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
          });
        }
    
        function refreshSolution() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
            AdminManager.refreshSolution( { solutionId: item.id } ).catch(function (result) {
              ErrorService.show(result);
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
          });
        }
    
        function refreshSolutionForProblem() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
            AdminManager.refreshSolutionForProblem( { contestId: item.contestId, symbolIndex: item.internalSymbolIndex } ).catch(function (result) {
              ErrorService.show(result);
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
          });
        }
    
        function refreshSolutionForUser() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
            AdminManager.refreshSolutionForUser( { contestId: item.contestId, userId: item.userId } ).catch(function (result) {
              ErrorService.show(result);
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
          });
        }
    
        function refreshSolutionForProblemAndUser() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeRefreshing(ev).then(function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
            AdminManager.refreshSolutionForProblemAndUser( { contestId: item.contestId, symbolIndex: item.internalSymbolIndex, userId: item.userId } ).catch(function (result) {
              ErrorService.show(result);
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
          });
        }
    
        function deleteSolution() {
          if (!item || typeof item !== 'object') {
            return;
          }
          showConfirmationDialogBeforeDeleting(ev).then(function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
            AdminManager.deleteSolution( { solutionId: item.id } ).catch(function (result) {
              ErrorService.show(result);
            });
          }, function () {
            $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
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
              }).catch(function (result) {
                ErrorService.show(result);
              });
            };
          }],
          templateUrl: templateUrl('contest-item/contest-status', 'contest-verdict-selection-dialog'),
          parent: angular.element(document.body),
          targetEvent: $originalDialogArgs[0],
          clickOutsideToClose: true,
          locals: {
            sentItem: item
          }
        }).then(function(answer) {
          $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
        }, function() {
          $originalDialogScope.openStatusDialog.apply( null, $originalDialogArgs );
        });
      }
  
      function showConfirmationDialogBeforeSendDuplicate(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите отправить это решение еще раз?')
          .ariaLabel('Duplicate confirmation')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent($originalDialogArgs[0]);
        return $mdDialog.show(confirm);
      }
  
      function showConfirmationDialogBeforeRefreshing(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите переотправить?')
          .ariaLabel('Refresh confirmation')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent($originalDialogArgs[0]);
        return $mdDialog.show(confirm);
      }
  
      function showConfirmationDialogBeforeDeleting(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить это решение?')
          .ariaLabel('Delete confirmation')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent($originalDialogArgs[0]);
        return $mdDialog.show(confirm);
      }
  
      function showCompilationErrorDialog($event, solution) {
        $mdBottomSheet.show({
          templateUrl: templateUrl('contest-item/contest-status', 'contest-status-compilation-error-bottom-sheet'),
          controller: 'ContestItemStatusCompilationErrorCtrl',
          locals: {
            solution: solution
          },
          parent: document.querySelector('md-dialog')
        });
      }
      $scope.showCompilationErrorDialog = showCompilationErrorDialog;
    }
  ])
  
  .controller('ContestItemSourceController', ['$scope', '$rootScope', '$state', '$mdDialog', '$mdBottomSheet', 'ContestItemManager', 'UserManager', 'AdminManager', '_', '$timeout', 'ErrorService',
    function ($scope, $rootScope, $state, $mdDialog, $mdBottomSheet, ContestItemManager, UserManager, AdminManager, _, $timeout, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Исходный код | ' + _('app_name')
      });
      
      var contestId = $state.params.contestId;
      var sourceId = $state.params.sourceId;
      $scope.sourceId = sourceId;
      
      $scope.source = null;
      $scope.solutions = [];
      $scope.currentUser = null;
      
      UserManager.getCurrentUser().then(function (user) {
        $scope.currentUser = user;
      }).catch(function (result) {
        ErrorService.show(result)
      });
      
      $rootScope.$broadcast('data loading');
      ContestItemManager.getSourceCode({ contestId: contestId, solutionId: sourceId }).then(function (result) {
        $scope.source = result;
        $scope.solutions.push(result);
        $timeout(function () {
          $rootScope.$broadcast('data loaded');
          if (!Rainbow) {
            var tryRunRainbow = setInterval(function () {
              if (!Rainbow) {
                return;
              }
              Rainbow.color();
              $rootScope.$broadcast('data loaded');
              clearInterval(tryRunRainbow);
            }, 500);
          } else {
            $rootScope.$broadcast('data loaded');
            Rainbow.color();
          }
        }, 200);
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
      });
  
      $scope.$on('verdict updated', function (ev, args) {
        var solutions = $scope.solutions;
        for (var i = 0; i < solutions.length; ++i) {
          if (solutions[i].id === args.id) {
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
            safeApply($scope);
            break;
          }
        }
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
            solutions[i].compilatiorError = null;
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
        name: 'Переотправить все решения для задачи',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_USER',
        name: 'Переотправить все решения для пользователя',
        svgIcon: '/img/icons/ic_restore_48px.svg'
      }, {
        id: 'REFRESH_SOLUTIONS_FOR_PROBLEM_AND_USER',
        name: 'Переотправить все решения для задачи и пользователя',
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
              if (result && result.error) {
                return ErrorService.show(result);
              }
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
            AdminManager.deleteSolution( { solutionId: item.id } ).catch(function (result) {
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
              }).catch(function (result) {
                ErrorService.show(result);
              });
            };
          }],
          templateUrl: templateUrl('contest-item/contest-status', 'contest-verdict-selection-dialog'),
          parent: angular.element(document.body),
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
          .cancel('Отмена');
        return $mdDialog.show(confirm);
      }
  
      function showConfirmationDialogBeforeRefreshing(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите переотправить?')
          .ariaLabel('Refresh confirmation')
          .ok('Да')
          .cancel('Отмена');
        return $mdDialog.show(confirm);
      }
  
      function showConfirmationDialogBeforeDeleting(ev) {
        var confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content('Вы действительно хотите удалить это решение?')
          .ariaLabel('Delete confirmation')
          .ok('Да')
          .cancel('Отмена');
        return $mdDialog.show(confirm);
      }
      
      function showCompilationErrorDialog($event, solution) {
        $mdBottomSheet.show({
          templateUrl: templateUrl('contest-item/contest-status', 'contest-status-compilation-error-bottom-sheet'),
          controller: 'ContestItemStatusCompilationErrorCtrl',
          locals: {
            solution: solution
          },
          parent: document.querySelector('body')
        });
      }
      $scope.showCompilationErrorDialog = showCompilationErrorDialog;
      $scope.$on('$stateChangeStart', function() {
        $mdBottomSheet.hide();
      });
    }
  ])
  
  .controller('RightSidenavCtrl', ['$scope', '$rootScope', '$timeout', '$mdSidenav', '$log', '$state', 'ContestItemManager', 'ErrorService',
    function ($scope, $rootScope, $timeout, $mdSidenav, $log, $state, ContestItemManager, ErrorService) {
      
      $scope.close = function () {
        $mdSidenav('right').close()
          .then(function () {
            $log.debug("close RIGHT is done");
          });
      };
      
      $scope.isOpenRightSidenav = function(){
        return $mdSidenav('right').isOpen();
      };
      
      $scope.$on('toggleRightSidenav', function (ev, args) {
        var isOpenAction = $scope.isOpenRightSidenav();
        if (isOpenAction) {
          $scope.isMessagesLoading = true;
          $timeout(function () {
            $scope.updateMessages(true);
          }, 50);
        }
      });
      
      $scope.$on('inbox.messages.update', function (ev, args) {
        $timeout(function () {
          $scope.updateMessages();
        }, 200);
      });
      
      //first initializing
      $timeout(function () {
        //if contest id is not specified - miss update
        var contestId = $state.params.contestId;
        if (contestId) {
          $scope.updateMessages();
        }
      });
      
      $scope.messages = {
        read: [],
        unread: []
      };
      
      $scope.updateMessages = buildDelayedFunc(function (isImplicitAction) {
        $scope.isMessagesLoading = true;
        var contestId = $state.params.contestId;
        ContestItemManager.getMessages({ contestId: contestId }).then(function (messages) {
          $scope.isMessagesLoading = false;
          $scope.messages = messages;
          $rootScope.$broadcast('inbox.messages.update-numbers', {
            unreadMessagesNumber: (messages.unread || []).length,
            allMessagesNumber: (messages.read || []).length + (messages.unread || []).length
          });
          if (isImplicitAction) {
            ContestItemManager.markAsRead({ contestId: contestId || 1 }).then(function (res) {
              $rootScope.$broadcast('inbox.messages.update-numbers', {
                unreadMessagesNumber: 0
              });
            }).catch(function (result) {
              ErrorService.show(result);
            });
          }
        }).catch(function (result) {
          ErrorService.show(result);
        });
      });
      
      /**
       * Supplies a function that will continue to operate until the
       * time is up.
       */
      function debounce(func, wait, context) {
        var timer;
        return function debounced() {
          var context = $scope,
            args = Array.prototype.slice.call(arguments);
          $timeout.cancel(timer);
          timer = $timeout(function() {
            timer = undefined;
            func.apply(context, args);
          }, wait || 10);
        };
      }
      
      /**
       * Build handler to open/close a SideNav; when animation finishes
       * report completion in console
       */
      function buildDelayedFunc(fn) {
        return debounce(function() {
          fn.apply(this, arguments);
        }, 200);
      }
    }
  ])
  
  .controller('ContestItemStatusCompilationErrorCtrl', ['$scope', '$rootScope', '$timeout', '$mdBottomSheet', '$mdDialog', 'solution',
    function ($scope, $rootScope, $timeout, $mdBottomSheet, $mdDialog, solution) {
      $scope.solution = solution;
      $scope.close = function () {
        $mdBottomSheet.hide();
        $mdDialog.hide();
      };
    }
  ])
  
  .controller('ContestItemMessagesController', ['$scope', '$state', '$rootScope', '$timeout', 'UserManager', 'ErrorService', '$mdDialog', 'ContestItemManager',
    function ($scope, $state, $rootScope, $timeout, UserManager, ErrorService, $mdDialog, ContestItemManager) {
      var defaultForm = {
        message: 'Воспользуйтесь [онлайн Markdown-редактором](https://stackedit.io/editor#) для оформления сообщения \n<code is="math-tex"> n, 1 \\leq  n \\leq  10^{18}</code>\n',
        attachments: {},
        asAdmin: false,
        contestId: $state.params.contestId
      };
      $scope.form = angular.copy(defaultForm);
  
      var defaultSettings = {
        replace: false,
        merge: true,
        mode: {
          own: false,
          original: true
        },
        files_location: 'bottom',
        files: [],
        content: {
          text: ''
        }
      };
      $scope.settings = angular.copy(defaultSettings);
      
      sync();
      
      $scope.sendMessage = function () {
        sync();
        $scope.sent = true;
        ContestItemManager.sendMessage($scope.form).then(function (result) {
          $scope.settings = angular.copy(defaultSettings);
          $scope.form = angular.copy(defaultForm);
          sync();
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $scope.sent = false;
        });
      };
  
      $scope.user = {};
      UserManager.getCurrentUser().then(function (user) {
        $scope.user = user;
      }).catch(function (result) {
        ErrorService.show(result);
      });
  
      $scope.addFile = function (ev) {
        $mdDialog.show({
          controller: ['$scope', '$parentScope', function ($scope, $parentScope) {
            $scope.close = function () {
              $mdDialog.hide();
            };
            $scope.file = {
              type: 'pdf',
              url: 'http://',
              title: 'Название файла'
            };
            $scope.save = function () {
              $parentScope.settings.files.push($scope.file);
              $scope.close();
            };
        
            $scope.types = [ 'pdf', 'txt', 'doc', 'image' ];
          }],
          templateUrl: templateUrl('admin', 'problems/edit-section/add-file'),
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: false,
          locals: {
            '$parentScope': $scope
          }
        });
        $scope.confirmExit = true;
        safeApply($scope);
      };
  
      $scope.deleteFile = function (file) {
        $scope.settings.files.splice(
          $scope.settings.files.reduce(function (acc, cur, i) {
            return cur === file ? i : 0;
          }, 0), 1
        );
        $scope.confirmExit = true;
        safeApply($scope);
      };
  
      function sync() {
        if (!$scope.form.attachments.config) {
          $scope.form.attachments = {};
          $scope.form.attachments.config = {
            markup: 'markdown'
          };
          $scope.form.attachments.files = [];
          $scope.form.attachments.content = {};
        }
        $scope.form.attachments.config.replaced = $scope.settings.replace;
        $scope.form.attachments.config.files_location = $scope.settings.files_location;
        $scope.form.attachments.files = $scope.settings.files;
        $scope.form.attachments.content.text = $scope.settings.content.text;
        console.log($scope.form);
      }
    }
  ])
;