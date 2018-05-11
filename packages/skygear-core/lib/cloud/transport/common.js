/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  btoa,
  atob
} from 'Base64';
import _ from 'lodash';
import stream from 'stream';
import { IncomingForm } from 'formidable';
import { parse } from 'url';
import { pool } from '../pg';
import Record from '../../record';
import { fromJSON, toJSON } from '../../util';

import skyconfig from '../skyconfig';
import { getContainer } from '../container';

/**
 * Encode 16-bit unicode strings or a buffer to base64 string.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
 */
function b64EncodeUnicode(data) {
  // If the data is a buffer, use its base64 encoding instead of using
  // our unicode to base64 encoding.
  if (data instanceof Buffer) {
    return data.toString('base64');
  }

  return btoa(
    encodeURIComponent(data).replace(/%([0-9A-F]{2})/g,
    function (match, p1) {
      return String.fromCharCode('0x' + p1);
    })
  );
}

/**
 * Decode 16-bit unicode strings from base64 string.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#The_Unicode_Problem
 */
function b64DecodeUnicode(str) {
  return decodeURIComponent(
    Array.prototype.map.call(
      atob(str),
      function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }
    ).join('')
  );
}

/**
 * Create a CloudCodeContainer from the specified request context.
 */
function containerFromContext(context) {
  const {
    user_id: userId
  } = context || {};
  return userId ? getContainer(userId) : getContainer();
}

/**
 * This is thin request object trying to provide a http.IncomingMessage like
 * object for access http request properties.
 */
class SkygearRequest {
  constructor(param) {
    this.headers = param.header;
    this.method = param.method;
    this.path = param.path;
    this.queryString = param.query_string;
    this.body = b64DecodeUnicode(param.body);
    if (this.queryString) {
      this.url = parse(`${this.path}?${this.queryString}`, true);
    } else {
      this.url = parse(`${this.path}`, true);
    }
  }

  get query() {
    return this.url.query;
  }

  form(callback) {
    const req = new stream.PassThrough();
    req.headers = {
      'content-type': this.headers['Content-Type'][0],
      'content-length': this.headers['Content-Length'][0]
    };
    req.end(this.body);
    const f = new IncomingForm();
    return f.parse(req, callback);
  }

  get json() {
    return JSON.parse(this.body);
  }
}

/**
 * This is thin response object trying to provide a http.ServerResponse like
 * interface for setting response headers and body.
 */
export class SkygearResponse {
  /**
   * Creates an instance of SkygearResponse.
   *
   * @param {Object} [options={}] - options to initialize the response
   * @param {number} [options.statusCode=200] - HTTP status code of the response
   * @param {string} [options.body=''] - HTTP response body
   * @param {Object} [options.headers={}] - HTTP response headers
   */
  constructor(options = {}) {
    /**
     * The HTTP status code of the response.
     *
     * @type {number}
     */
    this.statusCode = options.statusCode || 200;

    /**
     * The HTTP headers of the response.
     *
     * @type {Object}
     */
    this.headers = options.headers || {};

    /**
     * The HTTP body of the response.
     *
     * @type {string}
     */
    this.body = options.body || '';

    this._isSkygearResponse = true;
  }

  /**
   * Set a HTTP header to the response.
   *
   * @param {string} name - HTTP header name
   * @param {string} value - HTTP header value
   */
  setHeader(name, value) {
    this.headers[name] = value;
  }

  /**
   * Get a HTTP header from the response.
   *
   * @param {string} name - HTTP header name
   * @return {string} HTTP header value
   */
  getHeader(name) {
    return this.headers[name];
  }

  /**
   * Remove a HTTP header from the response.
   *
   * @param {string} name - HTTP header name
   */
  removeHeader(name) {
    delete this.headers[name];
  }

  /**
   * Write a chunk of data into the response. The chunk will be appended
   * to any existing data in the response body.
   *
   * @param {string} chunk - data to append to the response body
   */
  write(chunk) {
    this.body += chunk;
  }

  /**
   * Convert the response to a result JSON that is suitable for plugin
   * transport.
   *
   * @return {Object} result JSON for plugin transport
   */
  toResultJSON() {
    const header = {};
    const status = this.statusCode || 200;
    const body = b64EncodeUnicode(this.body);

    Object.keys(this.headers).forEach((perKey) => {
      var headerValue = this.headers[perKey];
      if (!_.isArray(headerValue)) {
        headerValue = [headerValue];
      }
      header[perKey] = headerValue;
    });

    return {
      header,
      status,
      body
    };
  }

  /**
   * Wrap response body into a SkygearResponse.
   *
   * If the specified value is a SkygearResponse, the same object will
   * be returned.
   *
   * @param result - SkygearResponse or response body
   * @return {!SkygearResponse} a SkygearResponse
   */
  static wrap(result) {
    if (SkygearResponse.isInstance(result)) {
      return result;
    } else if (typeof result === 'string') {
      return new SkygearResponse({
        statusCode: 200,
        body: result,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8'
        }
      });
    }

    return new SkygearResponse({
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Returns whether the specified object is a SkygearResponse.
   *
   * @param obj - object to be determined
   * @return {boolean} true if the object is a SkygearResponse
   *
   */
  static isInstance(obj) {
    if (obj === undefined || obj === null) {
      return false;
    }
    return obj instanceof SkygearResponse || !!obj._isSkygearResponse;
  }
}

export default class CommonTransport {
  constructor(registry) {
    this.registry = registry;
    this._registerInitEvent = this._registerInitEvent.bind(this);

    this.registry.registerEvent('init', this._registerInitEvent);
  }

  _registerInitEvent(param) {
    const config = param.config || {};
    Object.keys(config).forEach((perKey) => {
      skyconfig[perKey] = config[perKey];
    });

    return this.registry.funcList();
  }

  start() {
    throw new Error('Not implemented');
  }

  _promisify(func, ...param) {
    try {
      const result = func(...param);
      if (result instanceof Promise) {
        return result;
      }
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  initHandler() {
    return Promise.reject(
      new Error('Init trigger is deprecated, use init event instead')
    );
  }

  hookHandler(payload) {
    const {
      name,
      param,
      context
    } = payload;

    const func = this.registry.getFunc('hook', name);
    const _type = this.registry.getHookType(name);
    if (!func) {
      return Promise.reject(new Error('Database hook does not exist'));
    }

    const incomingRecord = new Record(_type, param.record);
    let originalRecord = null;
    if (param.original) {
      originalRecord = new Record(_type, param.original);
    }

    const options = {
      context,
      container: containerFromContext(context)
    };
    return this._promisify(
      func,
      incomingRecord,
      originalRecord,
      pool,
      options
    ).then((_record) => {
      const record = _record || incomingRecord;
      return {
        result: record.toJSON()
      };
    });
  }

  opHandler(payload) {
    const {
      name,
      param,
      context
    } = payload;

    const func = this.registry.getFunc('op', name);
    if (!func) {
      return Promise.reject(new Error('Lambda function does not exist'));
    }

    const options = {
      context,
      container: containerFromContext(context)
    };
    return this._promisify(
      func,
      fromJSON(param),
      options
    ).then((result) => {
      return {
        result: toJSON(result)
      };
    });
  }

  eventHandler(payload) {
    const funcList = this.registry.getEventFunctions(payload.name);

    if (!funcList) {
      // It is okay that the sending event has no handlers
      return Promise.resolve({
        result: []
      });
    }

    const funcPromises = funcList.map(
      (eachFunc) => this._promisify(eachFunc, payload.param)
    );

    return Promise.all(funcPromises).then((results) => {
      const result = results.length > 1 ? results : results[0];
      return { result };
    });
  }

  timerHandler(payload) {
    const func = this.registry.getFunc('timer', payload.name);
    if (!func) {
      return Promise.reject(new Error('Cronjob not exist'));
    }

    return this._promisify(
      func,
      payload.param
    ).then((result) => {
      return { result };
    });
  }

  handlerHandler(payload) {
    const {
      name,
      param,
      context
    } = payload;

    const func = this.registry.getHandler(name, param.method);
    if (!func) {
      return Promise.reject(new Error('Handler not exist'));
    }

    const options = {
      context,
      container: containerFromContext(context)
    };
    const req = new SkygearRequest(param);
    return this._promisify(
      func,
      req,
      options
    ).then((result) => {
      return {
        result: SkygearResponse.wrap(result).toResultJSON()
      };
    });
  }

  providerHandler(payload) {
    const {
      name,
      param
    } = payload;

    const provider = this.registry.getProvider(name);
    if (!provider) {
      return Promise.reject(new Error('Provider not exist'));
    }

    return this._promisify(
      provider.handleAction.bind(provider),
      param.action,
      param
    ).then((result) => {
      return { result };
    });
  }
}
