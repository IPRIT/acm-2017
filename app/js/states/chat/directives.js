/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 25.02.2018
 */

"use strict";

/* Directives */

angular.module('Qemy.directives.chat', [])
  .directive('chatApp', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: templateUrl('chat', 'chat'),
      controller: 'ChatAppController'
    }
  }])
  .directive('chatDialogs', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: templateUrl('chat', 'dialogs'),
      controller: 'ChatDialogsController'
    }
  }])
  .directive('chatDialogsItem', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: templateUrl('chat', 'dialogs-item'),
      controller: 'ChatDialogsItemController'
    }
  }])
  .directive('chatDialogInput', [function () {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: templateUrl('chat', 'dialog-input'),
      controller: 'ChatDialogInputController'
    }
  }])
  .directive('chatDialogMessages', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: templateUrl('chat', 'dialog-messages'),
      controller: 'ChatDialogMessagesController'
    }
  }])
  .directive('chatDialogMessagesItem', [function () {
    return {
      restrict: 'E',
      replace: true,
      scope: true,
      templateUrl: templateUrl('chat', 'dialog-messages-item'),
      controller: 'ChatDialogMessagesItemController'
    }
  }])
;