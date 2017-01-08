/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2015 "IPRIT" Alex Belov, contributors
 * Licensed under the BSD license.
 * Created on 11.11.2015
 */

"use strict";

/* Directives */

angular.module('Qemy.directives.contest-item', [])

    .directive('xTest', function() {
        return {
            template: '<div></div>'
        }
    })

    .directive('chatSidenav', function () {
        return {
            restrict: 'E',
            replace: true,
            templateUrl: templateUrl('contest-item', 'contest-chat/sidenav')
        }
    })

    .directive('insertChatSidenav', function () {
        return {
            restrict: 'A',
            compile: function (tElement, tAttrs, transclude) {
                angular.element(tElement)
                    .append('<chat-sidenav/>');
            }
        }
    })
;