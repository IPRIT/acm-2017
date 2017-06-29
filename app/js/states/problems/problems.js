/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 15.06.2017
 */

'use strict';

angular.module('Qemy.ui.problems', [
  'ui.router',
  'Qemy.controllers.problems',
  'Qemy.services.problems'
])
  .config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
      
      $stateProvider
        .state('problems', {
          url: '/problems',
          template: '<div ui-view/>',
          abstract: true,
          controller: 'ProblemsBaseController'
        })
        .state('problems.item', {
          url: '/:problemId',
          templateUrl: templateUrl('problems', 'item'),
          controller: 'ProblemsItemController'
        })
        .state('problems.item-version', {
          url: '/:problemId/version/:versionNumber',
          templateUrl: templateUrl('problems', 'item'),
          controller: 'ProblemsItemController'
        })
    }
  ]);