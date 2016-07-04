var gulp = require('gulp');

var awsinvalidate = require('gulp-cloudfront-invalidate-aws-publish');
var awspublish = require('gulp-awspublish');
var gutil = require('gulp-util');
var rename = require('gulp-rename');

var config = require('../config');
var packagejson = require('../../package.json')

gulp.task('deploy', ['minify'], function() {
  var publisher = awspublish.create({
    region: config.cdn.region,
    params: {
      Bucket: config.cdn.bucket
    }
  });

  return gulp.src(config.dest + '/' + config.minified.name + '*')
    .pipe(rename(function(path) {
      var version = packagejson.version;
      if (gutil.env.latest) {
        version = 'latest';
      }

      path.dirname = config.cdn.path + '/skygear/' + version;
    }))
    .pipe(publisher.publish())
    .pipe(awspublish.reporter())
    .pipe(awsinvalidate({
      distribution: config.cdn.distribution
    }));
});

