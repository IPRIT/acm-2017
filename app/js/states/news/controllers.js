/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 23.11.2018
 */

/* Controllers */

angular.module('Qemy.controllers.news', [])

  // List
  .controller('NewsListController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {
      $scope.items = [{
        id: 1,
        name: 'Сегодня представлен новый дизайн системы',
        author: {
          id: 2,
          fullName: 'Администратор'
        },
        createdAt: new Date()
      }, {
        id: 5,
        name: 'Контестов сегодня не будет, занятия перенесены на 26.07 18:00',
        author: {
          id: 1,
          fullName: 'Александр Белов'
        },
        createdAt: new Date()
      }, {
        id: 4,
        name: 'Контестов сегодня не будет, занятия перенесены на 26.07 18:00',
        author: {
          id: 1,
          fullName: 'Александр Белов'
        },
        createdAt: new Date()
      }];
    }
  ])

  // List Item
  .controller('NewsListItemController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {
      $scope.day = 26;
      $scope.month = 'ноя';
    }
  ])

  // Item Abstract
  .controller('NewsItemBaseController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {

    }
  ])

  // Item
  .controller('NewsItemController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {

    }
  ])

  // Create Item
  .controller('NewsCreateItemController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {

    }
  ])

  // Edit Item
  .controller('NewsEditItemController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {

    }
  ])
;