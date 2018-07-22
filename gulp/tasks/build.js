var gulp = require('gulp');
var path = require('path');
var eslint = require('gulp-eslint');
var excludeGitignore = require('gulp-exclude-gitignore');
var babel = require('gulp-babel');
var preprocess = require('gulp-preprocess');
var uglify = require('gulp-uglify')
var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps');
var merge = require('merge-stream');

var config = require('../config');
var context = require('../context');

gulp.task('default', ['test'], function () {
  var packageConfigs = config.getPackageConfigs();
  var packagesSrc = packageConfigs.map(function(config) {
    return [config.src, config.test];
  });
  packagesSrc = [].concat.apply([], packagesSrc);
  var streams = packagesSrc.map(function(src) {
    return gulp.src(src)
      .pipe(excludeGitignore())
      .pipe(eslint())
      .pipe(eslint.format())
      .pipe(eslint.failAfterError());
  });
  return merge(streams);
});

gulp.task('babel', function () {
  var packageConfigs = config.getPackageConfigs();
  var streams = packageConfigs.map(function(packageConfig) {
    return gulp.src(packageConfig.src)
      .pipe(preprocess({context: context[config.deployEnv]}))
      .pipe(babel())
      .pipe(gulp.dest(packageConfig.dest));
  })
  return merge(streams);
});

gulp.task('watch', ['browserify', 'babel'], function() {
  var packageConfigs = config.getPackageConfigs();
  var packagesSrc = packageConfigs.map(function(config) {
    return config.src;
  });
  gulp.watch(packagesSrc, ['browserify', 'babel']);
});

gulp.task('prepublish', ['babel', 'browserify', 'minify']);
gulp.task('dev', ['watch']);

gulp.task('minify', ['browserify'], function() {
  var packageConfigs = config.getPackageConfigs();
  var streams = packageConfigs.map(function(packageConfig) {
    return gulp.src(
        path.join(
          packageConfig.browserifyDest,
          config.browserify.outputName
        )
      )
      .pipe(sourcemaps.init())
        .pipe(concat(packageConfig.minifiedDest))
        .pipe(uglify())
      .pipe(sourcemaps.write('.'))
      .pipe(gulp.dest(packageConfig.dest));
  });
  return merge(streams);
});
