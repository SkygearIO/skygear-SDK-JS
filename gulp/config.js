var gutil = require('gulp-util');
var preprocessify = require('preprocessify');

var context = require('./context');
var glob = require('glob');
var path = require('path');

module.exports = {
  packages: './packages/*',
  srcInPackage: './lib/**/*.js',
  destInPackage: './dist',
  testSrc: './test/**/*.js',
  browserify: {
    settings: {
      transform: ['babelify', preprocessify(context[gutil.env.type])]
    },
    standalone: {
      'skygear': 'skygear',
      'skygear-core': 'skygear'
    },
    // Be aware, this path is relative to the package, not this folder
    src: './lib/index.js',
    dest: './dist',
    outputName: 'bundle.js',
    debug: gutil.env.type === 'dev'
  },
  minified: {
    'skygear': 'skygear.min.js',
    'skygear-core': 'skygear.min.js'
  },
  cdn: {
    region: 'us-east-1',
    bucket: 'code.skygear.io',
    path: {
      'skygear': 'js/skygear',
      'skygear-core': 'js/skygear-core'
    },
    distribution: 'E1PUX937CX882Y'
  },
  getAllPackagesPath: function() {
    return glob.sync(this.packages);
  },
  getPackageConfigs: function() {
    return this.getAllPackagesPath().map((packagePath)=> {
      var basename = path.basename(packagePath);
      return {
        path: packagePath,
        src: path.join(packagePath, this.srcInPackage),
        dest: path.join(packagePath, this.destInPackage),
        standalone: this.browserify.standalone[basename] || 'skygear',
        browserifySrc: path.join(packagePath, this.browserify.src),
        browserifyDest: path.join(packagePath, this.browserify.dest),
        minifiedDest: this.minified[basename] || 'skygear.min.js',
        cdnPath: this.cdn.path[basename] || path.join('js', basename)
      };
    });
  }
};
