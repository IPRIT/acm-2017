angular.module('Qemy', [
  'ng',
  'ngRoute',
  'ui.router',
  'ngSanitize',
  'ngMaterial',
  'ngAnimate',
  'ngAria',
  'ngMessages',
  'hc.marked',
  'ngFileUpload',
  'lk-google-picker',
  
  'Qemy.directives',
  'Qemy.controllers',
  'Qemy.services',
  'Qemy.filters',

  'Qemy.ui.contests',
  'Qemy.ui.user',
  'Qemy.ui.problems',
  'Qemy.ui.auth',
  'Qemy.ui.contest-item',
  'Qemy.ui.admin'
])
  .config(['$sceProvider', '$locationProvider', 'StorageProvider', '$stateProvider', '$urlRouterProvider', '$mdThemingProvider', 'markedProvider', '$mdIconProvider', 'lkGoogleSettingsProvider',
    function($sceProvider, $locationProvider, StorageProvider, $stateProvider, $urlRouterProvider, $mdThemingProvider, markedProvider, $mdIconProvider, lkGoogleSettingsProvider) {
      if (Config.Modes.test) {
        StorageProvider.setPrefix('t_');
      }
      $mdThemingProvider.theme('default')
        .primaryPalette('blue')
        .accentPalette('red');

      $locationProvider.hashPrefix('!');
      $locationProvider.html5Mode(true);

      $urlRouterProvider
        .otherwise('/');

      $stateProvider
        .state('index', {
          url: '/',
          templateUrl: templateUrl('index', 'index'),
          controller: 'IndexCtrl'
        });

      let renderer = new marked.Renderer();
      renderer.heading = function (text, level) {
        let escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');

        return '<h' + level + '><a name="' +
          escapedText +
          '" class="anchor" href="#' +
          escapedText +
          '"><span class="header-link"></span></a>' +
          text + '</h' + level + '>';
      };

      renderer.code = function (text, lang) {
        if (!lang) {
          return '<div class="markdown__simple-insert"><pre>' + text + '</pre></div>';
        }

        //tex&co markups
        if (~['tex', 'latex', 'katex'].indexOf(lang)) {
          return '<div class="markdown__tex">' + katex.renderToString(text) + '</div>';
        }

        let code = text;
        Rainbow.color(text, lang, function(highlighted_code) {
          code = highlighted_code;
        });
        let cssStyles = '<link href="/js/lib/rainbow/themes/monokai.css" rel="stylesheet" type="text/css">' +
          '<link href="/js/lib/rainbow/themes/theme.css" rel="stylesheet" type="text/css">';
        return cssStyles + '<div class="markdown__lang-header">' + lang + '</div><pre><div class="rainbow markdown__rainbow" data-language="' + lang + '">' + code + '<div></pre>';
      };

      renderer.hr = function () {
        return '<div class="markdown__divider"></div>';
      };

      renderer.link = function(href, title, text) {
        return "<a class='link markdown__link' href='" + href + "'" + (title ? " title='" + title + "'" : '') + " target='_blank'>" + text + "</a>";
      };

      renderer.image = function(src, title, text) {
        return "<img class='image markdown__image' src='" + src + "'" + (title ? " title='" + title + "'" : '') + " alt='text'/>";
      };

      //configure markdown options
      markedProvider.setOptions({
        renderer: renderer,
        gfm: true,
        tables: true,
        breaks: true,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true
      });

      $mdIconProvider
        .icon('check', '/img/icons/ic_check_48px.svg');

      ion.sound({
        sounds: [{
          name: "pop_cork",
          preload: true
        }],
        path: "/sounds/",
        preload: false,
        multiplay: true,
        volume: 1,
        ready_callback: function () {
          console.log('All sounds have been loaded');
        }
      });

      lkGoogleSettingsProvider.configure({
        apiKey   : 'AIzaSyAHaUeOI7o86wegkMPy4d2uAzjxAxAAWsk',
        clientId : '474180600511-2of4r1gfshtu8h7bfilrq8j3pubci7h8.apps.googleusercontent.com',
        scopes   : ['https://www.googleapis.com/auth/drive'],
        locale   : 'ru',
        features : ['MULTISELECT_ENABLED'],
        views    : [
          'DocsUploadView().setIncludeFolders(true)',
          'DocsView()',
          'DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true)'
        ]
      });

      // Completely disable SCE.
      $sceProvider.enabled(false);
    }
  ])
;