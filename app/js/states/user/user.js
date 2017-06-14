/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 13.06.2017
 */

'use strict';

angular.module('Qemy.ui.user', [
  'ui.router',
  'Qemy.controllers.user',
  'Qemy.services.user'
])
  .config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      
      $stateProvider
        .state('user', {
          url: '/user',
          template: '<div ui-view/>',
          abstract: true,
          controller: 'UserBaseController'
        })
        .state('user.solutions', {
          url: '/solutions/:select',
          templateUrl: templateUrl('user', 'solutions/solutions'),
          controller: 'UserSolutionsController'
        })
        .state('user.solutions-pagination', {
          url: '/solutions/:select/page/:pageNumber',
          templateUrl: templateUrl('user', 'solutions/solutions'),
          controller: 'UserSolutionsController'
        })
    }
  ]);