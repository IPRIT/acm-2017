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

angular.module('Qemy.directives.contests', [])

    .directive('contestListItem', function() {
        return {
            restrict: 'E',
            templateUrl: templateUrl('contests', 'contest-list-item'),
            controller: 'ContestListItem',
            scope: {
                contest: '='
            }
        }
    })
;