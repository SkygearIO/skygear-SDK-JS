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
import {IncomingForm} from 'formidable';
import {parse} from 'url';
import {pool} from '../pg';
import Record from '../../record';

import skyconfig from '../skyconfig';

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
    this.body = atob(param.body);
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

  initHandler() {
    throw new Error('Init trigger is deprecated, use init event instead');
  }

  hookHandler(payload) {
    const {
      name,
      param
    } = payload;
    const func = this.registry.getFunc('hook', name);
    const _type = this.registry.getHookType(name);
    if (!func) {
      throw new Error('Databse hook does not exist');
    }
    const incomingRecord = new Record(_type, param.record);
    let originalRecord = null;
    if (param.original) {
      originalRecord = new Record(_type, param.original);
    }
    let record = func(incomingRecord, originalRecord, pool);
    if (!record) {
      record = incomingRecord;
    }
    return {
      result: record.toJSON()
    };
  }

  opHandler(payload) {
    const func = this.registry.getFunc('op', payload.name);
    if (!func) {
      throw new Error('Lambda not exist');
    }
    return {
      result: func(payload.param)
    };
  }

  eventHandler(payload) {
    const funcList = this.registry.getEventFunctions(payload.name) || [];

    let result = '';
    if (funcList.length > 0) {
      const results = funcList.map((eachFunc) => {
        return eachFunc(payload.param);
      });

      result = results.length > 1 ? results : results[0];
    }

    return {
      result
    };
  }

  timerHandler(payload) {
    const func = this.registry.getFunc('timer', payload.name);
    if (!func) {
      throw new Error('Cronjob not exist');
    }
    return {
      result: func(payload.param)
    };
  }

  handlerHandler(payload) {
    const {
      method
    } = payload.param;
    const func = this.registry.getHandler(payload.name, method);
    if (!func) {
      throw new Error('Handler not exist');
    }
    const req = new SkygearRequest(payload.param);
    const result = func(req);

    const headers = {};
    let body;
    if (typeof result === 'string') {
      headers['Content-Type'] = ['text/plain; charset=utf-8'];
      body = btoa(result);
    } else {
      headers['Content-Type'] = ['application/json'];
      body = btoa(JSON.stringify(result));
    }
    const response = {
      status: 200,
      header: headers,
      body: body
    };
    return {
      result: response
    };
  }

  providerHandler(payload) {
    const {
      name,
      param
    } = payload;
    const provider = this.registry.getProvider(name);
    if (!provider) {
      throw new Error('Provider not exist');
    }
    const result = provider.handleAction(param.action, param);
    return {
      result: result
    };
  }
}
