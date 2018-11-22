/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 23.11.2018
 */

angular.module('Qemy.ui.news', [
    'ui.router',
    'Qemy.controllers.news',
    'Qemy.services.news',
    'Qemy.directives.news'
])
    .config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

          $stateProvider
            .state('news', {
              url: '/news/{newsId:[0-9]+}',
              template: '<div ui-view/>',
              abstract: true,
              controller: 'NewsItemBaseController'
            })
            .state('news.item', {
              url: '',
              templateUrl: templateUrl('news-item', 'news-item'),
              controller: 'NewsItemController'
            })
            .state('news-create', {
              url: '/news/create',
              templateUrl: templateUrl('news-item', 'news-create'),
              controller: 'NewsCreateItemController'
            })
            .state('news.item.edit', {
              url: '/edit',
              templateUrl: templateUrl('news-item', 'news-edit'),
              controller: 'NewsEditItemController'
            })
        }
    ]);