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
        $state.go('auth.form');
      });

      $scope.dialogs = [];
      $scope.dialogMessages = [];
      $scope.dialogPeer = {};

      $scope.scrollDown = () => {
        $timeout(_ => {
          let chatApp = document.querySelector('.chat-app');
          let dialogMessagesContainer = chatApp.querySelector('.dialog-messages');
          let $dialogMessagesContainer = angular.element(dialogMessagesContainer);
          $dialogMessagesContainer.scrollTop(1e9)
        }, 50);
      };

      function loadDialogs() {
        return ChatManager.getDialogs();
      }

      function loadDialogMessages(peerUserId) {
        return ChatManager.getDialogMessages({ peerUserId })
      }

      function loadPeer(peerUserId) {
        return ChatManager.resolvePeer({ peerUserId });
      }

      function createIndex(dialogs) {
        const dialogsIndex = SearchIndexManager.createIndex();
        for (let i = 0; i < dialogs.length; ++i) {
          SearchIndexManager.indexObject(dialogs[i].peer.id, dialogs[i].peer.fullName, dialogsIndex);
        }
        $scope.dialogsIndex = dialogsIndex;
      }

      async function startChatApp(peerId = $state.params.peerId) {
        $scope.peerId = peersMapping[peerId] || peerId;
        $scope.peerIdNumber = Number($scope.peerId);

        console.log(`Starting chat with peerId: ${$scope.peerId}`);

        let promises = [
          loadPeer($scope.peerId),
          loadDialogMessages($scope.peerId)
        ];
        if (!$scope.dialogs.length) {
          promises.push(loadDialogs());
        }

        let results = await Promise.all(promises);

        let [ peer, messages, dialogs ] = results;
        $scope.dialogPeer = peer;
        $scope.dialogMessages = messages;
        $scope.dialogMessages.messages = $scope.dialogMessages.messages.sort((a, b) => a.message.id - b.message.id);
        if (dialogs) {
          $scope.dialogs = dialogs;
          createIndex(dialogs);
        }
        safeApply($scope);
        $scope.scrollDown();
        console.log('Chat initialized:', $scope.dialogs, $scope.dialogPeer, $scope.dialogMessages);
      }

      $scope.$on('chat.update.peerId', (ev, peerId) => {
        startChatApp(peerId);
      });
    }
  ])
  .controller('ChatAppController', ['$scope', '$rootScope', '$state', '_', '$timeout', 'ChatManager', 'SocketService',
    function ($scope, $rootScope, $state, _, $timeout, ChatManager, SocketService) {
      $scope.$on('chat.update.me', (ev, user) => {
        $scope.user = user;
      });

      $scope.select = function (peerId) {
        $scope.selectedPeerId = peerId;
      };

      $scope.onKeydown = (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
          $scope.sendMessage();
          e.preventDefault();
          e.stopPropagation();
        } else {
          SocketService.startTypingChat($scope.peerIdNumber);
        }
      };

      $scope.form = {
        messageText: ''
      };

      $scope.sendMessage = () => {
        if (!$scope.form.messageText ||
            !$scope.form.messageText.trim()) {
          return;
        }
        let messageObject = {
          message: $scope.form.messageText,
          attachments: {},
          recipientUserId: $scope.peerIdNumber
        };
        $scope.form = angular.copy({});
        safeApply($scope);

        ChatManager.sendMessage(messageObject).then(_ => {
          $scope.dialogMessages.messages.push(_);
          $scope.scrollDown();
          $scope.messageText = '';
          safeApply($scope);
        });
      };

      $scope.$on('new chat message', (ev, data) => {
        if (data.author.id === $scope.peerIdNumber && data.author.id !== $scope.user.id) {
          $scope.dialogMessages.messages.push(data);
          $scope.scrollDown();
          safeApply($scope);
        }
      });

      $scope.$on('read chat message', (ev, data) => {
        console.log(data);
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
      $scope.dialogsSearch = '';
    }
  ])
  .controller('ChatDialogsItemController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
  .controller('ChatDialogInputController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
  .controller('ChatDialogMessagesController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
      $scope.typing = false;

      let typingTimeout = null;

      $scope.$on('chat typing', (ev, peer) => {
        console.log('Chat typing:', peer);
        $scope.typing = true;
        $scope.scrollDown();
        if (typingTimeout) {
          clearTimeout(typingTimeout);
          typingTimeout = null;
        }
        typingTimeout = setTimeout(() => {
          clearTimeout(typingTimeout);
          typingTimeout = null;
          $scope.typing = false;
          safeApply($scope);
        }, 4000);
        safeApply($scope);
      });
    }
  ])
  .controller('ChatDialogMessagesItemController', ['$scope', '$rootScope', '$state', '_', '$timeout',
    function ($scope, $rootScope, $state, _, $timeout) {
    }
  ])
;