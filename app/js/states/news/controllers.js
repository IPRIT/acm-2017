/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 23.11.2018
 */

/* Controllers */

const shortMonthsRu = [
  'янв', 'фев', 'мар', 'апр',
  'май', 'июн', 'июл', 'авг',
  'сен', 'окт', 'ноя', 'дек',
];
const shortMonthsEn = [
  'jan', 'feb', 'mar', 'apr',
  'may', 'jun', 'jul', 'aug',
  'sep', 'oct', 'nov', 'dec',
];
const monthsRu = [
  'января', 'февраля', 'марта', 'апреля',
  'мая', 'июня', 'июля', 'августа',
  'сентября', 'октября', 'ноября', 'декабря',
];
const monthsEn = [
  'january', 'february', 'march', 'april',
  'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december'
];

const froalaOptions = {
  language: 'ru',
  linkAlwaysBlank: true,
  imageUploadURL: '/upload/image',
  placeholder: "Текст новости..."
};

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

      $scope.limit = 5;
      $scope.offset = 0;

      $scope.showMore = true;
      $scope.isFirstLoaded = false;
      $scope.isMoreLoading = false;

      $scope.getNews = () => {
        return NewsManager.getNews({
          offset: $scope.offset,
          limit: $scope.limit
        });
      };

      function updateList () {
        $scope.offset = 0;
        $scope.isFirstLoaded = false;
        $scope.showMore = true;

        return $scope.getNews().then(items => {
          return items;
        }).then(items => {
          $scope.items = wrapItems( items );
          $scope.showMore = items.length >= $scope.limit;
          $scope.offset += items.length;
          safeApply( $scope );
        }).catch(error => {
          ErrorService.show( error );
        }).finally(() => {
          $scope.isFirstLoaded = true;
        });
      }

      function loadMore () {
        $scope.isMoreLoading = true;
        return $scope.getNews().then(items => {
          return items;
        }).then(items => {
          $scope.items.push(
            ...wrapItems( items )
          );
          $scope.showMore = items.length >= $scope.limit;
          $scope.offset += items.length;
          safeApply( $scope );
        }).catch(error => {
          ErrorService.show( error );
        }).finally(() => {
          $scope.isMoreLoading = false;
        });
      }

      $scope.loadMore = loadMore;

      updateList();

      $scope.$on('news.update', _ => {
        updateList();
      });

      function wrapItems (items) {
        return items.map(item => {
          const createdAt = new Date( item.createdAt );
          const monthIndex = createdAt.getMonth();
          const day = zeroPad( createdAt.getDate() );
          const monthRu = resolveMonthRu( monthIndex );

          const collapsedGroups = item.Groups.slice(0, 6);
          const moreGroups = item.Groups.slice(6);

          const customProps = {
            dateCircle: {
              day, monthRu
            },
            createdAt,
            collapsedGroups,
            moreGroups
          };

          return Object.assign( item, customProps );
        });
      }

      function resolveMonthRu (monthIndex) {
        return (Config.I18n.locale === 'en-us' ? shortMonthsEn : shortMonthsRu)[ monthIndex ];
      }

      function zeroPad (value) {
        return value.toString().padStart( 2, '0' )
      }
    }
  ])

  // List Item
  .controller('NewsListItemController', ['$scope', '$rootScope', '$state', '$mdDialog', 'NewsManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, $mdDialog, NewsManager, _, ErrorService) {

      function confirmation (ev, item) {
        const confirm = $mdDialog.confirm()
          .title('Подтверждение')
          .content(`Вы действительно хотите удалить новость «${item.title}»?`)
          .ariaLabel('Подтверждение')
          .ok('Да')
          .cancel('Отмена')
          .targetEvent(ev);
        return $mdDialog.show(confirm);
      }

      $scope.deleteNewsById = (ev, item) => {
        return confirmation( ev, item ).then(_ => {
          return NewsManager.deleteNewsById({ id: item.id });
        }).then(_ => {
          $scope.$emit('news.update');
        });
      };
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

        const at = Config.I18n.locale === 'en-us' ? 'at' : 'в';
        const createdAtText = `${day} ${monthRu} ${createdAt.getFullYear()} ${at} ${zeroPad( createdAt.getHours() )}:${zeroPad( createdAt.getMinutes() )}`;

        const customProps = {
          createdAtText,
          createdAt
        };

        return Object.assign( item, customProps );
      }

      function resolveMonthRu (monthIndex) {
        return (Config.I18n.locale === 'en-us' ? monthsEn : monthsRu)[ monthIndex ];
      }

      function zeroPad (value) {
        return value.toString().padStart( 2, '0' )
      }
    }
  ])

  // Create Item
  .controller('NewsCreateItemController', ['$scope', '$rootScope', '$state', 'NewsManager', 'UserManager', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, NewsManager, UserManager, AdminManager, _, ErrorService) {
      $scope.froalaOptions = froalaOptions;

      $scope.getMe = () => {
        return UserManager.getCurrentUser();
      };

      $scope.getMe().then(user => {
        $scope.user = user;
        safeApply($scope);
      });

      $scope.title = '';
      $scope.body = '';
      $scope.groups = [];

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(data => {
          return data.groups;
        });
      };

      $scope.submit = _ => {
        const data = {
          title: $scope.title,
          body: $scope.body,
          groupsIds: $scope.groups.map(group => group.id)
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
  .controller('NewsEditItemController', ['$scope', '$rootScope', '$state', 'NewsManager', 'UserManager', 'AdminManager', '_', 'ErrorService',
    function ($scope, $rootScope, $state, NewsManager, UserManager, AdminManager, _, ErrorService) {
      $scope.froalaOptions = froalaOptions;

      $scope.getMe = () => {
        return UserManager.getCurrentUser();
      };

      $scope.getMe().then(user => {
        $scope.user = user;
        safeApply($scope);
      });

      $scope.title = '';
      $scope.body = '';
      $scope.groups = [];

      $scope.chips = {
        selectedItem: '',
        searchText: ''
      };

      $scope.groupSearch = function (query) {
        return AdminManager.searchGroups({ q: query }).then(data => {
          return data.groups;
        });
      };

      $scope.newsId = $state.params.newsId;

      $scope.getNewsById = id => {
        return NewsManager.getNewsById({ id });
      };

      $scope.getNewsById( $scope.newsId ).then(item => {
        $scope.item = item;
        $scope.title = item.title;
        $scope.body = item.body;
        $scope.groups = item.Groups;

        safeApply( $scope );
      }).catch(error => {
        ErrorService.show( error );
      });

      $scope.submit = _ => {
        const data = {
          id: $scope.newsId,
          title: $scope.title,
          body: $scope.body,
          groupsIds: $scope.groups.map(group => group.id)
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