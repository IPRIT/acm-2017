/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 08.11.2015
 */

"use strict";

angular.module('Qemy.services.contest-item', [
    'Qemy.i18n'
])
    .service('ContestItemManager', ['$rootScope', 'Storage', '$http', '$timeout', function($rootScope, Storage, $http, $timeout) {

        function dataEncode(data) {
            var paramPairs = [];
            for (var el in data) {
                if (!data.hasOwnProperty(el)) continue;
                paramPairs.push(el + '=' + data[el]);
            }
            return paramPairs.join('&');
        }

        function getMessages(params) {
            return $http({ method: 'get', url: '/api/contest/' + params.contestId + '/messages' })
                .then(function (data) {
                    return data.data;
                });
        }

        function markAsRead(params) {
            return $http({
                method: 'post',
                url: '/api/contest/' + params.contestId + '/messages/read'
            }).then(function (data) {
                return data.data;
            });
        }

        function getConditions(params) {
            return $http({ method: 'get', url: '/api/contest/' + params.contestId + '/problems' })
                .then(function (data) {
                    return data.data;
                });
        }

        function getCondition(params) {
            return $http({ method: 'get', url: '/api/contest/' + params.contestId + '/problems/' + params.symbolIndex })
                .then(function (data) {
                    return data.data;
                });
        }

        function getLangs(params) {
            return $http({
                method: 'get',
                url: '/api/contest/' + params.contestId + '/problems/' + params.symbolIndex + '/languages'
            }).then(function (data) {
                return data.data;
            });
        }

        function sendSolution(params) {
            return $http({
                method: 'post',
                url: '/api/contest/' + params.contestId + '/solutions',
                data: params
            }).then(function (data) {
                return data.data;
            });
        }

        function getSents(params) {
            return $http({
                method: 'get',
                url: '/api/contest/' + params.contestId + '/solutions/' + params.select,
                params: params
            }).then(function (data) {
                return data.data;
            });
        }

        function getSourceCode(params) {
            return $http({
                method: 'get',
                url: '/api/contest/' + params.contestId + '/solutions/' + params.solutionId + '/code'
            }).then(function (data) {
                return data.data;
            });
        }

        function getTable(params) {
            return $http({
                method: 'get',
                url: '/api/contest/' + params.contestId + '/table'
            }).then(function (data) {
                return data.data;
            });
        }

        function getSentsForCell(params) {
            return $http({
                method: 'get',
                url: '/api/contest/' + params.contestId + '/table/solutions/user/' + params.userId + '/problem/' + params.symbolIndex
            }).then(function (data) {
                return data.data;
            });
        }

        return {
            getConditions: getConditions,
            getCondition: getCondition,
            getLangs: getLangs,
            sendSolution: sendSolution,
            getSents: getSents,
            getSourceCode: getSourceCode,
            getTable: getTable,
            getSentsForCell: getSentsForCell,
            getMessages: getMessages,
            markAsRead: markAsRead
        }
    }])
;