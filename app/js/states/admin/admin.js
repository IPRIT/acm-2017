/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.admin', [
  'ui.router',
  'Qemy.controllers.admin',
  'Qemy.services.admin',
  'Qemy.directives.admin',
  'Qemy.filters.admin'
])
  .config([ '$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state('admin', {
          url: '/admin',
          templateUrl: templateUrl('admin', 'admin-base'),
          abstract: true,
          controller: 'AdminBaseController'
        })
        .state('admin.index', {
          url: '/contests',
          templateUrl: templateUrl('admin', 'contests/index'),
          controller: 'AdminIndexController'
        })
        .state('admin.index-pagination', {
          url: '/contests/page/:pageNumber',
          templateUrl: templateUrl('admin', 'contests/index'),
          controller: 'AdminIndexController'
        })
        .state('admin.edit-contest', {
          url: '/contests/edit/:contestId',
          templateUrl: templateUrl('admin', 'contests/edit'),
          controller: 'AdminEditContestController'
        })
        .state('admin.create-contest', {
          url: '/contests/create',
          templateUrl: templateUrl('admin', 'contests/create'),
          controller: 'AdminCreateContestController'
        })
        .state('admin.copy-contest', {
          url: '/contests/copy/:contestId',
          templateUrl: templateUrl('admin', 'contests/edit'),
          controller: 'AdminCopyContestController'
        })
        .state('admin.users-list', {
          url: '/users',
          templateUrl: templateUrl('admin', 'users/list'),
          controller: 'AdminUsersListController'
        })
        .state('admin.users-pagination', {
          url: '/users/page/:pageNumber',
          templateUrl: templateUrl('admin', 'users/list'),
          controller: 'AdminUsersListController'
        })
        .state('admin.create-user', {
          url: '/users/create',
          templateUrl: templateUrl('admin', 'users/create'),
          controller: 'AdminCreateUserController'
        })
        .state('admin.create-user-into-group', {
          url: '/users/create-into-group',
          templateUrl: templateUrl('admin', 'users/create-into-group'),
          controller: 'AdminCreateUsersIntoGroupController'
        })
        .state('admin.problems', {
          url: '/problems',
          templateUrl: templateUrl('admin', 'admin-problems'),
          controller: 'AdminProblemsController'
        })
        .state('admin.problems-edit', {
          url: '/problems/edit/:problemId',
          templateUrl: templateUrl('admin', 'problems/edit-item'),
          controller: 'AdminProblemsItemEditController'
        })
        .state('admin.edit-user', {
          url: '/users/edit/:userId',
          templateUrl: templateUrl('admin', 'users/edit'),
          controller: 'AdminEditUserController'
        })
        .state('admin.server', {
          url: '/server',
          templateUrl: templateUrl('admin', 'admin-server'),
          controller: 'AdminServerController'
        })
        .state('admin.contests-rating', {
          url: '/rating',
          template: '<div ui-view/>',
          controller: 'AdminRatingBaseController',
          abstract: true
        })
        .state('admin.contests-rating.create', {
          url: '/create',
          template: '<div ui-view/>',
          controller: 'AdminRatingCreateBaseController',
          abstract: true
        })
        .state('admin.contests-rating.create.index', {
          url: '',
          templateUrl: templateUrl('admin', 'ratings/create'),
          controller: 'AdminRatingCreateController'
        })
        .state('admin.contests-rating.create.index-pagination', {
          url: '/page/:pageNumber',
          templateUrl: templateUrl('admin', 'ratings/create'),
          controller: 'AdminRatingCreateController'
        })
        .state('admin-contests-rating-table', {
          url: '/admin/rating/table/:contests',
          templateUrl: templateUrl('admin', 'ratings/table'),
          controller: 'AdminRatingTableController'
        })

        .state('admin.groups', {
          url: '/groups',
          template: '<div ui-view/>',
          controller: 'AdminGroupsBaseController',
          abstract: true
        })
        .state('admin.groups.index', {
          url: '',
          templateUrl: templateUrl('admin', 'groups/index'),
          controller: 'AdminGroupsController'
        })
        .state('admin.groups.index-pagination', {
          url: '/page/:pageNumber',
          templateUrl: templateUrl('admin', 'groups/index'),
          controller: 'AdminGroupsController'
        })
        .state('admin.groups.create', {
          url: '/create',
          templateUrl: templateUrl('admin', 'groups/create'),
          controller: 'AdminGroupsCreateController'
        })
        .state('admin.groups.edit', {
          url: '/edit/:groupId',
          templateUrl: templateUrl('admin', 'groups/edit'),
          controller: 'AdminGroupsEditController'
        })
    }
  ]);