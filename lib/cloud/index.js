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
import registry from './registry';
import crypto from 'crypto';

const nameCntMap = {};

function incSuffix(name) {
  if (nameCntMap[name] !== undefined) {
    nameCntMap[name] += 1;
    return name + '-' + nameCntMap[name];
  }
  nameCntMap[name] = 0;
  return name;
}

function funcName(func) {
  let name = func.name;
  if (!name) {
    const hash = crypto.createHash('sha');
    hash.update(func.toString());
    name = hash.digest('hex');
  }
  return incSuffix(name);
}

export function op(name, func, options = {}) {
  registry.registerOp(name, func, options);
}

export function every(cron, func, options = {}) {
  // TODO: check cron format
  options.spec = cron;
  let name = funcName(func);
  registry.registerTimer(name, func, options);
}

export function handler(name, func, options = {}) {
  registry.registerHandler(name, func, options);
}

export function hook(name, func, options = {}) {
  registry.registerHook(name, func, options);
}

export function beforeSave(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'beforeSave';
  registry.registerHook(name, func, options);
}

export function afterSave(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterSave';
  registry.registerHook(name, func, options);
}

export function beforeDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'beforeDelete';
  registry.registerHook(name, func, options);
}

export function afterDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterDelete';
  registry.registerHook(name, func, options);
}

