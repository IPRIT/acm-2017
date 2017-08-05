'use strict';

/* Controllers */

angular.module('Qemy.controllers', [
  'Qemy.i18n'
])
  .controller('PageCtrl', ['$scope', '_', function($scope, _) {
    var defaultTitle = _('app_name');
    $scope.$on('change_title', function(e, args) {
      $scope.title = args.title !== undefined && args.title.length ? args.title : defaultTitle;
    });
    $scope.isPageReady = true;
  }])
  
  .controller('AppCtrl', ['$scope', '$rootScope', 'UserManager', '$state', function($scope, $rootScope, UserManager, $state) {
    function updateUserData() {
      console.log('User data updating...');
      $rootScope.$broadcast('data loading');
      var userPromise = UserManager.getCurrentUser({ cache: false });
      userPromise.then(function (user) {
        $rootScope.$broadcast('data loaded');
        if (!user || !user.id) {
          $rootScope.$broadcast('user updated', { user: {} });
          return $state.go('auth.form', { test: 1 });
        }
        $rootScope.$broadcast('user updated', { user: user });
        console.log('User data updated.');
      }).catch(function (err) {
        $rootScope.$broadcast('data loaded');
        $state.go('auth.form', { test: 1 });
      });
    }
    updateUserData();
    
    $scope.$on('user update needed', function (ev, args) {
      console.log('User data update needed.');
      updateUserData();
    });
  }])
  
  .controller('IndexCtrl', ['$scope', '_', '$state', '$rootScope', 'UserManager',
    function($scope, _, $state, $rootScope, UserManager) {
      $scope.$emit('change_title', {
        title: _('app_name')
      });
      
      $scope.$emit('user update needed');
      $scope.$on('user updated', function (ev, args) {
        if (!args.user) {
          return;
        }
        $state.go('contests.list');
      });
    }
  ])
  
  .controller('HeaderCtrl', ['$scope', '$rootScope', '$state', 'UserManager', '$mdDialog', '$interval',
    function ($scope, $rootScope, $state, UserManager, $mdDialog, $interval) {
      $scope.$state = $state;
      $scope.user = {};
      $scope.isAuth = false;
      $scope.contestMenu = {
        opened: false,
        hover: false,
        items: [{
          name: 'Редактировать контест',
          direction: 'left',
          icon: '/img/icons/ic_settings_48px.svg',
          action: 'admin.edit-contest({contestId: headerMenu.contest.id})'
        }]
      };
      
      $scope.$on('user updated', function (ev, args) {
        if (!args.user) {
          return;
        }
        $scope.user = args.user;
        $scope.isAuth = !!args.user.id;
      });

      $scope.menuList = [{
       type: 'item',
       id: 'profile',
       name: 'Профиль',
       iconSrc: '/img/icons/ic_person_48px.svg'
       }, {
        type: 'item',
        onlyFor: 4096,
        id: 'admin-panel',
        name: 'Панель администратора',
        iconSrc: '/img/icons/ic_security_48px.svg'
      }, {
        type: 'divider'
      }, {
        type: 'item',
        id: 'exit-app',
        name: 'Выход',
        iconSrc: '/img/icons/ic_exit_to_app_48px.svg'
      }];
      
      $scope.profileItemClick = function (event, item, index) {
        switch (item.id) {
          case 'profile':
            $state.go('user.solutions', { select: 'all' });
            break;
          case 'admin-panel':
            $state.go('admin.index');
            break;
          case 'exit-app':
            exitFromApp(event);
            break;
        }
      };
      
      function exitFromApp(ev) {
        var confirm = $mdDialog.confirm()
          .title('Предупреждение')
          .content('Вы действительно хотите выйти?')
          .clickOutsideToClose(true)
          .ariaLabel('Lucky day')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent(ev);
        $mdDialog.show(confirm).then(function() {
          UserManager.logout().then(function (result) {
            $scope.$emit('user update needed');
          });
        });
      }
      
      $scope.headerMenu = {};
      $scope.$on('header expand open', function (ev, args) {
        var contest = args.contest;
        $scope.headerMenu = {
          contest: contest
        };
      });
      
      $scope.$on('header expand close', function (ev, args) {
        $scope.headerMenu.contest = null;
        $scope.headerMenu = {};
      });
      
      $scope.logoClick = function (ev) {
        if ($state.current
          && $state.current.name
          && $state.is('contests.list')) {
          $rootScope.$broadcast('contests list update needed')
        }
      };
      
      $scope.unreadMessagesNumber = 0;
      $scope.allMessagesNumber = 0;
      
      $scope.openInbox = function (ev) {
        $rootScope.$broadcast('toggleRightSidenav');
      };
      
      $scope.$on('inbox.messages.update-numbers', function (ev, args) {
        $scope.unreadMessagesNumber = typeof args.unreadMessagesNumber !== 'undefined' ?
          args.unreadMessagesNumber : $scope.unreadMessagesNumber;
        $scope.allMessagesNumber = typeof args.allMessagesNumber !== 'undefined' ?
          args.allMessagesNumber : $scope.allMessagesNumber;
      });
    }
  ])
  
  .controller('WrapperCtrl', ['$scope', '$rootScope', '$timeout', '$interval', function ($scope, $rootScope, $timeout, $interval) {
    
    $scope.pageLoading = false;
    $scope.progress = 0;
    $scope.$on('data loading', function (ev, args) {
      $scope.pageLoading = true;
      $scope.progress = 0;
      $timeout(function () {
        $scope.progress = 90;
      }, 100);
    });
    
    $scope.$on('data loaded', function (ev, args) {
      $scope.pageLoading = false;
      $scope.progress = 100;
    });
  }])
;