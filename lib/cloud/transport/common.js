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
import stream from 'stream';
import { IncomingForm } from 'formidable';
import { parse } from 'url';
import { pool } from '../pg';
import Record from '../../record';

import skyconfig from '../skyconfig';

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
  constructor(options) {
    this.statusCode = options.statusCode || 200;
    this.headers = options.headers || {};
    this.body = options.body || '';
  }

  setHeader(name, value) {
    this.headers[name] = value;
  }

  getHeader(name) {
    return this.headers[name];
  }

  removeHeader(name) {
    delete this.headers[name];
  }

  write(chunk) {
    this.body += chunk;
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

    const options = { context };
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

    const options = { context };
    return this._promisify(
      func,
      param,
      options
    ).then((result) => {
      return { result };
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

    const options = { context };
    const req = new SkygearRequest(param);
    return this._promisify(
      func,
      req,
      options
    ).then((result) => {
      const headers = {};
      let body;
      let statusCode = 200;
      if (result instanceof SkygearResponse) {
        statusCode = result.statusCode;
        Object.keys(result.headers).forEach((perKey) => {
          headers[perKey] = result.headers[perKey];
        });
        body = b64EncodeUnicode(result.body);
      } else if (typeof result === 'string') {
        headers['Content-Type'] = ['text/plain; charset=utf-8'];
        body = b64EncodeUnicode(result);
      } else {
        headers['Content-Type'] = ['application/json'];
        body = b64EncodeUnicode(JSON.stringify(result));
      }

      return {
        result: {
          status: statusCode,
          header: headers,
          body: body
        }
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
      provider.handleAction,
      param.action,
      param
    ).then((result) => {
      return { result };
    });
  }
}
