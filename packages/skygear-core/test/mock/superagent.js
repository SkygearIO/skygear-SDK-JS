/**
Copyright (c) 2015 M6Web

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
 */

// Fork from https://github.com/M6Web/superagent-mock

/*eslint-disable no-unused-vars */
import _ from 'lodash';
import superagent from 'superagent';

var configs = [];

// Temp fork of https://github.com/M6Web/superagent-mock
function mock(config) {
  if (superagent.mocked) {
    configs = _.union(configs, config);
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
    return function (data, err) {
      fn(err, {
        body: data
      });
    };
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
  Request.prototype.set = function (key, value) {
    if (_.isUndefined(this.headers)) {
      this.headers = {};
    }

    // handle request.set({ 'Accept': 'xxx' })
    if (_.isObject(key)) {
      this.headers = _.merge(this.headers, key);
      return this;
    }

    this.headers[key] = value;
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
/*eslint-enable */
