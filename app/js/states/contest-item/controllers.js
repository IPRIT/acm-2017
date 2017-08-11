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

angular.module('Qemy.controllers.contest-item', [
  'Qemy.controllers.contest-item.table'
])
  
  .controller('ContestItemBaseController', ['$scope', '$rootScope', '$state', 'ContestsManager', 'UserManager', '_', 'SocketService', '$mdToast', '$mdSidenav', '$log', '$timeout', 'ErrorService',
    function ($scope, $rootScope, $state, ContestsManager, UserManager, _, SocketService, $mdToast, $mdSidenav, $log, $timeout, ErrorService) {
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
        
        UserManager.getCurrentUser().then(function (user) {
          $scope.user = user;
          SocketService.joinContest(contestId, user.id);
          SocketService.getSocket().on('reconnect', function (data) {
            console.log('Reconnected:', SocketService.getSocket().id);
            $timeout(function () {
              SocketService.joinContest(contestId, user.id);
            }, 500);
          });
          attachEvents();
        }).catch(function (result) {
          ErrorService.show(result);
        });
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
        messagesUpdatesListener = SocketService.setListener('new message', function (data) {
          $rootScope.$broadcast('inbox.messages.update', data);
          $rootScope.$broadcast('new message', data);
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
        SocketService.leaveContest(contestId, $scope.user.id);
        removeEvents();
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
  
  .controller('ContestItemMonitorController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager', '$mdDialog', 'ErrorService', '$mdPanel',
    function ($scope, $rootScope, $state, ContestItemManager, _, UserManager, $mdDialog, ErrorService, $mdPanel) {
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
        return ContestItemManager.getTable({contestId: contestId}).then(function (table) {
          return UserManager.getCurrentUser().then(function (user) {
            $rootScope.$broadcast('data loaded');
            $scope.user = user;
            $scope.contestTable = table;
            $scope.loadingData = false;
          })
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
          || !user || !user.id || (user.id !== $scope.user.id && !$scope.user.isAdmin)) {
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
      
      $scope.showRatingHistory = function (ev, user) {
        $mdDialog.show({
          controller: 'RatingHistoryDialogController',
          templateUrl: templateUrl('contest-item/rating', 'dialog'),
          parent: angular.element(document.body),
          targetEvent: ev,
          locals: {
            user: user
          }
        });
      };
      
      var $panelRef;
      $scope.showMonitorRowMenu = function(ev, user) {
        if ($panelRef && $panelRef.$$state.status === 1) {
          $panelRef.$$state.value.hide();
        }
        var position = $mdPanel.newPanelPosition()
          .relativeTo(ev.currentTarget)
          .addPanelPosition($mdPanel.xPosition.ALIGN_START, $mdPanel.yPosition.BELOW);
        
        $scope.actions = [{
          id: 'SHOW_RATING_HISTORY',
          name: 'Показать рейтинг',
          svgIcon: '/img/icons/ic_trending_up_48px.svg'
        }, {
          id: 'REFRESH_SOLUTIONS_FOR_USER',
          name: 'Переотправить все решения для пользователя',
          svgIcon: '/img/icons/ic_restore_48px.svg'
        }, {
          id: 'PARTICIPANT_DELETE',
          name: 'Удалить из контеста',
          svgIcon: '/img/icons/ic_delete_48px.svg',
          themeClass: 'md-accent'
        }];
        
        var config = {
          attachTo: angular.element(document.body),
          controller: 'MonitorRowMenuCtrl',
          controllerAs: 'ctrl',
          templateUrl: templateUrl('contest-item/contest-monitor', 'row-menu'),
          panelClass: 'contest__monitor-menu',
          position: position,
          locals: {
            actions: $scope.actions,
            user: user
          },
          openFrom: ev,
          clickOutsideToClose: true,
          escapeToClose: true,
          focusOnOpen: false,
          zIndex: 70
        };
        
        $panelRef = $mdPanel.open(config);
      };
    }
  ])

  .controller('ContestItemTableController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager', '$mdDialog', 'ErrorService', '$mdPanel',
    function ($scope, $rootScope, $state, ContestItemManager, _, UserManager, $mdDialog, ErrorService, $mdPanel) {
      $scope.$emit('change_title', {
        title: 'Таблица результатов | ' + _('app_name')
      });
    }
  ])
  
  .controller('ContestItemConditionsController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', 'UserManager', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, UserManager, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Условия | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      $scope.conditions = {};
      
      function fetchProblems() {
        $rootScope.$broadcast('data loading');
        return ContestItemManager.getConditions({ contestId: contestId }).then(function (result) {
          $rootScope.$broadcast('data loaded');
          $scope.conditions = result;
        }).catch(function (result) {
          $rootScope.$broadcast('data loaded');
          ErrorService.show(result);
        });
      }
      
      fetchProblems();
      
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
      
      $scope.addNewProblemDialog = function (ev) {
        $mdDialog.show({
          controller: 'AdminAddProblemDialogController',
          templateUrl: templateUrl('contest-item/contest-conditions', 'add-problem-dialog'),
          targetEvent: ev,
          clickOutsideToClose: false
        }).then(function () {
          return fetchProblems();
        });
      };
    }
  ])
  
  .controller('ConditionsItemController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$mdMedia', '$mdDialog', 'ErrorService',
    function ($scope, $rootScope, $state, ContestItemManager, _, $mdMedia, $mdDialog, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Условие | ' + _('app_name')
      });
      var contestId = $state.params.contestId;
      var problemId = $state.params.problemIndex;
      $scope.condition = {};
      $rootScope.$broadcast('data loading');
      ContestItemManager.getCondition({ contestId: contestId, symbolIndex: problemId }).then(function (result) {
        $rootScope.$broadcast('data loaded');
        result.htmlStatement = (result.htmlStatement || '')
          .replace(/(\<\!\–\–\s?google_ad_section_(start|end)\s?\–\–\>)/gi, '');
        $scope.condition = result;
        console.log(result);
        $scope.$emit('change_title', {
          title: problemId + '. ' + result.title + ' | ' + _('app_name')
        });
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
        $state.go('^.problems');
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
      
      var editor;
      $scope.$on('$destroy', function () {
        if (editor) {
          editor.destroy();
        }
      });
      
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
            setUpAceEditorLanguage(result[0].languageFamily);
          }
          Storage.get('system_langs').then(function (system_langs) {
            if (!system_langs || typeof system_langs !== 'object') {
              $scope.selectedLangId = result && result.length ?
                result[0].id : null;
              var language = findLanguageFamilyById($scope.selectedLangId) || {};
              return setUpAceEditorLanguage(language.languageFamily);
            }
            var langId = system_langs[ curLang.type ];
            if (!langId) {
              $scope.selectedLangId = result && result.length ?
                result[0].id : null;
              language = findLanguageFamilyById($scope.selectedLangId) || {};
              return setUpAceEditorLanguage(language.languageFamily);
            }
            $scope.selectedLangId = langId;
            language = findLanguageFamilyById($scope.selectedLangId) || {};
            setUpAceEditorLanguage(language.languageFamily);
          });
        }).then(function () {
          return restoreSolution();
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
        }).then(function () {
          var language = findLanguageFamilyById(curLang.id) || {};
          return setUpAceEditorLanguage(language.languageFamily);
        });
      });
      
      $rootScope.$broadcast('data loading');
      ContestItemManager.getConditions({ contestId: contestId }).then(function (result) {
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
          $state.go('^.solutions', { select: 'my' });
          clearBackup();
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
          if (editor) {
            editor.setValue($scope.solution);
            goToLastLine();
          }
        }, function (result) {
          console.log('Error status: ' + result);
        }, function (evt) {
          var progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
          console.log('progress: ' + progressPercentage + '% ' + evt.config.data.file.name);
        }).catch(function (result) {
          ErrorService.show(result);
        });
      };
      
      function setUpAceEditor(languageFamily) {
        languageFamily = languageFamily || 'c_cpp';
        editor = ace.edit('text_area_editor');
        editor.setTheme('ace/theme/crimson_editor');
        editor.session.setMode('ace/mode/' + languageFamily);
        editor.setAutoScrollEditorIntoView(true);
        editor.setOptions({
          maxLines: Infinity,
          minLines: 10,
          fontSize: '12pt',
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          spellcheck: true,
          animatedScroll: true,
          tabSize: 4
        });
        editor.on('input', function (ev) {
          $scope.solution = editor.getValue();
          backupSolution($scope.solution);
          safeApply($scope);
        });
        editor.renderer.setScrollMargin(0, 10, 10, 10);
        editor.commands.addCommand({
          name: 'showKeyboardShortcuts',
          bindKey: {win: 'Ctrl-Alt-h', mac: 'Command-Alt-h'},
          exec: function(editor) {
            ace.config.loadModule('ace/ext/keybinding_menu', function(module) {
              module.init(editor);
              editor.showKeyboardShortcuts()
            });
          }
        });
        editor.commands.addCommand({
          name: 'MissTheSaveEvent',
          bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
          exec: function (editor) {
            console.log('Event missed');
          }
        });
        editor.focus();
      }
      
      function setUpAceEditorLanguage(languageFamily) {
        languageFamily = languageFamily || 'c_cpp';
        if (!editor) {
          setUpAceEditor(languageFamily);
        } else {
          editor.session.setMode('ace/mode/' + languageFamily);
        }
      }
      
      function findLanguageFamilyById(id) {
        return ($scope.currentLangs || []).filter(function (language) {
          return language.id === Number(id);
        })[0];
      }
      
      function backupSolution(solution) {
        var key = 'solution_' + contestId;
        var data = {};
        data[ key ] = solution;
        return Storage.set(data);
      }
      
      function clearBackup() {
        var key = 'solution_' + contestId;
        var data = {};
        data[ key ] = '';
        return Storage.set(data);
      }
  
      function restoreSolution() {
        return Storage.get('solution_' + contestId).then(function (solution) {
          $scope.solution = solution || '';
          if (editor) {
            editor.setValue($scope.solution);
            goToLastLine();
          }
          safeApply($scope);
        });
      }
      
      function goToLastLine() {
        if (editor) {
          editor.focus();
          var n = editor.getSession().getValue().split("\n").length;
          editor.gotoLine(n);
        }
      }
    }
  ])
  
  .controller('ContestItemStatusController', ['$scope', '$rootScope', '$state', 'ContestItemManager', '_', '$timeout', '$interval', 'UserManager', '$mdDialog', '$mdBottomSheet', 'AdminManager', 'ErrorService', '$element',
    function ($scope, $rootScope, $state, ContestItemManager, _, $timeout, $interval, UserManager, $mdDialog, $mdBottomSheet, AdminManager, ErrorService, $element) {
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
      $scope.contestId = contestId;
      
      $scope.loadingData = false;

      $element.find('input').on('keydown', function (ev) {
        ev.stopPropagation();
      });

      $scope.clearSearchTerm = function() {
        $scope.searchTerm = '';
        console.log($scope.filterParticipants);
      };

      $scope.filterParticipants = [];
      $scope.participants = [];

      $scope.loadParticipants = function () {
        return ContestItemManager.getParticipants({
          contestId: contestId
        }).then(function (users) {
          $scope.participants = users;
        });
      };

      $scope.$watch('filterParticipants', function (newVal, oldVal) {
        if (newVal == oldVal) {
          return;
        }
        $scope.params.filterUserIds = (newVal || []).join(',');
        updateSentsList();
      });

      $scope.filterProblems = [];
      $scope.problems = [];

      $scope.loadProblems = function () {
        return ContestItemManager.getConditions({
          contestId: contestId
        }).then(function (problems) {
          $scope.problems = problems;
        });
      };

      $scope.$watch('filterProblems', function (newVal, oldVal) {
        if (newVal == oldVal) {
          return;
        }
        $scope.params.filterProblemIds = (newVal || []).join(',');
        updateSentsList();
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
        updateSentsList();
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
                'contest.solutions',
                { select: 'my' },
                { location: true, inherit: true, relative: $state.$current, notify: false }
              );
            } else {
              $state.transitionTo(
                'contest.solutions-pagination',
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
                'contest.solutions',
                { select: 'all' },
                { location: true, inherit: true, relative: $state.$current, notify: false }
              );
            } else {
              $state.transitionTo(
                'contest.solutions-pagination',
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
          select = $scope.params.select,
          canSee = !data.author.isAdmin || $scope.currentUser.isAdmin;
        if (select === 'my'
          && userId !== $scope.currentUser.id
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
      
      var editor;
      $scope.$on('$destroy', function () {
        if (editor) {
          editor.destroy();
        }
      });
      
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
          var languageFamily = (result.language && result.language.languageFamily) || "c_cpp";
          editor = ace.edit("editor");
          editor.setTheme("ace/theme/crimson_editor");
          editor.session.setMode("ace/mode/" + languageFamily);
          editor.setReadOnly(true);
          editor.setHighlightActiveLine(false);
          editor.focus();
          editor.setOptions({
            maxLines: Infinity,
            minLines: 2,
            fontSize: "12pt",
            enableSnippets: true,
            spellcheck: true,
            tabSize: 4
          });
          editor.renderer.setScrollMargin(0, 10, 10, 10);
          editor.commands.addCommand({
            name: "showKeyboardShortcuts",
            bindKey: {win: "Ctrl-Alt-h", mac: "Command-Alt-h"},
            exec: function(editor) {
              ace.config.loadModule("ace/ext/keybinding_menu", function(module) {
                module.init(editor);
                editor.showKeyboardShortcuts()
              });
            }
          });
        });
      }).catch(function (result) {
        $rootScope.$broadcast('data loaded');
        ErrorService.show(result);
      });
      
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
  
  .controller('RightSidenavCtrl', ['$scope', '$rootScope', '$timeout', '$mdSidenav', '$mdToast', '$log', '$state', 'ContestItemManager', 'ErrorService',
    function ($scope, $rootScope, $timeout, $mdSidenav, $mdToast, $log, $state, ContestItemManager, ErrorService) {
      
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
      
      var toastInstance;
      $scope.$on('new message', function (ev, args) {
        ion.sound.play("pop_cork");
        
        var position = [ 'left', 'top' ];
        var messagesNumber = $scope.messages.unread.length + 1;
        var toast = $mdToast.simple()
          .hideDelay(20000)
          .textContent(messagesNumber + ' new message' + (messagesNumber > 1 ? 's' : ''))
          .action('Open')
          .parent(document.querySelector('.notifications'))
          .highlightAction(true)
          .highlightClass('md-warn')
          .position(position.join(' '));
        
        toastInstance = $mdToast.show(toast).then(function (response) {
          console.log(1, response);
          if ( response == 'ok' ) {
            $rootScope.$broadcast('toggleRightSidenav');
          }
        }).catch(function (error) {
          console.log('Toast rejected');
        });
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
              url: 'https://',
              title: 'Название файла'
            };
            $scope.save = function () {
              $parentScope.settings.files.push($scope.file);
              $scope.close();
            };
            
            $scope.types = [ 'pdf', 'txt', 'doc', 'image', 'spreadsheet' ];
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
  
  .controller('MonitorRowMenuCtrl', ['mdPanelRef', '$scope', '$state', '$rootScope', '$timeout', 'UserManager', 'AdminManager', 'ErrorService', '$mdDialog', 'ContestItemManager', '$mdPanel', 'user', 'actions',
    function (mdPanelRef, $scope, $state, $rootScope, $timeout, UserManager, AdminManager, ErrorService, $mdDialog, ContestItemManager, $mdPanel, user, actions) {
      var contestId = $state.params.contestId;
      
      $scope.$on('$stateChangeStart', function () {
        mdPanelRef.close();
      });
      
      $scope.runAction = function (ev, action) {
        var actions = {
          'SHOW_RATING_HISTORY': showRatingHistory,
          'REFRESH_SOLUTIONS_FOR_USER': refreshSolutionsForUser,
          'PARTICIPANT_DELETE': deleteUserFromContest
        };
        if (action && action.id in actions) {
          actions[action.id](user);
        }
        
        function deleteUserFromContest(user) {
          showConfirmationDialog(ev).then(function () {
            return AdminManager.deleteUserFromContest( { contestId: contestId, userId: user.id } ).then(function (result) {
              $rootScope.$broadcast('table update');
              mdPanelRef.hide();
            }).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }
        
        function refreshSolutionsForUser(user) {
          showConfirmationDialog(ev).then(function () {
            return AdminManager.refreshSolutionForUser( { contestId: contestId, userId: user.id } ).then(function (result) {
              mdPanelRef.hide();
            }).catch(function (result) {
              ErrorService.show(result);
            });
          });
        }
  
        function showRatingHistory(user) {
          mdPanelRef.close();
          $mdDialog.show({
            controller: 'RatingHistoryDialogController',
            templateUrl: templateUrl('contest-item/rating', 'dialog'),
            parent: angular.element(document.body),
            targetEvent: ev,
            locals: {
              user: user
            }
          });
        }
        
        function showConfirmationDialog(ev) {
          var confirm = $mdDialog.confirm()
            .title('Подтверждение')
            .content('Вы действительно хотите это сделать?')
            .ariaLabel('Confirmation dialog')
            .ok('Да')
            .cancel('Отмена')
            .targetEvent(ev);
          return $mdDialog.show(confirm);
        }
      }
    }
  ])

  .controller('RatingHistoryDialogController', ['$scope', 'user', '$mdDialog', 'ErrorService', 'UserManager', '$timeout', '$q',
    function ($scope, user, $mdDialog, ErrorService, UserManager, $timeout, $q) {
      
      $scope.userGroups = [];
      $scope.selectedGroupId = null;
      $scope.ratingHistory = {};
      $scope.groupTable = [];
      $scope.isLoading = false;
      
      $scope.findGroupById = function (id) {
        return $scope.userGroups.filter(function (group) {
          return group.id == id;
        })[0];
      };
      
      $scope.$watch('selectedGroupId', function (newVal, oldValue) {
        if (!newVal || !oldValue) {
          return;
        }
        $scope.ratingHistory = null;
        var group = $scope.findGroupById(newVal);
        $scope.groupColor = group && group.color || '#ccc';
        loadData($scope.selectedGroupId);
      });
      
      function loadData(groupId) {
        $scope.isLoading = true;
        return loadUserInfo().then(function () {
          return loadUserGroups();
        }).then(function (groups) {
          if (!groups.length) {
            throw new Error('Пользователь не состоит ни в какой группе');
          }
          $scope.selectedGroupId = groupId || groups[0].id;
          return loadRatingHistory($scope.selectedGroupId);
        }).then(function (ratingHistory) {
          var group = $scope.findGroupById($scope.selectedGroupId);
          $scope.groupColor = group && group.color || '#ccc';
          safeApply($scope);
          var history = ratingHistory.ratingChanges;
          if (!history.length) {
            return;
          }
          var minY = 1e9, maxY = -1e9;
          var data = history.map(function (ratingChange) {
            minY = Math.min(minY, ratingChange.ratingAfter);
            maxY = Math.max(maxY, ratingChange.ratingAfter);
            return {
              name: '<b>#' + ratingChange.contest.id + '. ' + ratingChange.contest.name + '<b><br>' +
                ('Место в контесте: <b>#' + ratingChange.realRank + '</b><br>') +
                'Изменение рейтинга: ' + (ratingChange.ratingChange > 0
                ? '<b style="fill: #35a94f; color: #35a94f;">+' + ratingChange.ratingChange + '</b>'
                : '<b style="fill: #ff4834; color: #ff4834;">' + ratingChange.ratingChange + '</b>'),
              y: ratingChange.ratingAfter,
              x: new Date(ratingChange.contest.startTimeMs)
            };
          });
          $timeout(function () {
            Highcharts.chart('rating-chart', {
              chart: {
                type: 'line',
                zoomType: 'x'
              },
              title: {
                text: 'Рейтинг пользователя'
              },
              subtitle: {
                text: 'Показаны только рейтинговые контесты'
              },
              xAxis: {
                type: 'datetime',
                title: {
                  text: 'Дата'
                },
                tickInterval: 25 * 24 * 3600 * 1000
              },
              yAxis: {
                title: {
                  text: 'Рейтинг'
                },
                min: minY - 50,
                max: maxY + 50
              },
              plotOptions: {
                area: {
                  marker: {
                    enabled: true,
                    radius: 4
                  },
                  lineWidth: 2
                }
              },
              series: [{
                type: 'area',
                name: 'Рейтинг',
                data: data,
                zones: [{
                  value: 1350,
                  color: '#009688',
                  fillColor: 'rgba(0, 150, 136, 0.31)',
                  negativeFillColor: 'rgba(0, 150, 136, 0.31)'
                }, {
                  value: 1500,
                  color: '#8bc34a',
                  fillColor: 'rgba(139, 195, 74, 0.33)',
                  negativeFillColor: 'rgba(139, 195, 74, 0.33)'
                }, {
                  value: 1650,
                  color: '#ff9800',
                  fillColor: 'rgba(255, 152, 0, 0.36)',
                  negativeFillColor: 'rgba(255, 152, 0, 0.36)'
                }, {
                  value: 1750,
                  color: 'rgb(255,82,82)',
                  fillColor: 'rgba(255,82,82,.3)',
                  negativeFillColor: 'rgba(255,82,82,.3)'
                }, {
                  value: 8000,
                  color: '#9c27b0',
                  fillColor: 'rgba(156, 39, 176, 0.3)',
                  negativeFillColor: 'rgba(156, 39, 176, 0.3)'
                }]
              }]
            });
          }, 100);
        }).catch(function (err) {
          console.error(err);
          ErrorService.show(err);
        }).finally(function () {
          $scope.isLoading = false;
        });
      }
      
      function loadUserGroups() {
        return UserManager.getUserGroups({ userId: user.id }).then(function (groups) {
          $scope.userGroups = groups || [];
          return $scope.userGroups;
        });
      }
  
      function loadRatingHistory(groupId) {
        return UserManager.getRatingHistory({
          userId: user.id,
          groupId: groupId
        }).then(function (history) {
          $scope.ratingHistory = history || {};
          return $scope.ratingHistory;
        });
      }
  
      function loadUserInfo() {
        $scope.user = user;
        return $q.when(user);
      }
  
      function loadGroupTable(groupId) {
        $scope.isTableLoading = true;
        return UserManager.getRatingTable({
          groupId: groupId
        }).then(function (table) {
          $scope.groupTable = (table || []).map(function (row) {
            row.User.rating = row.ratingAfter;
            return row;
          });
          return $scope.groupTable;
        }).catch(function (err) {
          ErrorService.show(err);
        }).finally(function () {
          $scope.isTableLoading = false;
        });
      }
  
      loadData();
      
      $scope.close = function () {
        $mdDialog.hide();
      };
      
      $scope.loadGroupTable = loadGroupTable;
    }
  ])
;