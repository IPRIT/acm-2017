/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.contests', [
    'ui.router',
    'Qemy.controllers.contests',
    'Qemy.services.contests',
    'Qemy.directives.contests'
])
    .config(['$stateProvider', '$urlRouterProvider',
        function($stateProvider, $urlRouterProvider) {

            $stateProvider
                .state('contests', {
                    url: '/contests',
                    template: '<div ui-view/>',
                    abstract: true
                })
                .state('contests.list', {
                    url: '',
                    templateUrl: templateUrl('contests', 'index'),
                    controller: 'ContestsListCtrl'
                })
                .state('contests.list.pagination', {
                    url: '/page/:pageNumber',
                    templateUrl: templateUrl('contests', 'index'),
                    controller: 'ContestsListCtrl'
                })
        }
    ]);