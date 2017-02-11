/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.auth', [
    'Qemy.i18n'
])
    .controller('AuthFormController', ['$scope', '_', '$rootScope', '$http', '$state', '$mdDialog', 'ErrorService',
        function($scope, _, $rootScope, $http, $state, $mdDialog, ErrorService) {
            $scope.$emit('change_title', {
                title: 'Авторизация | ' + _('app_name')
            });

            $scope.form = {};

            $scope.submitForm = function () {
                console.log($scope.form);
                $rootScope.$broadcast('data loading');
                var authProcess = $http.post('/api/user/authenticate/sign-in', $scope.form);
                authProcess.then(function (data) {
                    console.log(data);
                    $rootScope.$broadcast('data loaded');
                    $state.go('index');
                }).catch(function (result) {
                    $rootScope.$broadcast('data loaded');
                    ErrorService.show(result);
                });
            };

            $scope.valid = false;
            $scope.$watch('authForm.$valid', function(newVal) {
                $scope.valid = newVal;
            });
        }
    ])
;