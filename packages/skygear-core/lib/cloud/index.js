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
import { createLogger as _createLogger } from './logging';
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

/**
 * You can register the cloud code as lambda, with JSON input and output.
 *
 * This is a convenient way to inject custom logic to Skygear server and can
 * be called easily with `skygear.lambda` in the client side.
 *
 * @example
 * const skygearCloud = require('skygear/cloud');
 * skygearCloud.op('greeting', function(param) {
 *     return {
 *       'content': 'Hello, ' + param.name,
 *     };
 * }, {
 *     userRequired: false
 * });
 *
 * @param {String} name - lambda name
 * @param {function(param:Object, options:*)} func - function to be registered
 * @param {Object} [options]
 * @param {Boolean} [options.keyRequired] - require api key to call the lambda
 * @param {Boolean} [options.userRequired] - require user to call the lambda
 */
export function op(name, func, options = {}) {
  // move authRequired to keyRequired, if keyRequired not specified
  if (options.keyRequired === undefined &&
      options.authRequired !== undefined) {
    const logger = _createLogger('plugin').child({tag: 'plugin'});
    logger.warn('authRequired is deprecated, use keyRequired instead');
    options.keyRequired = options.authRequired;
  }

  registry.registerOp(name, func, options);
}

/**
 * You can register the cloud code to get run at specific time intervals like
 * a cron job.
 *
 * @example
 * const skygearCloud = require('skygear/cloud');
 * skygearCloud.every('@daily', function() {
 *   console.log('Meow');
 * });
 *
 * @param  {String} cron - time interval in cron job syntax
 * @param  {function(param: *)} func - function to be registered
 * @param  {Object} [options]
 */
export function every(cron, func, options = {}) {
  // TODO: check cron format
  options.spec = cron;
  let name = funcName(func);
  registry.registerTimer(name, func, options);
}

/**
 * You can register the cloud code to run at skygear life cycle event.
 *
 * @example
 * const skygearCloud = require('skygear/cloud');
 * skygearCloud.event('after-plugins-ready', function() {
 *   console.log('Meow');
 * });
 *
 * @param {String} name - skygear life cycle event name
 * @param {function(param: *)} func - function to be registered
 * @param {Object} [options]
 */
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
 *       context,
 *       container  // a cloud code container for the current request context
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
 * @param {Object} [options]
 * @param {String[]|String} [options.method] - handler methods, e.g. GET, POST
 * @param {Boolean} [options.keyRequired] - require api key to call the lambda
 * @param {Boolean} [options.userRequired] - require user to call the lambda
 */
export function handler(path, func, options = {}) {
  const logger = _createLogger('plugin').child({tag: 'plugin'});
  if (typeof options.method === 'string') {
    options.method = [options.method];
  }

  // move authRequired to keyRequired, if keyRequired not specified
  if (options.keyRequired === undefined &&
      options.authRequired !== undefined) {
    logger.warn('authRequired is deprecated, use keyRequired instead');
    options.keyRequired = options.authRequired;
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
  async handleAction(action, param) {
    if (!this[action]) {
      throw new Error(`Provider not support action: ${param.action}`);
    }
    return this[action](param);
  }
 /**
  * this method must be overridden by subclass.
  * @abstract
  */
  async login(authData) { // eslint-disable-line
    throw new Error(
      'Subclass of BaseAuthProvider should implement login method.');
  }
 /**
  * this method must be overridden by subclass.
  * @abstract
  */
  async logout(authData) { // eslint-disable-line
    throw new Error(
      'Subclass of BaseAuthProvider should implement logout method.');
  }
 /**
  * this method must be overridden by subclass.
  * @abstract
  */
  async info(authData) { // eslint-disable-line
    throw new Error(
      'Subclass of BaseAuthProvider should implement info method.');
  }
}

/**
 * You can register the cloud code to run at database event.
 *
 * @example
 * const skygearCloud = require('skygear/cloud');
 * skygearCloud.hook('before-save', function(newRecord, oldRecord, pool) {
 *   console.log('Meow');
 *   return newRecord;
 * });
 *
 * @param {String} name - function name
 * @param {function(newRecord:*, oldRecord:*, pool:*, options: *)} func -
 * function to be registered
 * @param {Object} [options]
 * @param {String} [options.type] - record type
 * @param {String} [options.trigger] - type of database event that trigger the
 * hook
 * @param {Boolean} [options.async] - true if the function triggered
 * asynchronously
 */
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
 * @param {Object} [options]
 * @param {Boolean} [options.async] - true if the function triggered
 * asynchronously
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
 * @param {Object} [options]
 * @param {Boolean} [options.async] - true if the function triggered
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
 * @param {Object} [options]
 * @param {Boolean} [options.async] - true if the function triggered
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
 * @param {Object} [options]
 * @param {Boolean} [options.async] - true if the function triggered
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

/**
 * Import and config the cloud code plugin module.
 *
 * This function will load the specified module by name using the `require`
 * function. The specified module must exists or an error is thrown.
 *
 * It is expected that the module will exports a function called `includeme`.
 * This function will also call the `includeme` function to config the module.
 */
export async function configModule(moduleName, options) {
  const logger = _createLogger('plugin').child({tag: 'plugin'});
  const { ignoreWarning } = options || {};
  const { includeme } = require(moduleName);
  if (includeme !== undefined) {
    const settings = {};
    await includeme(module.exports, settings);
  } else if (ignoreWarning !== true) {
    logger.warn(`The ${moduleName} module does not export the includeme` +
    ' function. This function is required to config the module.');
  }
}

export const skyconfig = _skyconfig;
export const pool = _pool;
export { poolConnect } from './pg';
export { SkygearRequest, SkygearResponse } from './transport/common';
export const settings = _settings;
export const CloudCodeContainer = _CloudCodeContainer;
export { getContainer, publishEventsToChannels } from './container';
export const ErrorCodes = _ErrorCodes;
export const SkygearError = _SkygearError;
export const log = _createLogger;
