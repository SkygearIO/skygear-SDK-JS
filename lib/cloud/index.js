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
import _skyconfig from './skyconfig';
import { pool as _pool } from './pg';
import { settings as _settings } from './settings';
import crypto from 'crypto';
import _CloudCodeContainer from './container';
import {
  ErrorCodes as _ErrorCodes,
  SkygearError as _SkygearError
} from '../error';

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

export function event(name, func, options = {}) {
  registry.registerEvent(name, func, options);
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
 * skygearCloud.handler('private', function(req, options) {
 *     // cloud code handling the request
 *     const {
 *       context
 *     } = options;
 *     return {
 *       status: 'ok',
 *       user_id: context.user_id // only available if userRequired=true
 *     };
 * }, {
 *     method: ['GET', 'POST'],
 *     userRequired: true
 * });
 *
 * @param {string} path - The path of the handler to be mount.
 * @param {function(request:*, options:*): object} func - function to be
 * registered.
 * @param {object} [options] - options for setting method, userRequired and
 * keyRequired.
 */
export function handler(path, func, options = {}) {
  if (typeof options.method === 'string') {
    options.method = [options.method];
  }
  registry.registerHandler(path, func, options);
}

/**
 * Authentication Provider allows a plugin to authenticate user based on
 * credentials from a third-party. The Authentication Provider responds to
 * Skygear Server whether the credentials are accepted.
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 *
 * skygearCloud.provides('auth', 'com.facebook', Provider);
 *
 * @param {string} providerType - Type of the provider, only auth is supported
 * now.
 * @param {string} providerID - unique identifier to the provider
 * @param {object} ProviderCls - a provider class
 * @param {object} [options] - options for setting
 */
export function provides(providerType, providerID, ProviderCls, options = {}) {
  const provider = new ProviderCls();
  registry.registerProvider(providerType, providerID, provider, options);
}

/**
 * BaseAuthProvider provides example interface that an AuthProvider should
 * provide.
 *
 * To create an actual AuthProvider, you can extend the BaseAuthProvider and
 * provide `login`, `logout` and `info` functions.
 *
 * @example
 *  class Provider extends skygearCloud.BaseAuthProvider {
 *    login(authData) {
 *      console.log(authData);
 *      // third-party API call
 *      return {
 *        principal_id: 'identifier',
 *        auth_data: {...}
 *      }
 *    }
 *
 *    logout(authData) {
 *      console.log(authData);
 *    }
 *
 *    info(authData) {
 *      console.log(authData);
 *    }
 *  }
 *
 */
export class BaseAuthProvider {
  handleAction(action, param) {
    if (!this[action]) {
      throw new Error(`Provider not support action: ${param.action}`);
    }
    return this[action](param);
  }
 /**
  * this method must be overridden by subclass.
  * @abstract
  */
  login(authData) { // eslint-disable-line
    throw new Error(
      'Subclass of BaseAuthProvider should implement login method.');
  }
 /**
  * this method must be overridden by subclass.
  * @abstract
  */
  logout(authData) { // eslint-disable-line
    throw new Error(
      'Subclass of BaseAuthProvider should implement logout method.');
  }
 /**
  * this method must be overridden by subclass.
  * @abstract
  */
  info(authData) { // eslint-disable-line
    throw new Error(
      'Subclass of BaseAuthProvider should implement info method.');
  }
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
 * skygearCloud.beforeSave('note', function(record, original, pool, options) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool, options: *): *} func - function to be registered.
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
 * skygearCloud.afterSave('note', function(record, original, pool, options) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool, options: *): *} func - function to be registered.
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
 * skygearCloud.beforeDelete('note', function(record, original, pool, options) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool, options: *): *} func - function to be registered.
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
 * skygearCloud.afterDelete('note', function(record, original, pool, options) {
 *     // cloud code handling the request
 *     return;
 * }, {
 *     async: true
 * });
 *
 * @param {string} recordType - The type of the record.
 * @param {function(record: lib/record.js~Record, originalRecord: lib/record.js~Record, pool: pool, options: *): *} func - function to be registered.
 * @param {object} [options] - options for hook: async
 */
export function afterDelete(recordType, func, options = {}) {
  let name = funcName(func);
  options.type = recordType;
  options.trigger = 'afterDelete';
  registry.registerHook(name, func, options);
}

/**
 * staticAsset — declare certain path to be serve in static asset.
 *
 * All asset will be serve with the prefix `/static`. i.e. if the mount ping
 * is declare as `/css`. The final URL for requesting assets will be
 * `/static/css`.
 *
 * @example
 * const skygearCloud = require('skygear/cloud');¬
 * skygearCloud.staticAsset('/styles', function() {
 *     // Return the absolute path of the static assets directory
 *     // http://<yourapp>.skygeario.com/static/styles will be serving files
 *     // located at '<project_path>/css`
 *     return __dirname + '/css/';
 * });
 *
 * @param {string} mountPoint - the target mount point
 * @param {function(): string} func - function to return the absolute path of
 * the static assets.
 */
export function staticAsset(mountPoint, func) {
  registry.registerAsset(mountPoint, func);
}

export const skyconfig = _skyconfig;
export const pool = _pool;
export { poolConnect } from './pg';
export { SkygearRequest, SkygearResponse } from './transport/common';
export const settings = _settings;
export const CloudCodeContainer = _CloudCodeContainer;
export const ErrorCodes = _ErrorCodes;
export const SkygearError = _SkygearError;
