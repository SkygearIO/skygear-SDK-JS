var gutil = require('gulp-util');
var preprocessify = require('preprocessify');

var context = require('./context');

module.exports = {
  src: './lib/**/*.js',
  dest: './dist',
  testSrc: './test/**/*.js',
  browserify: {
    settings: {
      transform: ['babelify', preprocessify(context[gutil.env.type])]
    },
    standalone: 'skygear',
    src: './lib/index.js',
    dest: './dist',
    outputName: 'bundle.js',
    debug: gutil.env.type === 'dev'
  }
};
