/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

"use strict";

angular.module('Qemy.services.contests', [
    'Qemy.i18n'
])
    .service('ContestsManager', ['$rootScope', 'Storage', '$http', '$timeout', function($rootScope, Storage, $http, $timeout) {

        function dataEncode(data) {
            var paramPairs = [];
            for (var el in data) {
                if (!data.hasOwnProperty(el)) continue;
                paramPairs.push(el + '=' + data[el]);
            }
            return paramPairs.join('&');
        }

        function getContests(params) {
            return $http({ method: 'get', url: '/api/contests/get?' + dataEncode(params) })
                .then(function (data) {
                    return data.data;
                });
        }

        function getContest(params) {
            return $http({ method: 'get', url: '/api/contests/getById?' + dataEncode(params) })
                .then(function (data) {
                    return data.data;
                });
        }

        function canJoin(params) {
            return $http({ method: 'get', url: '/api/contests/canJoin?' + dataEncode(params) })
                .then(function (data) {
                    return data.data;
                });
        }

        function joinContest(contest_id) {
            return $http({
                method: 'post',
                url: '/api/contests/join',
                data: {
                    contest_id: contest_id
                }
            }).then(function (data) {
                return data.data;
            });
        }

        return {
            getContests: getContests,
            getContest: getContest,
            canJoin: canJoin,
            joinContest: joinContest
        }
    }])
;