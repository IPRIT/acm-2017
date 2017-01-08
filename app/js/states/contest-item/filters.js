/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 26.11.2015
 */

"use strict";

angular.module('Qemy.filters.contest-item', [
    'Qemy.i18n'
])
    .filter('formatStartTime', [function() {
        return function (diffTime) {
            var allSeconds = Math.floor(diffTime / 1000),
                seconds = allSeconds % 60,
                minutes = Math.floor(allSeconds / 60),
                hours = Math.floor(minutes / 60);
            minutes %= 60;
            var zF = function (num) { return num >= 0 && num < 10 ? '0' + num : num;},
                formatString = 'hh:mm:ss';
            return formatString
                .replace(/(hh)/gi, zF(hours))
                .replace(/(mm)/gi, zF(minutes))
                .replace(/(ss)/gi, zF(seconds));
        };
    }])

    .filter('sripTags', [function() {
        return function (code) {
            return encodeEntities(code);
        };
    }])

    .filter('mathRound', [function() {
        return function (num) {
            num = +num || 0;
            if (num - parseInt(num) > 0) {
                return (+num).toFixed(2);
            }
            return num;
        };
    }])
;