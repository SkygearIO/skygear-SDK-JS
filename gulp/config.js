var argv = require('minimist')(process.argv.slice(2));
var preprocessify = require('preprocessify');

var context = require('./context');
var glob = require('glob');
var path = require('path');

var deployEnv = argv['deploy-env'] || 'production';

module.exports = {
  deployEnv: deployEnv,
  packages: './packages/*',
  jsSrcInPackage: './lib/**/*.js',
  tsSrcInPackage: './lib/**/*.ts',
  destInPackage: './dist',
  jsTestInPackage: './test/**/*.js',
  tsTestInPackage: './test/**/*.ts',
  browserify: {
    settings: {
      transform: ['babelify', preprocessify(context[deployEnv])]
    },
    standalone: {
      'skygear': 'skygear',
      'skygear-core': 'skygear'
    },
    // Be aware, this path is relative to the package, not this folder
    src: './lib/index.js',
    dest: './dist',
    outputName: 'bundle.js',
    debug: deployEnv === 'dev'
  },
  minified: {
    'skygear': 'skygear.min.js',
    'skygear-core': 'skygear.min.js'
  },
  getAllPackagesPath: function() {
    return glob.sync(this.packages);
  },
  getPackageConfigs: function() {
    return this.getAllPackagesPath().map((packagePath)=> {
      var basename = path.basename(packagePath);
      return {
        path: packagePath,
        jsSrc: path.join(packagePath, this.jsSrcInPackage),
        tsSrc: path.join(packagePath, this.tsSrcInPackage),
        dest: path.join(packagePath, this.destInPackage),
        jsTest: path.join(packagePath, this.jsTestInPackage),
        tsTest: path.join(packagePath, this.tsTestInPackage),
        standalone: this.browserify.standalone[basename] || 'skygear',
        browserifySrc: path.join(packagePath, this.browserify.src),
        browserifyDest: path.join(packagePath, this.browserify.dest),
        minifiedDest: this.minified[basename] || 'skygear.min.js'
      };
    });
  }
};
