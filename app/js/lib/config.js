var Config = window.Config = window.Config || {};

Config.App = {
    id: 216,
    hash: '8da85b0d5bfe62527e5b244a309159c3',
    version: '1.0.1',
    domains: [
        'localhost:3000',
        'acm.alexbelov.xyz',
        'pat1.misis.ru:5048'
    ],
    current_domain: 2
};

Config.serverTimeOffset = 3;

Config.Modes = {
    test: location.search.indexOf('test=1') > 0,
    debug: location.search.indexOf('debug=1') > 0,
    http: location.search.indexOf('http=1') > 0,
    ssl: location.search.indexOf('ssl=1') > 0 || location.protocol == 'https:' && location.search.indexOf('ssl=0') == -1,
    nacl: location.search.indexOf('nacl=0')== -1,
    ios_standalone: window.navigator.standalone && navigator.userAgent.match(/iOS|iPhone|iPad/)
};

Config.Navigator = {
    osX:  (navigator.platform || '').toLowerCase().indexOf('mac') != -1 ||
    (navigator.userAgent || '').toLowerCase().indexOf('mac') != -1,
    retina: window.devicePixelRatio > 1,
    ffos: navigator.userAgent.search(/mobi.+Gecko/i) != -1,
    touch: screen.width <= 768,
    mobile: screen.width && screen.width < 480 || navigator.userAgent.search(/iOS|iPhone OS|Android|BlackBerry|BB10|Series ?[64]0|J2ME|MIDP|opera mini|opera mobi|mobi.+Gecko|Windows Phone/i) != -1
};

Config.I18n = {
    locale: 'ru-ru',
    supported: [
        "ru-ru",
        'en-us'
    ],
    languages: {
        'ru-ru': 'Русский',
        'en-us': 'English'
    },
    aliases: {
        'ru': 'ru-ru',
        'en': 'en-us'
    },
    aliases_back: {
        'ru-ru': 'ru',
        'en-us': 'en'
    },
    messages: {},
    fallback_messages: {}
};

// ConfigStorage based on
/*!
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */
(function (window) {
    var keyPrefix = '';
    var noPrefix = false;
    var cache = {};
    var useCs = false;
    var useLs = !useCs && !!window.localStorage;

    function storageSetPrefix (newPrefix) {
        keyPrefix = newPrefix;
    }

    function storageSetNoPrefix() {
        noPrefix = true;
    }

    function storageGetPrefix () {
        if (noPrefix) {
            noPrefix = false;
            return '';
        }
        return keyPrefix;
    }

    function storageGetValue() {
        var keys = Array.prototype.slice.call(arguments),
            callback = keys.pop(),
            result = [],
            single = keys.length == 1,
            value,
            allFound = true,
            prefix = storageGetPrefix(),
            i, key;

        for (i = 0; i < keys.length; i++) {
            key = keys[i] = prefix.toString() + keys[i];
            if (useLs) {
                try {
                    value = localStorage.getItem(key);
                } catch (e) {
                    useLs = false;
                }
                try {
                    value = (value === undefined || value === null) ?
                        false : JSON.parse(value);
                } catch (e) {
                    value = false;
                }
                result.push(cache[key] = value);
            }
            else if (!useCs) {
                result.push(cache[key] = false);
            }
            else {
                allFound = false;
            }
        }

        if (allFound) {
            return callback(single ? result[0] : result);
        }
    }

    function storageSetValue(obj, callback) {
        var keyValues = {},
            prefix = storageGetPrefix(),
            key, value;

        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                value = obj[key];
                key = prefix + key;
                cache[key] = value;
                value = JSON.stringify(value);
                if (useLs) {
                    try {
                        localStorage.setItem(key, value);
                    } catch (e) {
                        useLs = false;
                    }
                } else {
                    keyValues[key] = value;
                }
            }
        }

        if (useLs || !useCs) {
            if (callback) {
                callback();
            }
        }
    }

    function storageRemoveValue () {
        var keys = Array.prototype.slice.call(arguments),
            prefix = storageGetPrefix(),
            i, key, callback;

        if (typeof keys[keys.length - 1] === 'function') {
            callback = keys.pop();
        }

        for (i = 0; i < keys.length; i++) {
            key = keys[i] = prefix + keys[i];
            delete cache[key];
            if (useLs) {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    useLs = false;
                }
            }
        }
        if (callback) {
            callback();
        }
    }

    window.ConfigStorage = {
        prefix: storageSetPrefix,
        noPrefix: storageSetNoPrefix,
        get: storageGetValue,
        set: storageSetValue,
        remove: storageRemoveValue
    }

})(window);

initApplication();