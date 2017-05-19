var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var plumber = require('gulp-plumber');
var babel = require('gulp-babel');
var preprocess = require('gulp-preprocess');
var isparta = require('isparta');
var merge = require('merge-stream');

var config = require('../config');
var context = require('../context');

var chai = require('chai');
var dirtyChai = require('dirty-chai');
var sinonChai = require('sinon-chai');

// NOTE: dirty-chai should be loaded before other chai plugins to properly
// convert property assertions
chai.use(dirtyChai);
chai.use(sinonChai);

gulp.task('pre-test', function () {
  var packageConfigs = config.getPackageConfigs();
  var streams = packageConfigs.map(function(packageConfig) {
  return gulp.src(packageConfig.src)
    .pipe(preprocess({context: context[gutil.env.type]}))
    .pipe(istanbul({
      includeUntested: true,
      instrumenter: isparta.Instrumenter
    }))
    .pipe(istanbul.hookRequire());
  });
  return merge(streams);
});

gulp.task('test', ['pre-test'], function (cb) {
  var mochaErr;

  gulp.src(config.testSrc)
    .pipe(babel())
    .pipe(plumber())
    .pipe(mocha({
      reporter: 'spec',
      clearRequireCache: true,
      quiet: false
    }))
    .on('error', function (err) {
      console.log(err);
      mochaErr = err;
    })
    .pipe(istanbul.writeReports({
      reporters: ['lcov', 'text', 'text-summary']
    }))
    .pipe(istanbul.enforceThresholds({
      thresholds: {
        global: {
          statements: 70,
          branches: 50,
          functions: 70,
          lines: 70
        }
      }
    }))
    .on('end', function () {
      cb(mochaErr);
    });
});
