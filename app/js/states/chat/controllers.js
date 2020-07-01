/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
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
        admin: 2,
        me: null
      };

      const peerId = $state.params.peerId;
      $scope.peerId = peersMapping[peerId] || peerId;
      $scope.peerIdNumber = Number($scope.peerId);

      $rootScope.$broadcast('data loading');
      ChatManager.getMe().then((user) => {
        $rootScope.$broadcast('data loaded');
        if (!user || !user.id) {
          return $state.go('auth.form');
        }
        $scope.user = user;
        peersMapping.me = user.id;
        if (!user.isSupervisor) {
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
      $scope.messagesOffset = 0;
      $scope.messagesLimit = 20;
      $scope.isLoadingNext = false;

      $scope.$on('chat.loadNext', loadNextMessages);

      function loadNextMessages (ev, element) {
        if ($scope.isLoadingNext) {
          return;
        }
        $scope.isLoadingNext = true;
        $scope.messagesOffset += $scope.messagesLimit;
        loadDialogMessages($scope.peerId, { offset: $scope.messagesOffset }).then(messages => {
          $scope.dialogMessages.messages.unshift(
            ...messages.messages.sort((a, b) => a.message.id - b.message.id)
          );
        }).finally(_ => {
          $scope.isLoadingNext = false;
        });
      }

      $scope.scrollDown = () => {
        $timeout(_ => {
          let chatApp = document.querySelector('.chat-app');
          let dialogMessagesContainer = chatApp.querySelector('.dialog-messages');
          let $dialogMessagesContainer = angular.element(dialogMessagesContainer);
          $dialogMessagesContainer.scrollTop(1e9)
        }, 50);
      };

      $scope.sortDialogs = () => {
        $scope.dialogs = $scope.dialogs.sort((a, b) => {
          return b.headMessage.id - a.headMessage.id;
        });
      };

      $scope.deleteOldDialogMessages = (takeNumber = 30) => {
        while ($scope.dialogMessages.messages.length > takeNumber) {
          $scope.dialogMessages.messages.shift();
        }
      };

      $scope.sortDialogMessages = () => {
        $scope.dialogMessages.messages = $scope.dialogMessages.messages.sort((a, b) => {
          return a.message.postAtMs - b.message.postAtMs;
        });
      };

      $scope.updateDialog = (message, incoming = false) => {
        const peerDialog = $scope.dialogs.find(dialog => {
          return dialog.peer.id === (
            incoming ? message.author.id : message.recipient.id
          );
        });
        if (peerDialog) {
          Object.assign(peerDialog.headMessage, message.message);
        } else {
          let dialog = {
            author: message.recipient,
            headMessage: message.message,
            peer: message.author,
          };
          $scope.dialogs.unshift(dialog);
        }

        safeApply($scope);
      };

      $scope.markMessageAsRead = ({ id }) => {
        const peerDialog = $scope.dialogs.find(dialog => {
          return dialog.headMessage.id === id;
        });
        if (peerDialog) {
          peerDialog.headMessage.isRead = true;
        }
        const message = $scope.dialogMessages.messages.find(message => {
          return message.message.id === id;
        });
        if (message) {
          message.message.isRead = true;
        }
        safeApply($scope);
      };

      function loadDialogs() {
        return ChatManager.getDialogs();
      }

      function loadDialogMessages(peerUserId, { limit = 20, offset = 0 } = {}) {
        return ChatManager.getDialogMessages({ peerUserId, limit, offset })
      }

      function loadPeer(peerUserId) {
        return ChatManager.resolvePeer({ peerUserId });
      }

      function markAsRead(peerUserId) {
        return ChatManager.markAsRead({ peerUserId });
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

        await markAsRead($scope.peerId);
        $rootScope.$broadcast('chat.update.unreadMessagesNumber');

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
        $scope.messagesOffset = 0;
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

      $scope.i18nPlaceholder = _('chat-input-placeholder');

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
          $scope.updateDialog(_, false);
          $scope.sortDialogs();
          $scope.sortDialogMessages();
          $scope.deleteOldDialogMessages();
          $scope.messageText = '';
          safeApply($scope);
        });
      };

      $scope.$on('new chat message', async (ev, data) => {
        if (data.author.id === $scope.peerIdNumber && data.author.id !== $scope.user.id) {
          await ChatManager.markAsRead({ peerUserId: $scope.peerIdNumber });
          data.message.isRead = true;
          $scope.dialogMessages.messages.push(data);
          $scope.scrollDown();
        }
        $scope.updateDialog(data, true);
        $scope.sortDialogs();
        $scope.sortDialogMessages();
        $scope.deleteOldDialogMessages();
        safeApply($scope);
      });

      $scope.$on('read chat message', (ev, data) => {
        $scope.markMessageAsRead(data);
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
  .controller('ChatDialogsController', ['$scope', '$rootScope', '$state', '_', '$timeout', 'AdminManager',
    function ($scope, $rootScope, $state, _, $timeout, AdminManager) {
      $scope.dialogsSearch = '';

      $scope.$watch('dialogsSearch', async (val) => {
        if (!val) {
          return;
        }
        const searchResponse = await AdminManager.getUsers({
          count: 100,
          offset: 0,
          q: val
        });
        $scope.searchDialogsNumber = searchResponse.usersNumber;

        const dialogUsersIds = $scope.dialogs.map(dialog => {
          return dialog.peer.id;
        });
        $scope.searchDialogs = searchResponse.users.filter(user => {
          return !dialogUsersIds.includes(user.id);
        }).map(user => {
          return {
            peer: user,
            author: $scope.user,
            headMessage: {}
          }
        });
        safeApply($scope);
      });
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

      $scope.loadNext = (element) => {
        $rootScope.$broadcast( 'chat.loadNext', element );
      };

      $scope.$on('chat typing', (ev, { peer }) => {
        console.log('Chat typing:', peer);
        if ($scope.peerIdNumber !== peer.id) {
          return;
        }
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