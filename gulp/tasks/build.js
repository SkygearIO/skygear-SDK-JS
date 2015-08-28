var gulp = require('gulp');
var eslint = require('gulp-eslint');
var excludeGitignore = require('gulp-exclude-gitignore');
var nsp = require('gulp-nsp');
var babel = require('gulp-babel');
var config = require('../config');

gulp.task('static', function () {
  return gulp.src(config.src)
    .pipe(excludeGitignore())
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('nsp', function (cb) {
  nsp('package.json', cb);
});


gulp.task('babel', function () {
  return gulp.src(config.src)
    .pipe(babel())
    .pipe(gulp.dest(config.dest));
});

gulp.task('watch', ['babel'], function() {
  gulp.watch(config.src, ['babel']);
});

gulp.task('prepublish', ['nsp', 'babel']);
gulp.task('default', ['static', 'test']);
gulp.task('dev', ['watch']);
