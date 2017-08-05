'use strict';

/* Directives */

angular.module('Qemy.directives', [])
  
  .directive('emailFilter', function() {
    return {
      require : 'ngModel',
      link : function(scope, element, attrs, ngModel) {
        var except = attrs.emailFilter,
          emptyKey = 'empty';
        ngModel.$parsers.push(function(value) {
          function setValidity(message, bool) {
            ngModel.$setValidity(message, bool);
          }
          var emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            isValid = emailRegex.test(value.toString());
          setValidity('email', value.length ? isValid : except == emptyKey);
          
          return value;
        })
      }
    }
  })
  
  .directive('mySubmitOnEnter', function () {
    return {
      link: link
    };
    function link($scope, element, attrs) {
      element.on('keydown', function (event) {
        if (event.keyCode == 13) {
          element.trigger('submit');
        }
      });
    }
  })
  
  .directive('pageHeader', function () {
    return {
      restrict: 'E',
      scope: true,
      templateUrl: templateUrl('header', 'index'),
      controller: 'HeaderCtrl'
    }
  })
  
  .directive('pageContent', function () {
    return {
      restrict: 'E',
      transclude: true,
      scope: true,
      templateUrl: templateUrl('page', 'wrapper'),
      controller: 'WrapperCtrl'
    }
  })
  
  .directive('pageFooter', function () {
    return {
      restrict: 'EA',
      templateUrl: templateUrl('page', 'footer')
    }
  })
  
  .directive('pageLoading', function () {
    return {
      restrict: 'EA',
      templateUrl: templateUrl('page', 'loading-layer'),
      scope: true,
      link: function (scope, element, attrs) {
        element.addClass('page__loading');
      }
    };
  })

  .directive('loadingSpinner', function () {
    return {
      restrict: 'EA',
      templateUrl: templateUrl('page', 'loading-spinner'),
      scope: true,
      link: function (scope, element, attrs) {
        var radius = attrs.radius || 48;
        var rootElement = element.find('.loader');
        rootElement.css({
          width: radius + 'px',
          height: radius + 'px',
        });
      }
    };
  })

  .directive('joinContest', function () {
    return {
      restrict: 'EA',
      scope: {
        contest: '='
      },
      link: function (scope, element, attrs) {
        element.on('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          scope.joinContest();
        });
      },
      controller: ['$scope', 'ContestsManager', '$mdDialog', '$state', function ($scope, ContestsManager, $mdDialog, $state) {
        var contest = $scope.contest;

        function joinContest() {
          ContestsManager.canJoin({ contestId: contest.id })
            .then(function (result) {
              if (!result || !result.hasOwnProperty('can')) {
                $scope.loadingData = false;
                return;
              }
              handleResponse(result);
            });

          function handleResponse(result) {
            if (!result.can) {
              var alert = $mdDialog.alert()
                .clickOutsideToClose(true)
                .title('Уведомление')
                .ariaLabel('Alert Dialog')
                .ok('Ок');
              if (result.reason === 'NOT_IN_TIME') {
                alert.content('Контест еще не начат или уже завершен.');
              } else {
                alert.content(
                  'Доступ запрещен. Вы не состоите в нужной группе, контест недоступен или удален.'
                );
              }
              $mdDialog.show(alert);
            } else {
              if (result.confirm) {
                var confirm = $mdDialog.confirm()
                  .title('Предупреждение')
                  .content('Вы действительно хотите войти в контест? Вы будете добавлены в таблицу результатов.')
                  .clickOutsideToClose(true)
                  .ariaLabel('Confirm dialog')
                  .ok('Да')
                  .cancel('Отмена');
                $mdDialog.show(confirm).then(function() {
                  join();
                });
              } else if (!result.joined) {
                join();
              } else {
                $state.go('contest.item', {
                  contestId: contest.id
                });
              }
            }
          }

          function join() {
            ContestsManager.joinContest(contest.id)
              .then(function (result) {
                if (result.result) {
                  success();
                }
              });

            function success() {
              $state.go('contest.item', {
                contestId: contest.id
              });
            }
          }
        }

        $scope.joinContest = joinContest;
      }]
    };
  })
  
  .directive('stickyHeader', function () {
    return {
      restrict: 'EA',
      scope: true,
      link: function (scope, element, attrs) {
        window.addEventListener('scroll', function (ev) {
          var $body = $('body');
          if ($body.css('position') === 'fixed') {
            return;
          }
          var scrollTop = angular.element(document.body).scrollTop();
          var headerHeight = element.height();
          var headerOffset = Math.max(
            0, Math.min(headerHeight, scrollTop)
          );
          element.css({ transform: 'translateY(' + -headerOffset + 'px)' });
          if (scrollTop > headerHeight) {
            element.addClass('header_collapsed')
          } else {
            element.removeClass('header_collapsed')
          }
        })
      }
    };
  })
  
  .directive('ratingColorText', function () {
    return {
      restrict: 'E',
      scope: {
        rating: '='
      },
      transclude: true,
      templateUrl: templateUrl('contest-item/contest-monitor', 'rating-color-text'),
      controller: ['$scope', function ($scope) {
        var ratedGroups = [
          [-Infinity, 1350],
          [1350, 1500],
          [1500, 1650],
          [1650, 1750],
          [1750, Infinity]
        ];
        var userRating = $scope.rating;
        var ratedGroupIndex = 0;
        ratedGroups.forEach(function (group, index) {
          if (group[0] <= userRating && group[1] > userRating) {
            ratedGroupIndex = index;
          }
        });
        $scope.ratedGroupNumber = ratedGroupIndex + 1;
      }]
    }
  })
  
  .directive('ratedUser', function () {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: templateUrl('contest-item/contest-monitor', 'rated-user')
    }
  })
  
  .directive('ratedUserWithDialog', function () {
    return {
      restrict: 'E',
      scope: {
        user: '='
      },
      templateUrl: templateUrl('contest-item/contest-monitor', 'rated-user-with-dialog'),
      controller: ['$scope', '$mdDialog', function ($scope, $mdDialog) {
        $scope.showRatingHistory = function (ev, user) {
          $mdDialog.show({
            controller: 'RatingHistoryDialogController',
            templateUrl: templateUrl('contest-item/rating', 'dialog'),
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: true,
            locals: {
              user: user
            }
          });
        };
      }]
    }
  })
  
  .directive('myTimerElement', ['$injector', function ($injector) {
    return {
      restrict: 'EA',
      template: '<div class="my-timer"></div>',
      scope: {
        finish: '=',
        format: '=',
        direction: '=',
        onFinish: '=',
        onOther: '='
      },
      link: function (scope, element, attrs) {
        element = element.find('.my-timer');
        var timeoutId,
          $interval = $injector.get('$interval'),
          $timeout = $injector.get('$timeout'),
          finishCallbackInvoked = false;
        
        function updateTime() {
          var curTime = new Date().getTime(),
            finishTime = scope.finish || 0,
            format = scope.format || 'hh:mm:ss',
            finishCallback = scope.onFinish || angular.noop,
            otherEvents = scope.onOther || [];
          var diffTime = finishTime - curTime;
          for (var eventKey in otherEvents) {
            var timeEventMs = otherEvents[eventKey].time,
              eventCallback = otherEvents[eventKey].callback;
            if (Math.floor(timeEventMs / 1000) - 1 === Math.floor(curTime / 1000)) {
              if (typeof eventCallback === 'function') {
                $timeout(function (callback) {
                  callback();
                }.bind(this, eventCallback), 2000);
              }
            }
          }
          if (diffTime <= 0) {
            if (!finishCallbackInvoked && typeof finishCallback === 'function') {
              finishCallback();
              finishCallbackInvoked = true;
            }
            $interval.cancel(timeoutId);
          }
          element.text(
            timeRemainingFormat(diffTime, format)
          );
        }
        
        updateTime();
        timeoutId = $interval(function() {
          updateTime();
        }, 1000);
        
        function timeRemainingFormat(diffTimeMs, formatString) {
          var diffTime = Math.max(diffTimeMs, 0),
            allSeconds = Math.floor(diffTime / 1000),
            seconds = allSeconds % 60,
            minutes = Math.floor(allSeconds / 60),
            hours = Math.floor(minutes / 60);
          minutes %= 60;
          var zF = function (num) { return num < 10 ? '0' + num : num; };
          return formatString ? formatString
            .replace(/(hh)/gi, zF(hours))
            .replace(/(mm)/gi, zF(minutes))
            .replace(/(ss)/gi, zF(seconds)) : '';
        }
        
        element.on('$destroy', function() {
          $interval.cancel(timeoutId);
        });
      }
    };
  }])
  
  .directive('mdColorPicker', ['$injector', function ($injector) {
    return {
      require: '?ngModel',
      restrict: 'EA',
      scope: {},
      templateUrl: templateUrl('admin', 'groups/color-picker'),
      link: function (scope, element, attrs, ngModel) {
        if (!ngModel) return;
        scope.$ngModel = ngModel;
        
        ngModel.$render = function() {
          if (ngModel.$viewValue && !~scope.colors.indexOf(ngModel.$viewValue)) {
            scope.colors.push( ngModel.$viewValue );
            scope.splitColors();
          }
          scope.value = ngModel.$viewValue;
        };
        ngModel.$render();
      },
      controller: ['$scope', function ($scope) {
        var colors = [
            '#EF9A9A',
            '#E57373',
            '#EF5350',
            '#F44336',
            '#E53935',
            '#D32F2F',
            '#C62828',
            '#B71C1C',
            
            '#F48FB1',
            '#F06292',
            '#EC407A',
            '#E91E63',
            '#D81B60',
            '#C2185B',
            '#AD1457',
            '#880E4F',
            
            '#CE93D8',
            '#BA68C8',
            '#AB47BC',
            '#9C27B0',
            '#8E24AA',
            '#7B1FA2',
            '#6A1B9A',
            '#4A148C',
            
            '#B39DDB',
            '#9575CD',
            '#7E57C2',
            '#673AB7',
            '#5E35B1',
            '#512DA8',
            '#4527A0',
            '#311B92',
            
            '#9FA8DA',
            '#7986CB',
            '#5C6BC0',
            '#3F51B5',
            '#3949AB',
            '#303F9F',
            '#283593',
            '#1A237E',
            
            '#90CAF9',
            '#64B5F6',
            '#42A5F5',
            '#2196F3',
            '#1E88E5',
            '#1976D2',
            '#1565C0',
            '#0D47A1',
            
            '#81D4FA',
            '#4FC3F7',
            '#29B6F6',
            '#03A9F4',
            '#039BE5',
            '#0288D1',
            '#0277BD',
            '#01579B',
            
            '#80DEEA',
            '#4DD0E1',
            '#26C6DA',
            '#00BCD4',
            '#00ACC1',
            '#0097A7',
            '#00838F',
            '#006064',
            
            '#80CBC4',
            '#4DB6AC',
            '#26A69A',
            '#009688',
            '#00897B',
            '#00796B',
            '#00695C',
            '#004D40',
            
            '#A5D6A7',
            '#81C784',
            '#66BB6A',
            '#4CAF50',
            '#43A047',
            '#388E3C',
            '#2E7D32',
            '#1B5E20',
            
            '#C5E1A5',
            '#AED581',
            '#9CCC65',
            '#8BC34A',
            '#7CB342',
            '#689F38',
            '#558B2F',
            '#33691E',
            
            '#E6EE9C',
            '#DCE775',
            '#D4E157',
            '#CDDC39',
            '#C0CA33',
            '#AFB42B',
            '#9E9D24',
            '#827717',
            
            '#FFF59D',
            '#FFF176',
            '#FFEE58',
            '#FFEB3B',
            '#FDD835',
            '#FBC02D',
            '#F9A825',
            '#F57F17',
            
            '#FFE082',
            '#FFD54F',
            '#FFCA28',
            '#FFC107',
            '#FFB300',
            '#FFA000',
            '#FF8F00',
            '#FF6F00',
            
            '#FFCC80',
            '#FFB74D',
            '#FFA726',
            '#FF9800',
            '#FB8C00',
            '#F57C00',
            '#EF6C00',
            '#E65100',
            
            '#FFAB91',
            '#FF8A65',
            '#FF7043',
            '#FF5722',
            '#F4511E',
            '#E64A19',
            '#D84315',
            '#BF360C',
            
            '#BCAAA4',
            '#A1887F',
            '#8D6E63',
            '#795548',
            '#6D4C41',
            '#5D4037',
            '#4E342E',
            '#3E2723',
            
            '#EEEEEE',
            '#E0E0E0',
            '#BDBDBD',
            '#9E9E9E',
            '#757575',
            '#616161',
            '#424242',
            '#212121',
            
            '#B0BEC5',
            '#90A4AE',
            '#78909C',
            '#607D8B',
            '#546E7A',
            '#455A64',
            '#37474F',
            '#263238'
          ],
          colorsTable;
        
        function splitColors() {
          colorsTable = [ [] ];
          for (var index = 0, outerIndex = 0; index < colors.length; ++index) {
            if (index && !(index % 8)) {
              outerIndex++;
              colorsTable.push([]);
            }
            colorsTable[outerIndex].push(colors[index]);
          }
          $scope.colorsTable = colorsTable;
        }
        splitColors();
        
        $scope.value = colors[0];
        $scope.colors = colors;
        $scope.splitColors = splitColors;
        
        $scope.$watch('value', function (newColor, oldColor) {
          if (newColor === oldColor) {
            return;
          }
          $scope.$ngModel.$setViewValue( newColor );
        });
        
        $scope.setColor = function (event, color) {
          $scope.value = color;
        };
      }]
    };
  }])
;