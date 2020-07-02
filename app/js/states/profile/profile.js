/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 13.06.2017
 */

'use strict';

angular.module('Qemy.ui.profile', [
  'ui.router',
  'Qemy.controllers.profile',
  'Qemy.services.profile'
])
  .config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      
      $stateProvider
        .state('profile', {
          url: '/profile',
          templateUrl: templateUrl('profile', 'base'),
          controller: 'ProfileBaseController'
        })
    }
  ]);