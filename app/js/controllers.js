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

    const isContestMisis = location.host.indexOf('contest.misis.ru') !== -1;
    const isContestNlogn = location.host.indexOf('contest.nlogn.info') !== -1 || location.host.indexOf('localhost') !== -1;
    const isSchoolMisis = location.host.indexOf('school.misis.ru') !== -1;

    $scope.isContestMisis = isContestMisis;
    $scope.isContestNlogn = isContestNlogn;
    $scope.isSchoolMisis = isSchoolMisis;

    $scope.theme = isContestNlogn ? 'nlogn' : 'default';
  }])
  
  .controller('AppCtrl', ['$scope', '$rootScope', 'UserManager', '$state', 'SocketService', '$timeout', 'ErrorService', 'ChatManager',
    function($scope, $rootScope, UserManager, $state, SocketService, $timeout, ErrorService, ChatManager) {

      let user = null;
      asyncInit().then(_user => user = _user);

      // chat event listeners
      let socketId,
        newChatMessageListener,
        deleteChatMessageListener,
        readChatMessageListener,
        typingListener;

      function attachEvents() {
        newChatMessageListener = SocketService.setListener('new chat message', data => {
          $rootScope.$broadcast('new chat message', data);
        });
        deleteChatMessageListener = SocketService.setListener('delete chat message', data => {
          $rootScope.$broadcast('delete chat message', data);
        });
        readChatMessageListener = SocketService.setListener('read chat message', data => {
          $rootScope.$broadcast('read chat message', data);
        });
        typingListener = SocketService.setListener('chat typing', data => {
          $rootScope.$broadcast('chat typing', data);
        });
      }

      function removeEvents() {
        try {
          newChatMessageListener.removeListener();
          deleteChatMessageListener.removeListener();
          readChatMessageListener.removeListener();
          typingListener.removeListener();
          console.log('Chat listeners have been removed.');
        } catch (err) {
          console.log(err);
        }
      }

      $scope.unreadChatMessagesNumber = 0;
      async function updateUnreadMessages () {
        let { messagesNumber } = await ChatManager.getUnreadMessagesNumber();
        $scope.unreadChatMessagesNumber = messagesNumber;
        $scope.$broadcast('chat.updated.unreadMessagesNumber', messagesNumber);
        safeApply($scope);
      }

      async function asyncInit() {
        try {
          await Promise.resolve(updateUnreadMessages());
        } catch (e) {
          console.log(e);
        }

        return new Promise((resolve, reject) => {
          SocketService.onConnect(async () => {
            let user = await updateUserData();
            if (!user) {
              return resolve({});
            }
            socketId = SocketService.getSocket().id;
            console.log('Connected:', socketId);

            SocketService.listenChat(user.isSupervisor ? 2 : user.id);
            SocketService.getSocket().on('reconnect', _ => {
              console.log('Reconnected:', SocketService.getSocket().id);
              $timeout(() => SocketService.listenChat(user.isSupervisor ? 2 : user.id), 500);
            });

            attachEvents();
            resolve(user);
          });
        });
      }

      async function updateUserData() {
        console.log('User data updating...');
        $rootScope.$broadcast('data loading');
        try {
          let user = await UserManager.getCurrentUser({ cache: false });
          $rootScope.$broadcast('data loaded');
          if (!user || !user.id) {
            $rootScope.$broadcast('user updated', { user: null });
            if (
              $state.current.name !== 'auth.register-form'
              && $state.current.name !== 'auth.forget-password-form'
              && $state.current.name !== 'auth.reset-password-form'
              && $state.current.name !== 'auth.link-email'
            ) {
              $state.go('auth.form');
            }
            return;
          }
          $rootScope.$broadcast('user updated', { user });
          console.log('User data updated.');
          return user;
        } catch (err) {
          $rootScope.$broadcast('data loaded');
          if (
            $state.current.name !== 'auth.register-form'
            && $state.current.name !== 'auth.forget-password-form'
            && $state.current.name !== 'auth.reset-password-form'
            && $state.current.name !== 'auth.link-email'
          ) {
            $state.go('auth.form');
          }
        }
      }

      $scope.$on('user update needed', function (ev, args) {
        console.log('User data update needed.', user);
        if (user && user.id) {
          SocketService.stopListenChat(user.isSupervisor ? 2 : user.id);
          removeEvents();
        }
        asyncInit().then(_user => {
          user = _user;
        });
      });

      $scope.$on('new chat message', _ => {
        $rootScope.$broadcast('chat.update.unreadMessagesNumber');
        ion.sound.play("pop_cork");
      });

      $scope.$on('chat.update.unreadMessagesNumber', async function (ev, args) {
        await updateUnreadMessages();
      });

      $scope.$on('$destroy', function () {
        if (user && user.id) {
          SocketService.stopListenChat(user.isSupervisor ? 2 : user.id);
          removeEvents();
        }
      });
    }
  ])
  
  .controller('IndexCtrl', ['$scope', '_', '$state', '$rootScope', 'UserManager', '$timeout',
    function($scope, _, $state, $rootScope, UserManager, $timeout) {
      $scope.$emit('change_title', {
        title: _('app_name')
      });

      $rootScope.$broadcast('user update needed');
      $scope.$on('user updated', function (ev, args) {
        if (!args.user) {
          return;
        }
        $state.go('contests.list');
      });
    }
  ])
  
  .controller('HeaderCtrl', ['$scope', '_', '$rootScope', '$state', 'UserManager', '$mdDialog', '$interval',
    function ($scope, _, $rootScope, $state, UserManager, $mdDialog, $interval) {
      $scope.$state = $state;
      $scope.user = {};
      $scope.isAuth = false;

      const contestMisisLogo = '/img/acm-logo-2.svg';
      const schoolMisisLogo = '/img/school-misis.png';
      const contestNlognLogo = '/img/nlogn-logo.svg';

      $scope.headerLogo = $scope.isContestMisis
        ? contestMisisLogo
        : $scope.isContestNlogn
          ? contestNlognLogo
          : $scope.isSchoolMisis
            ? schoolMisisLogo
            : contestMisisLogo;

      $scope.$on('user updated', function (ev, args) {
        if (!args.user) {
          $scope.user = {};
          return;
        }
        $scope.user = args.user || {};
        $scope.isAuth = !!($scope.user && $scope.user.id);
        safeApply($scope);
      });

      $scope.$on('chat.updated.unreadMessagesNumber', function (ev, value) {
        $scope.unreadChatMessagesNumber = value;
        const menuItem = $scope.menuList.find(item => item.id === 'chat.peer');
        if (menuItem) {
          menuItem.counter = value || 0;
        }
        safeApply($scope);
      });

      $scope.$on('user reset', function (ev, args) {
        $scope.user = {};
        $scope.isAuth = false;
        safeApply($scope);
      });

      $scope.menuList = [{
        type: 'item',
        id: 'profile',
        name: _('menu-profile'), // 'Профиль',
        iconSrc: '/img/icons/ic_face_24px.svg'
      }, {
        type: 'item',
        id: 'solutions',
        onlyFor: 256,
        name: _('menu-my-solutions'), // 'Мои решения',
        iconSrc: '/img/icons/ic_rule_24px.svg'
      }, {
        type: 'item',
        id: 'solutions',
        onlyFor: [1024, 4096],
        name: _('menu-user-solutions'), // 'Решения пользователей',
        iconSrc: '/img/icons/ic_rule_24px.svg'
      }, {
        type: 'item',
        id: 'ratings',
        name: _('menu-rating'), // 'Таблицы рейтинга',
        iconSrc: '/img/icons/ic_table_chart_24px.svg'
      }, {
        type: 'item',
        id: 'chat.peer',
        onlyFor: [256],
        name: _('menu-admin-chat'), // 'Написать администратору',
        counter: $scope.unreadChatMessagesNumber,
        iconSrc: '/img/icons/ic_attach_email_24px.svg'
      }, {
        type: 'item',
        id: 'chat.peer',
        onlyFor: [1024, 4096],
        name: _('menu-user-messages'), // 'Сообщения пользователей',
        counter: $scope.unreadChatMessagesNumber,
        iconSrc: '/img/icons/ic_attach_email_24px.svg'
      }, {
        type: 'item',
        onlyFor: 4096,
        id: 'admin-panel',
        name: _('menu-admin-panel'), // 'Панель администратора',
        iconSrc: '/img/icons/ic_security_48px.svg'
      }, {
        type: 'item',
        onlyFor: 1024,
        id: 'admin-panel',
        name: _('menu-control-panel'), // 'Панель управления',
        iconSrc: '/img/icons/ic_security_48px.svg'
      }, {
        type: 'divider'
      }, {
        type: 'item',
        id: 'exit-app',
        name: _('menu-logout'), // 'Выход',
        className: 'md-accent',
        iconSrc: '/img/icons/ic_exit_to_app_48px.svg'
      }];
      
      $scope.profileItemClick = function (event, item, index) {
        switch (item.id) {
          case 'profile':
            $state.go('profile');
            break;
          case 'ratings':
            $state.go('rating.index');
            break;
          case 'solutions':
            $state.go('user.solutions', { select: 'all' });
            break;
          case 'auth.link-email':
            $state.go('auth.link-email');
            break;
          case 'chat.peer':
            $state.go('chat.peer', { peerId: 'admin' });
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
            $rootScope.$broadcast('user update needed');
            $rootScope.$broadcast('user reset');
            $state.go('auth.form');
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
      $scope.unreadChatMessagesNumber = 0;

      $scope.openInbox = function (ev) {
        $rootScope.$broadcast('toggleRightSidenav');
      };
      
      $scope.$on('inbox.messages.update-numbers', function (ev, args) {
        $scope.unreadMessagesNumber = typeof args.unreadMessagesNumber !== 'undefined' ?
          args.unreadMessagesNumber : $scope.unreadMessagesNumber;
        $scope.allMessagesNumber = typeof args.allMessagesNumber !== 'undefined' ?
          args.allMessagesNumber : $scope.allMessagesNumber;
      });

      $scope.$watch('user', (user) => {
        const emailItem = $scope.menuList.findIndex(item => item.id === 'auth.link-email');

        if (!user || !user.id || user.email) {
          if (emailItem !== -1) {
            $scope.menuList.splice(emailItem, 1);
          }
          safeApply($scope);

          return;
        }

        if (emailItem !== -1) {
          return;
        }

        $scope.menuList.unshift({
          type: 'item',
          id: 'auth.link-email',
          name: _('auth-link-email-title'), // 'Привязать E-mail',
          iconSrc: '/img/icons/ic_alternate_email_24px.svg'
        });

        safeApply($scope);
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

  .controller('FooterCtrl', ['$scope', '$rootScope', '$timeout', '$interval', function ($scope, $rootScope, $timeout, $interval) {
    $scope.language = Config.I18n.locale;

    $scope.languages = Object.keys(Config.I18n.languages).map(id => {
      return {
        id,
        name: Config.I18n.languages[id],
        icon: `/img/icons/${id}.svg`,
      };
    });

    $scope.$watch('language', (id) => {
      if (!id) {
        return;
      }

      localStorage.setItem('i18n_locale', id);

      if (Config.I18n.locale !== id) {
        location.href = location.href;
      }
    });
  }])
;
