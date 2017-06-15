/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 15.06.2017
 */

'use strict';

/* Controllers */

angular.module('Qemy.controllers.problems', [])
  
  .controller('ProblemsBaseController', ['$scope', '$rootScope', '$state', '_', 'SocketService', '$mdToast', '$mdSidenav', '$log', '$timeout', 'ErrorService', 'UserManager',
    function ($scope, $rootScope, $state, _, SocketService, $mdToast, $mdSidenav, $log, $timeout, ErrorService, UserManager) {
      $scope.user = {};

      function updateUser() {
        return UserManager.getCurrentUser().then(function (user) {
          $scope.user = user;
        }).catch(function (error) {
          ErrorService.show(error);
        });
      }
      updateUser();
    }
  ])
  
  .controller('ProblemsItemController', ['$scope', '$rootScope', '$state', '_', '$element', 'UserManager', 'AdminManager', 'ErrorService', '$mdDialog', '$timeout', 'ProblemsManager', 'SocketService',
    function ($scope, $rootScope, $state, _, $element, UserManager, AdminManager, ErrorService, $mdDialog, $timeout, ProblemsManager, SocketService) {

      $scope.$emit('change_title', {
        title: 'Условие | ' + _('app_name')
      });

      var problemId = $state.params.problemId;
      $scope.condition = {};

      function updateProblem() {
        $rootScope.$broadcast('data loading');
        ProblemsManager.getProblem({ problemId: problemId }).then(function (result) {
          result.htmlStatement = result.htmlStatement
            .replace(/(\<\!\–\–\s?google_ad_section_(start|end)\s?\–\–\>)/gi, '');
          $scope.condition = result;
          $scope.$emit('change_title', {
            title: '[' + result.systemType.toUpperCase() + '] ' + result.title + ' | ' + _('app_name')
          });
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $rootScope.$broadcast('data loaded');
        });
      }
      updateProblem();

      $scope.openImage = function (ev, file) {
        var useFullScreen = ($mdMedia('sm') || $mdMedia('xs'));
        $mdDialog.show({
          controller: ['$scope', function ($scope) {
            $scope.file = file;
            $scope.close = function () {
              $mdDialog.hide();
            };
          }],
          template: '<md-dialog aria-label="Image"  ng-cloak>\n  <form>\n    <md-toolbar>\n      <div class="md-toolbar-tools">\n        <h2>{{file.title ? file.title : "Изображение"}}</h2>\n        <span flex></span>\n        <md-button class="md-icon-button" ng-click="close()">\n          <md-icon md-svg-src="/img/icons/ic_close_48px.svg" aria-label="Close dialog"></md-icon>\n        </md-button>\n      </div>\n    </md-toolbar>\n    <md-dialog-content>\n      <div class="md-dialog-content">\n        <img class="markdown__image" ng-src="{{file.url}}" title="{{file.title}}">\n      </div>\n    </md-dialog-content>\n    <md-dialog-actions layout="row">\n      <md-button style="margin-right: 20px;" ng-click="close()">\n        Закрыть\n      </md-button>\n    </md-dialog-actions>\n  </form>\n</md-dialog>',
          parent: angular.element(document.body),
          targetEvent: ev,
          clickOutsideToClose: true
        });

        ev.preventDefault();
        return false;
      };
    }
  ])
;