/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 25.02.2018
 */

"use strict";

angular.module('Qemy.services.chat', [
  'Qemy.i18n'
])
  
  .service('ChatManager', ['$http', function ($http) {

    function getDialogs(params) {
      return $http({
        method: 'get',
        url: '/api/chat/chatDialogs',
        params
      }).then(function (data) {
        return data.data;
      });
    }

    function getMe() {
      return $http({
        method: 'get',
        url: '/api/chat/me'
      }).then(function (data) {
        return data.data;
      });
    }

    function getDialogMessages(params) {
      return $http({
        method: 'get',
        url: '/api/chat/chatMessages',
        params
      }).then(function (data) {
        return data.data;
      });
    }

    function resolvePeer(params) {
      return $http({
        method: 'get',
        url: '/api/chat/resolvePeer',
        params
      }).then(function (data) {
        return data.data;
      });
    }

    function sendMessage(data) {
      return $http({
        method: 'post',
        url: '/api/chat/chatMessages',
        data
      }).then(function (data) {
        return data.data;
      });
    }

    function markAsRead(data) {
      return $http({
        method: 'post',
        url: '/api/chat/chatMessages/read',
        data
      }).then(function (data) {
        return data.data;
      });
    }

    function deleteMessages(data) {
      return $http({
        method: 'delete',
        url: '/api/chat/chatMessages',
        data
      }).then(function (data) {
        return data.data;
      });
    }

    function getUnreadMessagesNumber() {
      return $http({
        method: 'get',
        url: '/api/chat/unreadMessagesNumber'
      }).then(function (data) {
        return data.data;
      });
    }

    return {
      getDialogs,
      getDialogMessages,
      resolvePeer,
      sendMessage,
      markAsRead,
      deleteMessages,
      getUnreadMessagesNumber,
      getMe
    }
  }])
;