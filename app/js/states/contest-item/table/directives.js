/*
 * Acm system
 * https://github.com/IPRIT/acm-2017
 *
 * Copyright (c) 2017 "IPRIT" Alex Belov
 * Licensed under the BSD license.
 * Created on 04.08.2017
 */

"use strict";

/* Directives */

angular.module('Qemy.directives.contest-item.table', [])

  .directive('contestTable', function () {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: templateUrl('contest-item/contest-table', 'table'),
      controller: 'ContestTable'
    }
  })

  .directive('tableHeaderRow', function () {
    return {
      restrict: 'EA',
      templateUrl: templateUrl('contest-item/contest-table', 'header-row'),
      controller: 'ContestTableHeaderRow'
    }
  })

  .directive('tableRow', function () {
    return {
      restrict: 'EA',
      scope: {
        row: '='
      },
      templateUrl: templateUrl('contest-item/contest-table', 'row'),
      controller: 'ContestTableRow'
    }
  })

  .directive('tableCell', function () {
    return {
      restrict: 'EA',
      scope: {
        cell: '='
      },
      templateUrl: templateUrl('contest-item/contest-table', 'cell'),
      controller: 'ContestTableCell'
    }
  })
;