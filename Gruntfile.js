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
    uglify: {
      dist: {
        options: {
          banner: '/*!\n * <%= pkg.name %> \n * v<%= pkg.version %> - ' +
          '<%= grunt.template.today("dd.mm.yyyy") %> \n * Copyright (c) <%= pkg.author %>\n**/',
          sourceMap: true,
          sourceMapName: 'app/prod/js/build.min.js.map'
        },
        files: {
          'app/prod/js/build.min.js': [
            'app/prod/js/build.js'
          ]
        }
      }
    },
    sass: {
      options: {
        sourcemap: 'auto',
        noCache: true,
        style: 'extended'
      },
      dist: {
        files: {
          'app/prod/css/style.css': [
            'app/sass/style.scss',
            'app/sass/table/_index.scss'
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
          'app/prod/css/style.prod.css': [
            'app/prod/css/style.css'
          ]
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-sass');
  grunt.loadNpmTasks('grunt-autoprefixer');
  grunt.loadNpmTasks('grunt-newer');

  grunt.registerTask('process', [
    'newer:concat', 'uglify'
  ]);
  grunt.registerTask('sass-compile', [
    'sass',
    'autoprefixer'
  ]);
  grunt.registerTask('default', [
    'concat', 'uglify', 'sass', 'autoprefixer', 'watch'
  ]);

  grunt.event.on('watch', function(action, filepath, target) {
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
  });
};