'use strict';

/* Filters */

angular.module('Qemy.filters', [])

.filter('keyboardShortcut', ['$window', function($window) {
    return function(str) {
        if (!str) return;
        var keys = str.split('-');
        var isOSX = /Mac OS X/.test($window.navigator.userAgent);
        var seperator = (!isOSX || keys.length > 2) ? '+' : '';
        var abbreviations = {
            M: isOSX ? '⌘' : 'Ctrl',
            A: isOSX ? 'Option' : 'Alt',
            S: 'Shift'
        };
        return keys.map(function(key, index) {
            var last = index == keys.length - 1;
            return last ? key : abbreviations[key];
        }).join(seperator);
    };
}])

.filter('escape', [function(){
    return function(msg) {
        var RexStr = /\<|\>|\"|\'|\&/g;
        msg = (msg + '').replace(RexStr,
            function(MatchStr){
                switch(MatchStr){
                    case "<":
                        return "&lt;";
                        break;
                    case ">":
                        return "&gt;";
                        break;
                    case "\"":
                        return "&quot;";
                        break;
                    case "'":
                        return "&#39;";
                        break;
                    case "&":
                        return "&amp;";
                        break;
                    default :
                        break;
                }
            }
        );
        return msg;
    }
}])
;