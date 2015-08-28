var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var plumber = require('gulp-plumber');
var babel = require('gulp-babel');
var preprocess = require('gulp-preprocess');

var config = require('../config');
var context = require('../context');


gulp.task('pre-test', function () {
  return gulp.src(config.src)
    .pipe(preprocess({context: context[gutil.env.type]}))
    .pipe(babel())
    .pipe(istanbul({includeUntested: true}))
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function (cb) {
  var mochaErr;

  gulp.src(config.testSrc)
    .pipe(plumber())
    .pipe(mocha({
      reporter: 'spec',
      clearRequireCache: true,
      quiet: false
    }))
    .on('error', function (err) {
      mochaErr = err;
    })
    .pipe(istanbul.writeReports({
      reporters: ['lcovonly', 'text']
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
