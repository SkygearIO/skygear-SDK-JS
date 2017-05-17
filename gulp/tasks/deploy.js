var gulp = require('gulp');
var path = require('path');

var awsinvalidate = require('gulp-cloudfront-invalidate-aws-publish');
var awspublish = require('gulp-awspublish');
var gutil = require('gulp-util');
var rename = require('gulp-rename');
var merge = require('merge-stream');

var config = require('../config');
var packagejson = require('../../package.json');

gulp.task('deploy', ['minify'], function() {
  var publisher = awspublish.create({
    region: config.cdn.region,
    params: {
      Bucket: config.cdn.bucket
    }
  });

  var packageConfigs = config.getPackageConfigs();
  var streams = packageConfigs.map(function(packageConfigs) {
    return gulp.src(config.minifiedDest + '*')
      .pipe(rename(function(filePath) {
        var version = packagejson.version;
        if (gutil.env.latest) {
          version = 'latest';
        }

        filePath.dirname = path.join(config.cdnPath, version);
      }))
      .pipe(publisher.publish())
      .pipe(awspublish.reporter())
      .pipe(awsinvalidate({
        distribution: config.cdn.distribution
      }));
  });
  return merge(streams);
});

