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

/* global angular */
angular.module('Qemy.controllers.chat', [])

  .controller('ChatBaseController', ['$scope', '$rootScope', '$state', '_', 'UserManager', 'SocketService', '$timeout', 'ErrorService',
    function ($scope, $rootScope, $state, _, UserManager, SocketService, $timeout, ErrorService) {
      $scope.$emit('change_title', {
        title: 'Диалоги | ' + _('app_name')
      });
      $scope.user = {};

      $rootScope.$broadcast('data loading');
      UserManager.getCurrentUser().then(function (user) {
        $rootScope.$broadcast('data loaded');
        if (!user || !user.id) {
          return $state.go('auth.form');
        }
        $scope.user = user;
      }).catch(function (err) {
        $state.go('auth.form');
      });
    }
  ])

  .controller('ChatIndexController', ['$scope', '$rootScope', '$state', '_',
    function ($scope, $rootScope, $state, _) {
    }
  ])
;