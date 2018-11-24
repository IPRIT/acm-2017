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
  .controller('NewsListController', ['$scope', '$rootScope', '$state', '$timeout', 'NewsManager', 'UserManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, $timeout, NewsManager, UserManager, _, ErrorService) {

      $scope.getMe = () => {
        return UserManager.getCurrentUser();
      };

      $scope.getMe().then(user => {
        $scope.user = user;
        safeApply($scope);
      });

      $scope.isLoaded = false;

      $scope.limit = 3;
      $scope.offset = 0;

      $scope.mockItems = Array( $scope.limit ).fill(0).map((v, i) => i);

      $scope.getNews = () => {
        return NewsManager.getNews({
          offset: $scope.offset,
          limit: $scope.limit
        });
      };

      $scope.getNews().then(items => {
        return $timeout(_ => {
          return items;
        }, 500);
      }).then(items => {
        $scope.items = wrapItems( items );
        $scope.isLoaded = true;
      }).catch(error => {
        ErrorService.show( error );
      });

      function wrapItems (items) {
        return items.map(item => {
          const createdAt = new Date( item.createdAt );
          const monthIndex = createdAt.getMonth();
          const day = zeroPad( createdAt.getDate() );
          const monthRu = resolveMonthRu( monthIndex );

          const customProps = {
            dateCircle: {
              day, monthRu
            },
            createdAt
          };

          return Object.assign( item, customProps );
        });
      }

      function resolveMonthRu (monthIndex) {
        return [
          'янв', 'фев', 'мар', 'апр',
          'май', 'июн', 'июл', 'авг',
          'сен', 'окт', 'ноя', 'дек',
        ][ monthIndex ];
      }

      function zeroPad (value) {
        return value.toString().padLeft( 2, '0' )
      }
    }
  ])

  // List Item
  .controller('NewsListItemController', ['$scope', '$rootScope', '$state', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, AdminManager, _, ErrorService) {
    }
  ])

  // Item Abstract
  .controller('NewsItemBaseController', ['$scope', '$rootScope', '$state', 'UserManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, UserManager, _, ErrorService) {
      $scope.getMe = () => {
        return UserManager.getCurrentUser();
      };

      $scope.getMe().then(user => {
        $scope.user = user;
        safeApply($scope);
      });
    }
  ])

  // Item
  .controller('NewsItemController', ['$scope', '$rootScope', '$state', 'NewsManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, NewsManager, _, ErrorService) {
      $scope.newsId = $state.params.newsId;

      $scope.getNewsById = id => {
        return NewsManager.getNewsById({ id });
      };

      $scope.getNewsById( $scope.newsId ).then(item => {
        $scope.item = wrapItem( item );
      }).catch(error => {
        ErrorService.show( error );
      });

      function wrapItem (item) {
        const createdAt = new Date( item.createdAt );
        const monthIndex = createdAt.getMonth();
        const day = zeroPad( createdAt.getDate() );
        const monthRu = resolveMonthRu( monthIndex );

        const createdAtText = `${day} ${monthRu} ${createdAt.getFullYear()} в ${zeroPad( createdAt.getHours() )}:${zeroPad( createdAt.getMinutes() )}`;

        const customProps = {
          createdAtText,
          createdAt
        };

        return Object.assign( item, customProps );
      }

      function resolveMonthRu (monthIndex) {
        return [
          'января', 'февраля', 'марта', 'апреля',
          'мая', 'июня', 'июля', 'августа',
          'сентября', 'октября', 'ноября', 'декабря',
        ][ monthIndex ];
      }

      function zeroPad (value) {
        return value.toString().padLeft( 2, '0' )
      }
    }
  ])

  // Create Item
  .controller('NewsCreateItemController', ['$scope', '$rootScope', '$state', 'NewsManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, NewsManager, _, ErrorService) {
      $scope.froalaOptions = {
        language: 'ru',
        linkAlwaysBlank: true,
        placeholder: "Текст новости..."
      };

      $scope.title = '';
      $scope.body = '';

      $scope.submit = _ => {
        const data = {
          title: $scope.title,
          body: $scope.body
        };

        return NewsManager.createNews( data ).then(item => {
          $state.go('news.item', { newsId: item.id });
        }).catch(error => {
          ErrorService.show( error );
        });
      };
    }
  ])

  // Edit Item
  .controller('NewsEditItemController', ['$scope', '$rootScope', '$state', 'NewsManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, NewsManager, _, ErrorService) {
      $scope.froalaOptions = {
        language: 'ru',
        linkAlwaysBlank: true,
        placeholder: "Текст новости..."
      };

      $scope.title = '';
      $scope.body = '';

      $scope.newsId = $state.params.newsId;

      $scope.getNewsById = id => {
        return NewsManager.getNewsById({ id });
      };

      $scope.getNewsById( $scope.newsId ).then(item => {
        $scope.item = item;
        $scope.title = item.title;
        $scope.body = item.body;

        safeApply( $scope );
      }).catch(error => {
        ErrorService.show( error );
      });

      $scope.submit = _ => {
        const data = {
          id: $scope.newsId,
          title: $scope.title,
          body: $scope.body
        };

        return NewsManager.updateNews( data ).then(_ => {
          $state.go('news.item', { newsId: $scope.newsId });
        }).catch(error => {
          ErrorService.show( error );
        });
      };
    }
  ])
;