/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 11.11.2015
 */

"use strict";

/* Directives */

angular.module('Qemy.directives.contest-item', [
  'Qemy.directives.contest-item.table'
])
  
  .directive('xTest', function() {
    return {
      template: '<div></div>'
    }
  })
  
  .directive('chatSidenav', function () {
    return {
      restrict: 'E',
      replace: true,
      templateUrl: templateUrl('contest-item', 'contest-chat/sidenav')
    }
  })
  
  .directive('insertChatSidenav', function () {
    return {
      restrict: 'A',
      compile: function (tElement, tAttrs, transclude) {
        angular.element(tElement)
          .append('<chat-sidenav/>');
      }
    }
  })
  
  .directive('socketStatus', function () {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: templateUrl('contest-item/utils', 'socket-status'),
      controller: ['$scope', 'SocketService', function ($scope, SocketService) {
        $scope.status = SocketService.getSocket().connected ? 'on' : 'off';
        
        function onConnectionChange(eventName) {
          if (eventName === 'connect' || eventName === 'reconnect') {
            $scope.status = 'on';
          } else /*if (['disconnect', 'connect_error'])*/ {
            $scope.status = 'off';
          }
          safeApply($scope);
        }
        
        SocketService.onConnectionChangeSetListener(onConnectionChange);
      }]
    }
  })
;