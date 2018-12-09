var gulp = require('gulp');
var serve = require('gulp-serve');
var connectInject = require('connect-inject');

gulp.task('example', serve({
  root: ['./example/next', './packages/skygear/dist'],
  hostname: '0.0.0.0',
  port: 5000,
  middleware: connectInject({
    runAll: true,
    rules: [{
      match: /{{ SKYGEAR_ENDPOINT }}/,
      fn: function () {
        return process.env.SKYGEAR_ENDPOINT ||
          'https://sdkjsexample.skygeario.com/';
      }
    },{
      match: /{{ SKYGEAR_API_KEY }}/,
      fn: function () {
        return process.env.SKYGEAR_API_KEY ||
          '363826633dc44161a11e9135b1546539';
      }
    }]
  })
}));
