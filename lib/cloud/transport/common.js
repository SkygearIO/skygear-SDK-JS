export default class CommonTransport {
  constructor(registry) {
    this.registry = registry;
  }

  start() {
    throw new Error('Not implemented');
  }

  initHandler(payload) {
    // TODO: properly parse and save the skygear-server config
    this.config = payload;
    return this.registry.funcList();
  }

  hookHandler(payload) {
    const {
      name,
      param
    } = payload;
    const func = this.registry.getFunc('hook', name);
    if (!func) {
      throw new Error('Databse hook does not exist');
    }
    // TODO: Make the record is a SDK Record
    let record = func(param);
    if (record === undefined) {
      record = param.record;
    }
    return {
      result: record
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
    const func = this.registry.getHandler(payload.name, payload.method);
    if (!func) {
      throw new Error('Handler not exist');
    }
    return func();
  }
}
