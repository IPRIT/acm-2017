/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 25.02.2018
 */

'use strict';

/* Controllers */

/* global angular */
angular.module('Qemy.controllers.chat', [])

  .controller('ChatBaseController', ['$scope', '$rootScope', '$state', '_', 'UserManager', 'SocketService', 'ChatManager', '$timeout', 'ErrorService',
    function ($scope, $rootScope, $state, _, UserManager, SocketService, ChatManager, $timeout, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Чат с администрацией | ' + _('app_name')
      });

      $scope.user = {};

      const peersMapping = $scope.peersMapping = {
        iprit: 1,
        admin: 2,
        me: null
      };

      const peerId = $state.params.peerId;
      $scope.peerId = peersMapping[peerId] || peerId;
      $scope.peerIdNumber = Number($scope.peerId);

      $rootScope.$broadcast('data loading');
      UserManager.getCurrentUser().then(function (user) {
        $rootScope.$broadcast('data loaded');
        if (!user || !user.id) {
          return $state.go('auth.form');
        }
        $scope.user = user;
        peersMapping.me = user.id;
        if (!user.isAdmin) {
          if ($state.params.peerId !== 'admin') {
            $state.go('chat.peer', { peerId: 'admin' });
          }
        }
        $scope.$broadcast('chat.update.me', user);

        for (let mappingKey in peersMapping) {
          if (peersMapping[mappingKey] === Number($state.params.peerId)) {
            return $timeout(_ => {
              $state.go('chat.peer', { peerId: mappingKey });
            }, 10);
          }
        }

        return startChatApp();
      }).catch(function (err) {
        console.log(err);
        // $state.go('auth.form');
      });

      $scope.dialogs = [];
      $scope.dialogMessages = [];
      $scope.dialogPeer = {};

      function loadDialogs() {
        return ChatManager.getDialogs();
      }

      function loadDialogMessages(peerUserId) {
        return ChatManager.getDialogMessages({ peerUserId })
      }

      function loadPeer(peerUserId) {
        return ChatManager.resolvePeer({ peerUserId });
      }

      function startChatApp(peerId = $state.params.peerId) {
        $scope.peerId = peersMapping[peerId] || peerId;
        $scope.peerIdNumber = Number($scope.peerId);

        console.log(`Starting chat with peerId: ${$scope.peerId}`);

        return loadDialogs().then(dialogs => {
          $scope.dialogs = dialogs;
          return loadPeer($scope.peerId);
        }).then(peer => {
          $scope.dialogPeer = peer;
          return loadDialogMessages(peer.id);
        }).then(messages => {
          $scope.dialogMessages = messages;
          console.log('Chat initialized:', $scope.dialogs, $scope.dialogPeer, $scope.dialogMessages);
        });
      }

      $scope.$on('chat.update.peerId', (ev, peerId) => {
        startChatApp(peerId);
      });
    }
  ])
  .controller('ChatAppController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
      $scope.$on('chat.update.me', (ev, user) => {
        $scope.user = user;
      });

      $scope.$on('$stateChangeStart', (evt, toState, toParams, fromState, fromParams) => {
        for (let mappingKey in $scope.peersMapping) {
          if ($scope.peersMapping[mappingKey] === Number(toParams.peerId)) {
            evt.preventDefault();
            return $timeout(_ => {
              $state.go('chat.peer', { peerId: mappingKey });
            }, 10);
          }
        }
        $scope.$emit('chat.update.peerId', toParams.peerId);
      });
    }
  ])
  .controller('ChatIndexController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
  .controller('ChatDialogsController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
  .controller('ChatDialogsItemController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
      $scope.select = function (peerId) {
        console.log(peerId);
        $scope.selectedPeerId = peerId;
      }
    }
  ])
  .controller('ChatDialogInputController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
  .controller('ChatDialogMessagesController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
  .controller('ChatDialogMessagesItemController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
;