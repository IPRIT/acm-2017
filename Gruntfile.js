const sass = require('node-sass');

const isProduction = process.env.NODE_ENV !== 'development';

console.log('Grunt config:', process.env.NODE_ENV || 'production');

module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      options: {
        livereload: true
      },
      scripts: {
        files: [
          'app/js/**/*.js'
        ],
        tasks: [
          'process'
        ]
      },
      css: {
        files: [
          'app/sass/**/*.scss'
        ],
        tasks: [
          'sass-compile'
        ]
      }
    },
    concat: {
      dist: {
        src: [
          'app/js/**/*.js'
        ],
        dest: 'app/prod/js/build.js'
      }
    },
    babel: {
      options: {
        sourceMap: true,
        presets: [
          [
            '@babel/preset-env',
            {
              "useBuiltIns": false,
            }
          ]
        ],
        plugins: [
          "@babel/plugin-transform-runtime"
        ]
      },
      dist: {
        files: {
          'app/prod/js/build.js': 'app/prod/js/build.js'
        }
      }
    },
    uglify: {
      dist: {
        options: {
          banner: '/*!\n * <%= pkg.name %> \n * v<%= pkg.version %> - ' +
          '<%= grunt.template.today("dd.mm.yyyy") %> \n * Copyright (c) <%= pkg.author %>\n**/',
          sourceMap: !isProduction,
          sourceMapName: 'app/prod/js/build.js.map',
          compress: {
            drop_console: isProduction
          }
        },
        files: {
          'app/prod/js/build.js': [
            'app/prod/js/build.js'
          ]
        }
      }
    },
    browserify: {
      dist: {
        files: {
          'app/prod/js/build.js': [
            'app/prod/js/build.js'
          ]
        }
      }
    },
    sass: {
      options: {
        implementation: sass,
        sourcemap: isProduction ? 'inline' : 'auto',
        noCache: true,
        style: isProduction ? 'compressed' : 'nested'
      },
      dist: {
        files: {
          'app/prod/css/style.css': [
            'app/sass/style.scss',
            'app/sass/chat/_index.scss',
            'app/sass/table/_index.scss',
            'app/sass/news/_index.scss'
          ]
        }
      }
    },
    autoprefixer: {
      options: {
        browserslist: [
          "> 0%"
        ]
      },
      dist: {
        files: {
          'app/prod/css/style.css': [
            'app/prod/css/style.css'
          ]
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-newer');

  grunt.registerTask('process', [
    'newer:concat', 'babel', 'browserify', 'uglify'
  ]);
  grunt.registerTask('sass-compile', [
    'sass',
    'autoprefixer'
  ]);
  grunt.registerTask('default', [
    'concat', 'babel', 'browserify', 'uglify', 'sass', 'autoprefixer',
  ]);
  grunt.registerTask('dev', [
    'concat', 'babel', 'browserify', 'sass', 'watch'
  ]);

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });
};