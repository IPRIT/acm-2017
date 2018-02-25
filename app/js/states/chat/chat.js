/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 18.02.2018
 */

'use strict';

angular.module('Qemy.ui.chat', [
  'ui.router',
  'Qemy.controllers.chat',
  'Qemy.services.chat',
  'Qemy.directives.chat',
  'Qemy.filters.chat'
])
  .config([ '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state('chat', {
          url: '/chat',
          templateUrl: templateUrl('chat', 'base'),
          abstract: true,
          controller: 'ChatBaseController'
        })
        .state('chat.peer', {
          url: '/{peerId}',
          templateUrl: templateUrl('chat', 'index'),
          controller: 'ChatIndexController'
        })
    }
  ]);