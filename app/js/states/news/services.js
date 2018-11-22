/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 23.11.2018
 */

angular.module('Qemy.services.news', [
  'Qemy.i18n'
])
  .service('NewsManager', ['$rootScope', 'Storage', '$http', '$timeout', ($rootScope, Storage, $http, $timeout) => {

    function dataEncode(data) {
      var paramPairs = [];
      for (var el in data) {
        if (!data.hasOwnProperty(el)) continue;
        paramPairs.push(el + '=' + data[el]);
      }
      return paramPairs.join('&');
    }

    function getNews (params) {
      /*return $http({ method: 'get', url: '/api/contest/all?' + dataEncode(params) })
          .then(function (data) {
              return data.data;
          });*/
    }

    return { getNews };
  }])
;