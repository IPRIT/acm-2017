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
    .controller('AuthFormController', ['$scope', '_', '$rootScope', '$http', '$state', '$mdDialog',
        function($scope, _, $rootScope, $http, $state, $mdDialog) {
            $scope.$emit('change_title', {
                title: 'Авторизация | ' + _('app_name')
            });

            $scope.form = {};

            $scope.submitForm = function () {
                console.log($scope.form);
                $rootScope.$broadcast('data loading');
                var authProcess = $http.post('/api/auth/signIn', $scope.form);
                authProcess.success(function (data) {
                    $rootScope.$broadcast('data loaded');
                    console.log(data);
                    if (data.error) {
                        $mdDialog.show(
                            $mdDialog.alert()
                                .clickOutsideToClose(true)
                                .title('Ошибка')
                                .content('Неверный логин или пароль.')
                                .ariaLabel('Alert Dialog Auth')
                                .ok('Закрыть')
                        );
                    } else {
                        $state.go('index');
                    }
                });
            };

            $scope.valid = false;
            $scope.$watch('authForm.$valid', function(newVal) {
                $scope.valid = newVal;
            });
        }
    ])
;