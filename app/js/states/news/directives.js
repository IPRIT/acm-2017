/*
 * Acm system
 * https://github.com/IPRIT
 *
 * Copyright (c) 2018 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 23.11.2018
 */

/* Directives */

angular.module('Qemy.directives.news', [])

    .directive('newsListItem', function() {
        return {
            restrict: 'E',
            templateUrl: templateUrl('news-list', 'news-list-item'),
            controller: 'NewsListItemController',
            scope: {
                item: '='
            }
        }
    })
;