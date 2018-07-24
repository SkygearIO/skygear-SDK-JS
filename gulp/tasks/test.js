var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
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
      .pipe(preprocess({context: context[config.deployEnv]}))
      .pipe(istanbul({
        includeUntested: true,
        instrumenter: isparta.Instrumenter
      }));
  });
  return merge(streams)
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
  // Make node.js crash when test case have unhandled promise rejection
  process.on('unhandledRejection', up => { throw up })

  var packageConfigs = config.getPackageConfigs();
  var streams = packageConfigs.map(function(packageConfig) {
    return gulp.src(packageConfig.test)
      .pipe(babel())
      .pipe(mocha({
        reporter: 'spec',
        clearRequireCache: true,
        quiet: false
      }))
  });
  return merge(streams)
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
    }));
});
