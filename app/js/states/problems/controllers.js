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
  
  .controller('ProblemsItemController', ['$scope', '$rootScope', '$state', '_', '$element', 'UserManager', 'AdminManager', 'ErrorService', '$mdDialog', '$timeout', 'ProblemsManager', 'SocketService', '$mdToast', '$sce',
    function ($scope, $rootScope, $state, _, $element, UserManager, AdminManager, ErrorService, $mdDialog, $timeout, ProblemsManager, SocketService, $mdToast, $sce) {

      $scope.$emit('change_title', {
        title: 'Условие | ' + _('app_name')
      });

      var problemId = $state.params.problemId;
      $scope.versionNumber = $state.params.versionNumber;
      $scope.condition = {};

      function updateProblem() {
        $rootScope.$broadcast('data loading');
        ProblemsManager.getProblem({ problemId: problemId, versionNumber: $scope.versionNumber }).then(function (result) {
          if (result.attachments
            && Array.isArray( result.attachments.files )) {
            result.attachments.files = result.attachments.files.map(file => {
              if (file.embedUrl) {
                //file.embedUrl = $sce.trustAsResourceUrl(file.embedUrl);
              } else if (file.type === 'pdf' && file.downloadUrl) {
                /*file.embedUrl = $sce.trustAsResourceUrl(
                  file.downloadUrl.replace(/(export=download&)/i, '')
                );*/
                file.embedUrl = file.downloadUrl.replace(/(export=download&)/i, '');
              } else {
                // file.url = $sce.trustAsResourceUrl(file.url);
              }
              return file;
            });
            if (result.attachments.config.files_show_embed) {
              result.attachments.files = result.attachments.files.sort((a, b) => {
                if (a.embedUrl && b.embedUrl) {
                  return 0;
                } else if (b.embedUrl) {
                  return 1;
                }
                return -1;
              });
            }
          }
          result.htmlStatement = (result.htmlStatement || '')
            .replace(/(\<\!\–\–\s?google_ad_section_(start|end)\s?\–\–\>)/gi, '');
          $scope.condition = result;
          $scope.$emit('change_title', {
            title: 'Версия #' + result.versionNumber + ' [' + result.systemType.toUpperCase() + '] ' + result.title + ' | ' + _('app_name')
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

      $scope.refreshProblem = function (problem) {
        $rootScope.$broadcast('data loading');
        $scope.rescanning = true;
        ProblemsManager.refreshProblem({ problemId: problem.id }).then(function (result) {
          $state.go('problems.item-version', { problemId: problem.id, versionNumber: result.versionNumber });
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $rootScope.$broadcast('data loaded');
          $scope.rescanning = false;
        });
      };

      $scope.rollbackVersion = function (problem) {
        $rootScope.$broadcast('data loading');
        ProblemsManager.rollbackProblem({ problemId: problem.id, versionNumber: problem.versionNumber }).then(function (result) {
          $mdToast.show(
            $mdToast.simple()
              .parent(document.querySelector('.notifications'))
              .textContent('Версия #' + problem.versionNumber + ' восстановлена. Актуальная версия: #' + result.versionNumber)
              .position('right top')
              .hideDelay(5000)
          );
          $state.go('problems.item', { problemId: problem.id });
        }).catch(function (result) {
          ErrorService.show(result);
        }).finally(function () {
          $rootScope.$broadcast('data loaded');
        });
      };
    }
  ])
;