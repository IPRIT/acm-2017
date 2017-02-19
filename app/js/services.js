/* Services */

angular.module('Qemy.services', [
  'Qemy.i18n'
])
  .provider('Storage', function () {
    
    this.setPrefix = function (newPrefix) {
      ConfigStorage.prefix(newPrefix);
    };
    
    this.$get = ['$q', function ($q) {
      var methods = {};
      angular.forEach(['get', 'set', 'remove'], function (methodName) {
        methods[methodName] = function () {
          var deferred = $q.defer(),
            args = Array.prototype.slice.call(arguments);
          
          args.push(function (result) {
            deferred.resolve(result);
          });
          ConfigStorage[methodName].apply(ConfigStorage, args);
          
          return deferred.promise;
        };
      });
      return methods;
    }];
  })
  
  .service('StorageObserver', ['Storage', function(Storage) {
    var Observer = function Observer(storageKey, callback, params) {
      params = params || {};
      var prevVal,
        looper,
        destroyFlag = params.destroy || false,
        lazyTimeout = params.timeout || 50,
        deleteAfter = params.deleteAfter || false;
      Storage.get(storageKey).then(function(value) {
        prevVal = value;
      });
      looper = setInterval(function() {
        Storage.get(storageKey).then(function(value) {
          if (prevVal != value) {
            callback(value, prevVal);
            if (destroyFlag || deleteAfter) {
              clearInterval(looper);
              if (deleteAfter) {
                Storage.remove(storageKey);
              }
            }
            prevVal = value;
          }
        });
      }, lazyTimeout);
      
      function stop(lastInvoke) {
        clearInterval(looper);
        if (lastInvoke) {
          callback(prevVal);
        }
      }
      
      return {
        stopWatching: stop
      }
    };
    
    function startObserver() {
      var args = Array.prototype.slice.call(arguments);
      return Observer.apply(this, args);
    }
    
    return {
      watch: startObserver
    }
  }])
  
  .service('UserManager', ['$rootScope', '$q', '$http', function ($rootScope, $q, $http) {
    var curUser = null;
    
    function getCurrentUser(params) {
      params = params || { cache: true };
      return $q.when(curUser && params.cache ? curUser : getUser()).then(function (result) {
        return result.status ? result.data : result;
      });
      function getUser() {
        return $http.get('/api/user/me').then(function (data) {
          if (!data || data.error) {
            return false;
          } else if (data) {
            curUser = data;
          }
          return curUser;
        });
      }
    }
    
    function logout() {
      return $http.post('/api/user/authenticate/logout').then(function (data) {
        curUser = null;
        var defaultAction = true;
        return data && data.result
          ? data.result : defaultAction;
      });
    }
    
    return {
      getCurrentUser: getCurrentUser,
      logout: logout
    }
  }])
  
  .service('SocketService', ['$rootScope', '$q', '$http', function ($rootScope, $q, $http) {
    var socket = io();
    var queue = [];
    var connectCallback = angular.noop;
    var connected = false;
    var connectionChangeListeners = [];
    var isListening = false;
    
    subscribeConnectionEvents();
    
    var interval = setInterval(function () {
      console.log('Check socket connection...');
      if (socket && socket.connected) {
        connectCallback();
        connectionChangeListeners.forEach(function (observer) {
          var args = Array.prototype.slice.call( arguments );
          observer.apply(null, [ 'connect' ].concat(args));
        });
        dispatchQueueEvents();
        clearInterval(interval);
      } else {
        console.log('Not connected. Trying again...');
      }
    }, 500);
    
    function dispatchQueueEvents() {
      while (queue.length) {
        var event = queue.shift();
        emitEvent(event.name, event.data);
        console.log('Dispatching event:', event);
      }
    }
    
    function emitEvent(eventName, eventArgs) {
      if (!socket.connected) {
        console.log('Added to queue', eventName, eventArgs);
        return queue.push({
          name: eventName,
          data: eventArgs
        });
      }
      socket.emit(eventName, eventArgs);
    }
    
    function onConnect(callback) {
      if (socket.connected) {
        return callback();
      }
      connectCallback = callback;
    }
    
    function getSocket() {
      return socket;
    }
    
    function getIo() {
      return io;
    }
    
    function joinContest(contestId, userId) {
      emitEvent('contest.join', {
        contestId: contestId,
        userId: userId
      });
    }
    
    function leaveContest(contestId, userId) {
      emitEvent('contest.left', {
        contestId: contestId,
        userId: userId
      });
    }
    
    function setListener(eventName, callback) {
      socket.on(eventName, callback);
      return {
        removeListener: removeListener.bind(this, eventName, callback)
      }
    }
    
    function removeListener(eventName, callback) {
      socket.removeListener(eventName, callback);
    }
    
    function onConnectionChangeSetListener(callback) {
      connectionChangeListeners.push( callback );
    }
    
    function subscribeConnectionEvents() {
      if (!socket) {
        return;
      }
      socket.io.on('connect', function () {
        connectionChangeListeners.forEach(function (observer) {
          var args = Array.prototype.slice.call( arguments );
          observer.apply(null, [ 'connect' ].concat(args));
        });
      });
      socket.io.on('connect_error', function () {
        connectionChangeListeners.forEach(function (observer) {
          var args = Array.prototype.slice.call( arguments );
          observer.apply(null, [ 'connect_error' ].concat(args));
        });
      });
      socket.on('disconnect', function () {
        connectionChangeListeners.forEach(function (observer) {
          var args = Array.prototype.slice.call( arguments );
          observer.apply(null, [ 'disconnect' ].concat(args));
        });
      });
      socket.io.on('reconnect', function () {
        connectionChangeListeners.forEach(function (observer) {
          var args = Array.prototype.slice.call( arguments );
          observer.apply(null, [ 'reconnect' ].concat(args));
        });
      });
    }
    
    return {
      getSocket: getSocket,
      getIo: getIo,
      joinContest: joinContest,
      leaveContest: leaveContest,
      setListener: setListener,
      removeListener: removeListener,
      onConnect: onConnect,
      onConnectionChangeSetListener: onConnectionChangeSetListener
    }
  }])
  
  .provider('Battery', function () {
    
    var IS_SUPPORTED = window.navigator && window.navigator.getBattery
      && typeof window.navigator.getBattery === 'function';
    
    function minErrMessage() {
      console.error(minErrMessage.errorMessage);
    }
    
    minErrMessage.errorMessage = 'Your browser is not supporting the Battery Status API. More info: ' +
      'https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API';
    
    var _battery;
    
    this.$get = ['$q', function ($q) {
      var methods = {};
      
      var onChargingChangeCallbacks = [];
      function setOnChargingChangeListener(callback) {
        onChargingChangeCallbacks.push( callback );
      }
      
      function removeOnChargingChangeListeners() {
        onChargingChangeCallbacks = [];
      }
      
      var onChargingTimeChangeCallbacks = [];
      function setOnChargingTimeChangeListener(callback) {
        onChargingTimeChangeCallbacks.push( callback );
      }
      
      function removeOnChargingTimeChangeListeners() {
        onChargingTimeChangeCallbacks = [];
      }
      
      var onDischargingTimeChangeCallbacks = [];
      function setOnDischargingTimeChangeListener(callback) {
        onDischargingTimeChangeCallbacks.push( callback );
      }
      
      function removeOnDischargingTimeChangeListeners() {
        onDischargingTimeChangeCallbacks = [];
      }
      
      var onLevelChangeCallbacks = [];
      function setOnLevelChangeListener(callback) {
        onLevelChangeCallbacks.push( callback );
      }
      
      function removeOnLevelChangeListeners() {
        onLevelChangeCallbacks = [];
      }
      
      function onChargingChange() {
        var args = Array.prototype.slice.call( arguments );
        onChargingChangeCallbacks.forEach( function (callbackFn) {
          callbackFn.apply( this, args );
        } );
      }
      
      function onChargingTimeChange() {
        var args = Array.prototype.slice.call( arguments );
        onChargingTimeChangeCallbacks.forEach( function (callbackFn) {
          callbackFn.apply( this, args );
        } );
      }
      
      function onDischargingTimeChange() {
        var args = Array.prototype.slice.call( arguments );
        onDischargingTimeChangeCallbacks.forEach( function (callbackFn) {
          callbackFn.apply( this, args );
        } );
      }
      
      function onLevelChange() {
        var args = Array.prototype.slice.call( arguments );
        onLevelChangeCallbacks.forEach( function (callbackFn) {
          callbackFn.apply( this, args );
        } );
      }
      
      if (IS_SUPPORTED) {
        navigator.getBattery().then(function (battery) {
          _battery = battery;
          battery.onchargingchange = onChargingChange;
          battery.onchargingtimechange = onChargingTimeChange;
          battery.ondischargingtimechange = onDischargingTimeChange;
          battery.onlevelchange = onLevelChange;
        });
      } else {
        minErrMessage();
      }
      
      methods.supported = IS_SUPPORTED;
      
      methods.get = function () {
        if (!IS_SUPPORTED) {
          throw new Error(minErrMessage.errorMessage);
        }
        return navigator.getBattery();
      };
      
      methods = angular.extend(methods, {
        setOnChargingChangeListener: setOnChargingChangeListener,
        setOnChargingTimeChangeListener: setOnChargingTimeChangeListener,
        setOnDischargingTimeChangeListener: setOnDischargingTimeChangeListener,
        setOnLevelChangeListener: setOnLevelChangeListener
      });
      var removeListeners = {
        removeOnChargingChangeListeners: removeOnChargingChangeListeners,
        removeOnChargingTimeChangeListeners: removeOnChargingTimeChangeListeners,
        removeOnDischargingTimeChangeListeners: removeOnDischargingTimeChangeListeners,
        removeOnLevelChangeListeners: removeOnLevelChangeListeners
      };
      methods = angular.extend(methods, removeListeners);
      methods.dispose = function () {
        for (var el in removeListeners) {
          if (!removeListeners.hasOwnProperty(el)) continue;
          removeListeners[ el ]();
        }
      };
      
      return methods;
    }];
  })
  
  .service('ErrorService', ['$rootScope', '$q', '$mdToast', function ($rootScope, $q, $mdToast) {
    var instance;
    var current;
    var toastQueue = [];
    
    function show(error, params) {
      var errorObject = error && error.data && error.data.error || {};
      var errorMessage = errorObject && (errorObject.description || errorObject.message) || 'Unhandled error';
      return showMessage(errorMessage, params);
    }
    
    function showMessage(message, params) {
      var position = [ 'right', 'top' ];
      if (instance) {
        if (toastQueue.indexOf(message) >= 0 || current === message) {
          return;
        }
        return toastQueue.push( message );
      }
      current = message;
      params = angular.extend({}, params);
      var parentSelector = params.parentSelector;
      var parent = parentSelector ? document.querySelector(parentSelector) : document.body;
      return (instance = $mdToast.show({
        hideDelay: 20000,
        parent: parent,
        templateUrl: templateUrl('contest-item/toast', 'error'),
        controller: ['$scope', function ($scope) {
          $scope.errorMessage = message;
          $scope.closeToast = function() {
            $mdToast.hide();
          };
        }],
        position: position.join(' ')
      }).then(function () {
        instance = null;
        if (toastQueue.length) {
          showMessage( toastQueue.shift() );
        }
      }))
    }
    
    return {
      show: show,
      showMessage: showMessage
    }
  }])
;