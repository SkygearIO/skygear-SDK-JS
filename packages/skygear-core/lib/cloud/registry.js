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
/* eslint-disable no-var, camelcase */
export class Registry {
  constructor() {
    this.funcMap = {
      op: {},
      event: {},
      hook: {},
      timer: {}
    };
    this.paramMap = {
      op: [],
      event: [],
      handler: [],
      hook: [],
      timer: [],
      provider: []
    };
    this.handlers = {};
    this.providers = {};
    this._hookTypeMap = {};
    this.staticAsset = {};
  }

  _addParam(kind, param) {
    let list = this.paramMap[kind];
    list = list.filter(function (item) {
      if (item.name === param.name) {
        console.log(`Replacing previously registered ${kind}: ${item.name}`);
        return false;
      }
      return true;
    });
    list.push(param);
    this.paramMap[kind] = list;
  }

  registerHook(name, func, options) {
    if (!options.type) {
      throw new Error('type is required for hook');
    }
    if (!options.trigger) {
      throw new Error('trigger is required for hook');
    }
    const opts = {
      ...options,
      name: name
    };
    this._addParam('hook', opts);
    this.funcMap.hook[name] = func;
    this._hookTypeMap[name] = options.type;
  }

  registerOp(name, func, options) {
    const opts = {
      name: name,
      key_required: options.keyRequired,
      user_required: options.userRequired
    };
    this._addParam('op', opts);
    this.funcMap.op[name] = func;
  }

  registerEvent(name, func) {
    const eventParams = this.paramMap.event.filter((e) => e.name === name);
    if (eventParams.length === 0) {
      this._addParam('event', { name });
    }

    const funcList = this.funcMap.event[name] || [];
    funcList.push(func);

    this.funcMap.event[name] = funcList;
  }

  registerTimer(name, func, options) {
    const opts = {
      ...options,
      name: name
    };
    this._addParam('timer', opts);
    this.funcMap.timer[name] = func;
  }

  registerHandler(name, func, options) {
    const m = options.method || ['GET', 'POST', 'PUT'];
    const opts = {
      name: name,
      methods: m,
      key_required: options.keyRequired,
      user_required: options.userRequired
    };
    this._addParam('handler', opts);
    if (!this.handlers[name]) {
      this.handlers[name] = {};
    }
    m.forEach((_m) => {
      this.handlers[name][_m] = func;
    });
  }

  registerProvider(providerType, providerID, provider, options) {
    const opts = {
      ...options,
      type: providerType,
      id: providerID
    };
    this._addParam('provider', opts);
    this.providers[providerID] = provider;
  }

  registerAsset(path, func) {
    this.staticAsset[path] = func;
  }

  getFunc(kind, name) {
    if (kind === 'event') {
      throw new Error('getFunc() is not compatible with event kind');
    }
    return this.funcMap[kind][name];
  }

  getEventFunctions(name) {
    return this.funcMap.event[name];
  }

  getHookType(name) {
    return this._hookTypeMap[name];
  }

  getHandler(name, method) {
    for (let k in this.handlers) {
      const handlerPattern = /\/:((?!\/).)+/g;
      const namePattern = new RegExp('^' + k.replace(handlerPattern, '/((?!/).)+') + '$');
      if (name.match(namePattern) !== null)
        return this.handlers[k][method];
    }
    return undefined;
  }

  getProvider(name) {
    return this.providers[name];
  }

  funcList() {
    return this.paramMap;
  }
}

const registry = new Registry();
export default registry;
