var gulp = require('gulp');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var connect = require('gulp-connect');
var merge = require('merge-stream');
var log = require('fancy-log');

var config = require('../config');
var browserifyConfig = config.browserify;

var args = watchify.args;
args.debug = browserifyConfig.debug;

gulp.task('browserify', bundle);

function bundle() {

  var packageConfigs = config.getPackageConfigs();
  var streams = packageConfigs.map(function(packageConfig) {
    var bundlerArgs = Object.assign({}, args, {
      standalone: packageConfig.standalone
    });
    var bundler;
    bundler = browserify(packageConfig.browserifySrc, bundlerArgs).ignore('react-native');

    browserifyConfig.settings.transform.forEach(function(t) {
      bundler.transform(t);
    });
    bundler.on('update', bundle);

    return bundler.bundle()
    // log errors if they happen
    .on('error', log.error)
    .pipe(source(browserifyConfig.outputName))
    .pipe(gulp.dest(packageConfig.browserifyDest))
    .pipe(connect.reload());
  });
  return merge(streams);
}
