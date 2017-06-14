/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 13.06.2017
 */

"use strict";

angular.module('Qemy.services.user', [
  'Qemy.i18n'
])
  .service('TestManager', ['$rootScope', 'Storage', '$http', '$timeout', function($rootScope, Storage, $http, $timeout) {
    
    function getSolutions(params) {
      return $http({
        method: 'get',
        url: '/api/contest/' + params.contestId + '/solutions/' + params.select,
        params: params
      }).then(function (data) {
        return data.data;
      });
    }
    
    return {
      getSolutions: getSolutions
    }
  }])
;