/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 13.06.2017
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.profile', [])
  
  .controller('ProfileBaseController', ['$scope', '$rootScope', '$state', '_', 'SocketService', '$mdToast', '$mdSidenav', '$log', '$timeout', 'ErrorService', 'UserManager',
    function ($scope, $rootScope, $state, _, SocketService, $mdToast, $mdSidenav, $log, $timeout, ErrorService, UserManager) {
      $scope.$emit('change_title', {
        title: 'Профиль • ' + _('app_name')
      });

      $scope.user = {};
      $scope.telegram = {};

      function updateUser() {
        return UserManager.getCurrentUser().then(function (user) {
          $scope.user = user;
          return UserManager.getTelegramAccount();
        }).then(telegram => {
          $scope.telegram = telegram;
        }).catch(function (error) {
          ErrorService.show(error);
        });
      }

      updateUser();
    }
  ])
;