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
/* eslint camelcase: 0 */
const request = require('superagent');
const _ = require('lodash');
const ee = require('event-emitter');

import Asset from './asset';
import User from './user';
import Role from './role';
import ACL from './acl';
import Record from './record';
import Reference from './reference';
import Query from './query';
import {Database} from './database';
import Pubsub from './pubsub';
import Geolocation from './geolocation';
import getStore from './store';
import {Sequence} from './type';
import {ErrorCodes, SkygearError} from './error';
import {EventHandle} from './util';

import {AuthContainer} from './auth';
import {RelationContainer} from './relation';
import {DatabaseContainer} from './database';

export const USER_CHANGED = 'userChanged';

export default class Container {

  constructor() {
    this.url = '/* @echo API_URL */';
    this.apiKey = null;
    this.token = null;
    this._deviceID = null;
    this._getDeviceID();
    this.request = request;
    this._internalPubsub = new Pubsub(this, true);
    this._pubsub = new Pubsub(this, false);
    this.autoPubsub = true;
    this.ee = ee({});

    this._auth = new AuthContainer(this);
    this._relation = new RelationContainer(this);
    this._db = new DatabaseContainer(this);
    /**
     * Options for how much time to wait for client request to complete.
     *
     * @type {Object}
     * @property {number} [timeoutOptions.deadline] - deadline for the request
     * and response to complete (in milliseconds)
     * @property {number} [timeoutOptions.response=60000] - maximum time to
     * wait for an response (in milliseconds)
     *
     * @see http://visionmedia.github.io/superagent/#timeouts
     */
    this.timeoutOptions = {
      response: 60000
    };
  }

  get auth() {
    return this._auth;
  }

  get relation() {
    return this._relation;
  }

  get db() {
    return this._db;
  }

  config(options) {
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options.endPoint) {
      this.endPoint = options.endPoint;
    }

    let promises = [
      this.auth._getUser(),
      this.auth._getAccessToken(),
      this._getDeviceID()
    ];
    return Promise.all(promises).then(()=> {
      this.reconfigurePubsubIfNeeded();
      return this;
    }, ()=> {
      return this;
    });
  }

  configApiKey(ApiKey) {
    this.apiKey = ApiKey;
  }

  clearCache() {
    return this.store.clearPurgeableItems();
  }

  onUserChanged(listener) {
    this.ee.on(USER_CHANGED, listener);
    return new EventHandle(this.ee, USER_CHANGED, listener);
  }

  inferDeviceType() {
    // To be implmented by subclass
    // TODO: probably web / node, handle it later
    throw new Error('Failed to infer type, please supply a value');
  }

  /**
   * You can register your device for receiving push notifications.
   *
   * @param {string} token - The device token
   * @param {string} type - The device type (either 'ios' or 'android')
   * @param {string} topic - The device topic, refer to application bundle
   * identifier on iOS and application package name on Android.
   **/
  registerDevice(token, type, topic) {
    if (!token) {
      throw new Error('Token cannot be empty');
    }
    if (!type) {
      type = this.inferDeviceType();
    }

    let deviceID;
    if (this.deviceID) {
      deviceID = this.deviceID;
    }

    return this.makeRequest('device:register', {
      type: type,
      id: deviceID,
      topic: topic,
      device_token: token
    }).then((body)=> {
      return this._setDeviceID(body.result.id);
    }, (error)=> {
      // Will set the deviceID to null and try again iff deviceID is not null.
      // The deviceID can be deleted remotely, by apns feedback.
      // If the current deviceID is already null, will regards as server fail.
      let errorCode = null;
      if (error.error) {
        errorCode = error.error.code;
      }
      if (this.deviceID && errorCode === ErrorCodes.ResourceNotFound) {
        return this._setDeviceID(null).then(()=> {
          return this.registerDevice(token, type);
        });
      } else {
        return Promise.reject(error);
      }
    });
  }

  unregisterDevice() {
    if (!this.deviceID) {
      return Promise.reject(
        new SkygearError('Missing device id', ErrorCodes.InvalidArgument)
      );
    }

    return this.makeRequest('device:unregister', {
      id: this.deviceID
    }).then(()=> {
      // do nothing
      return;
    }, (error)=> {
      let errorCode = null;
      if (error.error) {
        errorCode = error.error.code;
      }
      if (errorCode === ErrorCodes.ResourceNotFound) {
        // regard it as success
        return this._setDeviceID(null);
      } else {
        return Promise.reject(error);
      }
    });
  }

  lambda(name, data) {
    return this.makeRequest(name, {
      args: data
    }).then((resp)=> resp.result);
  }

  makeUploadAssetRequest(asset) {
    return new Promise((resolve, reject)=> {
      this.makeRequest('asset:put', {
        filename: asset.name,
        'content-type': asset.contentType,
        'content-size': asset.file.size
      })
      .then((res)=> {
        const newAsset = Asset.fromJSON(res.result.asset);
        const postRequest = res.result['post-request'];

        let postUrl = postRequest.action;
        if (postUrl.indexOf('/') === 0) {
          postUrl = postUrl.substring(1);
        }
        if (postUrl.indexOf('http') !== 0) {
          postUrl = this.url + postUrl;
        }

        let _request = this.request
          .post(postUrl)
          .set('X-Skygear-API-Key', this.apiKey);
        if (postRequest['extra-fields']) {
          _.forEach(postRequest['extra-fields'], (value, key)=> {
            _request = _request.field(key, value);
          });
        }

        _request.attach('file', asset.file).end((err)=> {
          if (err) {
            reject(err);
            return;
          }

          resolve(newAsset);
        });
      }, (err)=> {
        reject(err);
      });
    });
  }

  sendRequestObject(action, data) {
    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }
    let _data = _.assign({
      action: action,
      api_key: this.apiKey,
      access_token: this.auth.accessToken
    }, data);
    let _action = action.replace(/:/g, '/');
    let req = this.request
      .post(this.url + _action)
      .set('X-Skygear-API-Key', this.apiKey)
      .set('X-Skygear-Access-Token', this.auth.accessToken)
      .set('Accept', 'application/json');
    if (this.timeoutOptions !== undefined && this.timeoutOptions !== null) {
      req = req.timeout(this.timeoutOptions);
    }
    return req.send(_data);
  }

  makeRequest(action, data) {
    let _request = this.sendRequestObject(action, data);
    return new Promise((resolve, reject)=> {
      _request.end((err, res)=> {
        // Do an application JSON parse because in some condition, the
        // content-type header will got strip and it will not deserial
        // the json for us.
        let body = getRespJSON(res);

        if (err) {
          let skyErr = body.error || err;
          if (skyErr.code === this.ErrorCodes.AccessTokenNotAccepted) {
            return Promise.all([
              this.auth._setAccessToken(null),
              this.auth._setUser(null)
            ]).then(function () {
              reject({
                status: err.status,
                error: skyErr
              });
            });
          }
          reject({
            status: err.status,
            error: skyErr
          });
        } else {
          resolve(body);
        }
      });
    });
  }

  get Query() {
    return Query;
  }

  get User() {
    return User;
  }

  get Role() {
    return Role;
  }

  get ACL() {
    return ACL;
  }

  get Record() {
    return Record;
  }

  get UserRecord() {
    return Record.extend('user');
  }

  get Sequence() {
    return Sequence;
  }

  get Asset() {
    return Asset;
  }

  get Reference() {
    return Reference;
  }

  get Geolocation() {
    return Geolocation;
  }

  get ErrorCodes() {
    return ErrorCodes;
  }

  get deviceID() {
    return this._deviceID;
  }

  _getDeviceID() {
    return this.store.getItem('skygear-deviceid').then((deviceID)=> {
      this._deviceID = deviceID;
      return deviceID;
    }, (err)=> {
      console.warn('Failed to get deviceid', err);
      this._deviceID = null;
      return null;
    });
  }

  _setDeviceID(value) {
    this._deviceID = value;
    const setItem = value === null ? this.store.removeItem('skygear-deviceid')
        : this.store.setItem('skygear-deviceid', value);
    return setItem.then(()=> {
      return value;
    }, (err)=> {
      console.warn('Failed to persist deviceid', err);
      return value;
    }).then((deviceID)=> {
      this.reconfigurePubsubIfNeeded();
      return deviceID;
    });
  }

  get endPoint() {
    return this.url;
  }

  set endPoint(newEndPoint) {
    // TODO: Check the format
    if (newEndPoint) {
      if (!_.endsWith(newEndPoint, '/')) {
        newEndPoint = newEndPoint + '/';
      }
      this.url = newEndPoint;
    }
  }

  get store() {
    if (!this._store) {
      this._store = getStore();
    }
    return this._store;
  }

  get Database() {
    return Database;
  }

  get pubsub() {
    return this._pubsub;
  }

  reconfigurePubsubIfNeeded() {
    if (!this.autoPubsub) {
      return;
    }

    this._internalPubsub.reset();
    if (this.deviceID !== null) {
      this._internalPubsub.subscribe('_sub_' + this.deviceID, function (data) {
        console.log('Receivied data for subscription: ' + data);
      });
    }
    this._internalPubsub.reconfigure();
    this._pubsub.reconfigure();
  }

  /**
   * Subscribe a function callback on receiving message at the specified
   * channel.
   *
   * @param {string} channel - Name of the channel to subscribe
   * @param {function(object:*)} callback - function to be trigger with
   * incoming data.
   **/
  on(channel, callback) {
    return this.pubsub.on(channel, callback);
  }

  /**
   * Unsubscribe a function callback on the specified channel.
   *
   * If pass in `callback` is null, all callbacks in the specified channel
   * will be removed.
   *
   * @param {string} channel - Name of the channel to unsubscribe
   * @param {function(object:*)=} callback - function to be trigger with
   * incoming data.
   **/
  off(channel, callback = null) {
    this.pubsub.off(channel, callback);
  }
}

function getRespJSON(res) {
  if (res && res.body) {
    return res.body;
  }
  if (res && res.text) {
    try {
      return JSON.parse(res.text);
    } catch (err) {
      console.log('getRespJSON error. error: ', err);
    }
  }

  return {};
}
