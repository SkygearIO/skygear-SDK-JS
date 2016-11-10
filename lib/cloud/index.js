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

/**
 * You can configure the cloud code as an HTTP handler, which can respond to
 * requests coming from outside the SDK. A custom HTTP endpoint can be
 * created using the `handler` function.
 *
 * A custom HTTP endpoint can be useful for the followings:
 *
 * - receiving requests from outside the Skygear SDK
 * - allowing a third party webhook to call upon (e.g. payment
 *   service)
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 * skygearCloud.handler('handler1', function(req) {
 *     // cloud code handling the request
 *     return 'String';
 * }, {
 *     method: ['GET', 'POST'],
 *     userRequired: false
 * });
 *
 * @example
 * skygearCloud.handler('private', function(req) {
 *     // cloud code handling the request
 *     return {
 *       status: 'ok'
 *     };
 * }, {
 *     method: ['GET', 'POST'],
 *     userRequired: true
 * });
 *
 * @param {string} path - The path of the handler to be mount.
 * @param {function(request:*): object} func - function to be registered.
 * @param {object} [options] - options for setting method, userRequired and
 * keyRequired.
 */
export function handler(path, func, options = {}) {
  if (typeof options.method === 'string') {
    options.method = [options.method];
  }
  registry.registerHandler(path, func, options);
}

export function hook(name, func, options = {}) {
  registry.registerHook(name, func, options);
}

/**
 * beforeSave — executes decorated function before a record save operation
 * occurs
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 * skygearCloud.beforeSave('note', function(record, original, pool) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool): *} func - function to be registered.
 * @param {object} [options] - options for hook: async
 */
export function beforeSave(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'beforeSave';
  registry.registerHook(name, func, options);
}

/**
 * afterSave — executes decorated function after a record save operation
 * occurs
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 * skygearCloud.afterSave('note', function(record, original, pool) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool): *} func - function to be registered.
 * @param {object} [options] - options for hook: async
 */
export function afterSave(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterSave';
  registry.registerHook(name, func, options);
}

/**
 * beforeDelete — executes decorated function before a record delete operation
 * occurs
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 * skygearCloud.beforeDelete('note', function(record, original, pool) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool): *} func - function to be registered.
 * @param {object} [options] - options for hook: async
 */
export function beforeDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'beforeDelete';
  registry.registerHook(name, func, options);
}

/**
 * afterDelete — executes decorated function after a record delete operation
 * occurs
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 * skygearCloud.afterDelete('note', function(record, original, pool) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool): *} func - function to be registered.
 * @param {object} [options] - options for hook: async
 */
export function afterDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterDelete';
  registry.registerHook(name, func, options);
}

