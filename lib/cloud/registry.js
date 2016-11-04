/* eslint-disable no-var, camelcase */
class Registry {
  constructor() {
    this.funcMap = {
      op: {},
      hook: {},
      timer: {}
    };
    this.paramMap = {
      op: [],
      handler: [],
      hook: [],
      timer: [],
      provider: []
    };
    this.handlers = {};
    this.providers = {};
  }

  _addParam(kind, param) {
    const list = this.paramMap[kind];
    list.filter(function (item) {
      if (item.name === param.name) {
        console.log(`Replacing previously registered ${kind}: ${item.name}`);
        return false;
      }
      return true;
    });
    list.push(param);
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
  }

  registerOp(name, func, options) {
    const opts = {
      ...options,
      name: name,
      auth_required: options.authRequired,
      user_required: options.userRequired
    };
    this._addParam('op', opts);
    this.funcMap.op[name] = func;
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
      method: m,
      auth_required: options.authRequired,
      user_required: options.userRequired
    };
    this._addParam('handler', opts);
    if (!this.handlers.name) {
      this.handlers.name = {};
    }
    m.map(function (_m) {
      this.handlers.name[_m] = func;
    }, this);
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

  getFunc(kind, name) {
    return this.funcMap[kind][name];
  }

  getHandler(name, method) {
    return this.handlers[name][method];
  }

  funcList() {
    return this.paramMap;
  }
}

const registry = new Registry();
export default registry;
