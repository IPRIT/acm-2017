/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 15.06.2017
 */

"use strict";

angular.module('Qemy.services.problems', [
  'Qemy.i18n'
])
  .service('ProblemsManager', ['$rootScope', 'Storage', '$http', function($rootScope, Storage, $http) {

    function getProblem(params) {
      return $http({
        method: 'get',
        url: '/api/problems/' + params.problemId + (params.versionNumber ? '/version/' + params.versionNumber : '')
      }).then(function (data) {
        return data.data;
      });
    }

    function refreshProblem(params) {
      return $http({
        method: 'post',
        url: '/api/admin/problems/' + params.problemId + '/rescan'
      }).then(function (data) {
        return data.data;
      });
    }
    
    return {
      getProblem: getProblem,
      refreshProblem: refreshProblem
    }
  }])
;