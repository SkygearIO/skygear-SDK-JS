import _ from 'lodash';
import superagent from 'superagent';

var configs = [];

// Temp fork of https://github.com/M6Web/superagent-mock
function mock(config) {
  if (superagent.mocked) {
    configs = _.union(configs, config)
    return superagent;
  }
  superagent.mocked = true;
  configs = config;
  var Request = superagent.Request;
  var parsers = Object.create(null);

  /**
   * Keep the default methods
   */
  var oldSend = Request.prototype.send;
  var oldEnd = Request.prototype.end;

  /**
   * Attempt to match url against the patterns in fixtures.
   */
  function testUrlForPatterns(url) {
    if (parsers[url]) {
      return parsers[url];
    }

    var match = configs.filter(function (parser) {
      return new RegExp(parser.pattern, 'g').test(url);
    })[0] || null;

    parsers[url] = match;

    return match;
  }

  function callback(fn) {
    return function(data, err) {
      fn(err, {
        body: data
      })
    }
  }

  /**
   * Override send function
   */
  Request.prototype.send = function (data) {

    var parser = testUrlForPatterns(this.url);
    if (parser) {
      this.params = data;

      return this;
    } else {
      return oldSend.call(this, data);
    }

  };

  /**
   * Override set function
   */
  Request.prototype.set = function (headers) {
    this.headers = headers;

    return this;
  };

  /**
   * Override end function
   */
  Request.prototype.end = function (fn) {
    var path = this.url;

    var parser = testUrlForPatterns(this.url);
    var cb = callback(fn);
    if (parser) {
      var match = new RegExp(parser.pattern, 'g').exec(this.url);
      parser.fixtures(match, this.params, this.headers, cb);
    } else {
      oldEnd.call(this, cb);
    }
  };

  return superagent;
}

export default mock;
