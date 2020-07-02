/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2020 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 02.07.2020
 */

'use strict';

angular.module('Qemy.ui.rating', [
  'ui.router',
  'Qemy.controllers.rating',
  'Qemy.services.rating'
])
  .config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state('rating', {
          url: '',
          template: '<div ui-view/>',
          abstract: true,
          controller: 'RatingBaseController'
        })
        .state('rating.index', {
          url: '/rating',
          templateUrl: templateUrl('rating', 'index'),
          controller: 'RatingIndexController'
        })
        .state('rating.index-pagination', {
          url: '/rating/page/:pageNumber',
          templateUrl: templateUrl('rating', 'index'),
          controller: 'RatingIndexController'
        })
        .state('rating.create', {
          url: '/rating/create/:contests',
          templateUrl: templateUrl('rating', 'create'),
          controller: 'RatingCreateController'
        })
    }
  ]);