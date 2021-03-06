// Special thanks to oscar-g (https://github.com/oscar-g) for starting this at
// https://github.com/oscar-g/patternlab-node/tree/dev-gulp

var pkg = require('./package.json');
var gulp = require('gulp');
var path = require('path');
var eol = require('os').EOL;
var del = require('del');
var strip_banner = require('gulp-strip-banner');
var header = require('gulp-header');
var nodeunit = require('gulp-nodeunit');
var eslint = require('gulp-eslint');
var browserSync = require('browser-sync').create();

// gulp plugins
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var cleanCSS = require('gulp-clean-css');

require('gulp-load')(gulp);
var banner = [ '/** ',
  ' * <%= pkg.name %> - v<%= pkg.version %> - <%= today %>',
  ' * ',
  ' * <%= pkg.author %>, and the web community.',
  ' * Licensed under the <%= pkg.license %> license.',
  ' * ',
  ' * Many thanks to Brad Frost and Dave Olsen for inspiration, encouragement, and advice.',
  ' * ', ' **/'].join(eol);

function paths() {
  return require('./patternlab-config.json').paths;
}

//load patternlab-node tasks
gulp.loadTasks(__dirname + '/core/lib/patternlab_gulp.js');

//clean patterns dir
gulp.task('clean', function (cb) {
  del.sync([path.resolve(paths().public.patterns, '*')], {force: true});
  cb();
});

//build the banner
gulp.task('banner', function () {
  return gulp.src([
    './core/lib/patternlab.js',
    './core/lib/object_factory.js',
    './core/lib/lineage_hunter.js',
    './core/lib/media_hunter.js',
    './core/lib/patternlab_grunt.js',
    './core/lib/patternlab_gulp.js',
    './core/lib/parameter_hunter.js',
    './core/lib/pattern_exporter.js',
    './core/lib/pattern_assembler.js',
    './core/lib/pseudopattern_hunter.js',
    './core/lib/list_item_hunter.js',
    './core/lib/style_modifier_hunter.js'
  ])
    .pipe(strip_banner())
    .pipe(header(banner, {
      pkg : pkg,
      today : new Date().getFullYear() }
    ))
    .pipe(gulp.dest('./core/lib'));
});


// COPY TASKS

// JS copy
gulp.task('cp:js', function () {
  return gulp.src('**/*.js', {cwd: path.resolve(paths().source.js)})
    .pipe(gulp.dest(path.resolve(paths().public.js)));
});

// Images copy
gulp.task('cp:img', function () {
  return gulp.src(
    ['**/*.gif', '**/*.png', '**/*.jpg', '**/*.jpeg'],
    {cwd: path.resolve(paths().source.images)})
    .pipe(gulp.dest(path.resolve(paths().public.images)));
});

// Fonts copy
gulp.task('cp:font', function () {
  return gulp.src('*', {cwd: path.resolve(paths().source.fonts)})
    .pipe(gulp.dest(path.resolve(paths().public.fonts)));
});

// Data copy
gulp.task('cp:data', function () {
  return gulp.src('annotations.js', {cwd: path.resolve(paths().source.data)})
    .pipe(gulp.dest(path.resolve(paths().public.data)));
});

// CSS Copy
gulp.task('cp:css', function () {
  return gulp.src(path.resolve(paths().source.css, 'style.css'))
    .pipe(gulp.dest(path.resolve(paths().public.css)))
    .pipe(browserSync.stream());
});

// Styleguide Copy
gulp.task('cp:styleguide', function () {
  return gulp.src(
      ['**/*'],
      {cwd: path.resolve(paths().source.styleguide)})
      .pipe(gulp.dest(path.resolve(paths().public.styleguide)))
      .pipe(browserSync.stream());
});

// add SASS support with sourcemaps
gulp.task('sass', function () {
  return gulp.src('./source/scss/**/*.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
    .pipe(concat('style.css'))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./source/css'));
});

// server and watch tasks
gulp.task('connect', ['lab'], function () {
  browserSync.init({
    server: {
      baseDir: path.resolve(paths().public.root)
    },
    snippetOptions: {
      // Ignore all HTML files within the templates folder
      blacklist: ['/index.html', '/', '/?*']
    },
    notify: {
      styles: [
        'display: none',
        'padding: 15px',
        'font-family: sans-serif',
        'position: fixed',
        'font-size: 1em',
        'z-index: 9999',
        'bottom: 0px',
        'right: 0px',
        'border-top-left-radius: 5px',
        'background-color: #1B2032',
        'opacity: 0.4',
        'margin: 0',
        'color: white',
        'text-align: center'
      ]
    }
  });
  gulp.watch(path.resolve(paths().source.css, '**/*.css'), ['cp:css']);

  gulp.watch(path.resolve(paths().source.styleguide, '**/*.*'), ['cp:styleguide']);

  //gulp.watch(
    //path.resolve(paths().source.patterns, '**/*.mustache'),
    //['build'],
    //function () { browserSync.reload(); }
  //);

  gulp.watch(
    [
      path.resolve(paths().source.patterns, '**/*.mustache'),    
      path.resolve(paths().source.patterns, '**/*.json'),
      path.resolve(paths().source.data, '*.json'),
      path.resolve(paths().source.fonts + '/*'),
      path.resolve(paths().source.images + '/*'),
      path.resolve(paths().source.data + '*.json')
    ],
    ['lab-pipe'],
    function () { browserSync.reload(); }
  );

  // Added SASS Bits
  gulp.watch(
    path.resolve(paths().source.scss, '**/*.scss'),
    ['sass'],
    function () { browserSync.reload(); }    
  );

});

//lint
gulp.task('eslint', function () {
  return gulp.src(['./core/lib/*.js', '!node_modules/**'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

//unit test
gulp.task('nodeunit', function () {
  return gulp.src('./test/**/*_tests.js')
    .pipe(nodeunit());
});


gulp.task('lab-pipe', ['lab'], function (cb) {
  cb();
  browserSync.reload();
});

gulp.task('default', ['serve']);

gulp.task('assets', ['cp:js', 'cp:img', 'cp:font', 'cp:data', 'sass', 'cp:css', 'cp:styleguide' ]);
gulp.task('prelab', ['clean', 'assets']);
gulp.task('lab', ['prelab', 'patternlab'], function (cb) { cb(); });
gulp.task('patterns', ['patternlab:only_patterns']);
gulp.task('serve', ['lab', 'connect']);
gulp.task('build', ['eslint', 'nodeunit', 'banner'], function (cb) {
  cb();
  browserSync.reload();
});

gulp.task('version', ['patternlab:version']);
gulp.task('help', ['patternlab:help']);