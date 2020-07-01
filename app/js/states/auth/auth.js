/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 07.11.2015
 */

'use strict';

angular.module('Qemy.ui.auth', [
  'ui.router',
  'Qemy.controllers.auth'
])
  .config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {

      $stateProvider
        .state('auth', {
          url: '/auth',
          template: '<div ui-view/>',
          abstract: true
        })
        .state('auth.form', {
          url: '',
          controller: 'AuthFormController',
          templateUrl: templateUrl('user', 'auth-form')
        })
        .state('auth.register-form', {
          url: '/register',
          controller: 'AuthRegisterFormController',
          templateUrl: templateUrl('user', 'register-form')
        })
        .state('auth.forget-password-form', {
          url: '/forget-password',
          controller: 'AuthForgetPasswordFormController',
          templateUrl: templateUrl('user', 'forget-password-form')
        })
        .state('auth.reset-password-form', {
          url: '/reset',
          controller: 'AuthResetPasswordFormController',
          templateUrl: templateUrl('user', 'reset-password-form')
        })
        .state('auth.link-email', {
          url: '/link-email',
          controller: 'AuthLinkEmailController',
          templateUrl: templateUrl('user', 'link-email')
        })
    }
  ]);