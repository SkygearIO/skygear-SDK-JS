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
