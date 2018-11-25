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

    function getNews (params) {
      return $http({
        method: 'get',
        url: '/api/news',
        params
      }).then(function (data) {
        return data.data;
      });
    }

    function getNewsById (params = {}) {
      const { id } = params;
      delete params.id;

      return $http({
        method: 'get',
        url: '/api/news/' + id,
        params
      }).then(function (data) {
        return data.data;
      });
    }

    function createNews (data = {}) {
      return $http({
        method: 'post',
        url: '/api/news',
        data
      }).then(function (data) {
        return data.data;
      });
    }

    function updateNews (data = {}) {
      const { id } = data;
      delete data.id;

      return $http({
        method: 'post',
        url: '/api/news/' + id,
        data
      }).then(function (data) {
        return data.data;
      });
    }

    function deleteNewsById (data = {}) {
      const { id } = data;
      delete data.id;

      return $http({
        method: 'delete',
        url: '/api/news/' + id,
        data
      }).then(function (data) {
        return data.data;
      });
    }

    return {
      getNews,
      getNewsById,
      deleteNewsById,
      createNews,
      updateNews,
    };
  }])
;