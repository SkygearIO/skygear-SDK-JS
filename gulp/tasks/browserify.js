var gulp = require('gulp');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var connect = require('gulp-connect');

var config = require('../config').browserify;

var args = watchify.args;
args.debug = config.debug;
args.standalone = config.standalone;

var bundler;

if (gutil.env.type != "dev") {
  bundler = browserify(config.src, args).ignore('react-native');
} else {
  bundler = watchify(browserify(config.src, args).ignore('react-native'));
}

config.settings.transform.forEach(function(t) {
  bundler.transform(t);
});

gulp.task('browserify', bundle);
bundler.on('update', bundle);

function bundle() {
  return bundler.bundle()
  // log errors if they happen
  .on('error', gutil.log.bind(gutil, 'Browserify Error'))
  .pipe(source(config.outputName))
  .pipe(gulp.dest(config.dest))
  .pipe(connect.reload());
}
