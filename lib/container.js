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
const store = require('./store');
const ee = require('event-emitter');

import Asset from './asset';
import User from './user';
import Record from './record';
import Reference from './reference';
import Query from './query';
import Database from './database';
import Pubsub from './pubsub';
import {RelationAction} from './relation';
import Geolocation from './geolocation';
import {Sequence} from './type';
import {AccessTokenNotAccepted} from './error';
import {EventHandle} from './util';

var React;
if (typeof window !== 'undefined') {
  React = require('react-native');
}

const USER_CHANGED = 'userChanged';

export default class Container {

  constructor() {
    this.url = '/* @echo API_URL */';
    this.apiKey = null;
    this.token = null;
    this._accessToken = null;
    this._user = null;
    this._deviceID = null;
    this._getAccessToken();
    this._getDeviceID();
    this._privateDB = null;
    this._publicDB = null;
    this.request = request;
    this._internalPubsub = new Pubsub(this, true);
    this._relation = new RelationAction(this);
    this._pubsub = new Pubsub(this, false);
    this.autoPubsub = true;
    this.ee = ee({});
  }

  config(options) {
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options.endPoint) {
      this.endPoint = options.endPoint;
    }

    let promises = [
      this._getUser(),
      this._getAccessToken(),
      this._getDeviceID()
    ];
    let self = this;
    return Promise.all(promises).then(function () {
      self.reconfigurePubsubIfNeeded();
      return self;
    }, function () {
      return self;
    });
  }

  configApiKey(ApiKey) {
    this.apiKey = ApiKey;
  }

  clearCache() {
    let clear = [];
    if (this._publicDB) {
      clear.push(this._publicDB.clearCache());
    }
    if (this._privateDB) {
      clear.push(this._privateDB.clearCache());
    }
    return Promise.all(clear);
  }

  onUserChanged(listener) {
    this.ee.on(USER_CHANGED, listener);
    return new EventHandle(this.ee, USER_CHANGED, listener);
  }

  signupWithUsername(username, password) {
    return this._signup(username, null, password);
  }

  signupWithEmail(email, password) {
    return this._signup(null, email, password);
  }

  _signup(username, email, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:signup', {
        username: username,
        email: email,
        password: password
      }).then(container._authResolve.bind(container)).then(resolve, reject);
    });
  }

  _authResolve(body) {
    let self = this;
    return Promise.all([
      this._setUser(body.result),
      this._setAccessToken(body.result.access_token)
    ]).then(function () {
      self.reconfigurePubsubIfNeeded();
      return self.currentUser;
    });
  }

  loginWithUsername(username, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:login', {
        username: username,
        password: password
      }).then(container._authResolve.bind(container)).then(resolve, reject);
    });
  }

  loginWithEmail(email, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:login', {
        email: email,
        password: password
      }).then(container._authResolve.bind(container)).then(resolve, reject);
    });
  }

  logout() {
    let container = this;
    this.clearCache();
    return container.makeRequest('auth:logout', {}).then(function () {
      return container._setAccessToken(null);
    }, function (err) {
      return container._setAccessToken(null).then(function () {
        return Promise.reject(err);
      });
    });
  }

  changePassword(oldPassword, newPassword, invalidate = false) {
    if (invalidate) {
      throw Error('Invalidate is not yet implements');
    }
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:password', {
        old_password: oldPassword,
        password: newPassword
      }).then(function (body) {
        return container._setAccessToken(body.result.access_token);
      }).then(resolve, reject);
    });
  }

  getUsersByEmail(emails) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('user:query', {
        emails: emails
      }).then(function (body) {
        const result = body.result;
        const length = result.length;
        const users = new Array(length);
        for (let i = 0; i < length; i++) {
          users[i] = new container.User(result[i].data);
        }
        resolve(users);
      }, function (err) {
        reject(err);
      });
    });
  }

  registerDevice(token, type) {
    if (!token) {
      throw new Error('Token cannot be empty');
    }

    if (!type) {
      if (React) {
        if (React.Platform.OS === 'ios') {
          type = 'ios';
        } else {
          type = 'android';
        }
      } else {
        // TODO: probably web / node, handle it later
        throw new Error('Failed to infer type, please supply a value');
      }
    }

    let deviceID;
    if (this.deviceID) {
      deviceID = this.deviceID;
    }

    let self = this;
    return self.makeRequest('device:register', {
      type: type,
      id: deviceID,
      device_token: token
    }).then(function (body) {
      return self._setDeviceID(body.result.id);
    }, function (error) {
      // Will set the deviceID to null and try again iff deviceID is not null.
      // The deviceID can be deleted remotely, by apns feedback.
      // If the current deviceID is already null, will regards as server fail.
      let skyerr = null;
      if (error.error) {
        skyerr = error.error.code;
      }
      if (self.deviceID && skyerr === 110) {
        return self._setDeviceID(null).then(function () {
          self.registerDevice(token, type);
        });
      } else {
        return Promise.reject(error);
      }
    });
  }

  lambda(name, data) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest(name, {
        args: data
      }).then(function (resp) {
        resolve(resp.result);
      }, reject);
    });
  }

  makeUploadAssetRequest(asset) {
    let self = this;
    return new Promise(function (resolve, reject) {
      self.request
        .put(self.url + 'files/' + encodeURIComponent(asset.name))
        .set('X-Skygear-API-Key', self.apiKey)
        .set('Content-Type', asset.contentType)
        .set('Accept', 'application/json')
        .send(asset.file)
        .end(function (err, res) {
          // Do an application JSON parse beacuse in some condition, the
          // content-type header will got strip and it will not deserial
          // the json for us.
          let body = getRespJSON(res);
          if (err) {
            let skyErr = body.error || err;
            reject({
              status: err.status,
              error: skyErr
            });
          } else {
            const newAsset = Asset.fromJSON(body.result);
            resolve(newAsset);
          }
        });
    });
  }

  makeRequest(action, data) {
    let container = this;
    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }
    let _data = _.assign({
      action: action,
      api_key: this.apiKey,
      access_token: this.accessToken
    }, data);
    let _action = action.replace(':', '/');
    let _request = this.request
      .post(this.url + _action)
      .set('X-Skygear-API-Key', this.apiKey)
      .set('X-Skygear-Access-Token', this.accessToken)
      .set('Accept', 'application/json')
      .send(_data);
    return new Promise(function (resolve, reject) {
      _request.end(function (err, res) {
        // Do an application JSON parse beacuse in some condition, the
        // content-type header will got strip and it will not deserial
        // the json for us.
        let body = getRespJSON(res);

        if (err) {
          let skyErr = body.error || err;
          if (skyErr.code === AccessTokenNotAccepted) {
            return Promise.all([
              container._setAccessToken(null),
              container._setUser(null)
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

  Query(recordCls) {
    return new Query(recordCls);
  }

  get User() {
    return User;
  }

  get Record() {
    return Record;
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

  get currentUser() {
    return this._user;
  }

  _getUser() {
    let self = this;
    return store.getItem('skygear-user').then(function (userJSON) {
      let attrs = JSON.parse(userJSON);
      self._user = self.User.fromJSON(attrs);
    }, function (err) {
      console.warn('Failed to get user', err);
      self._user = null;
      return null;
    });
  }

  _setUser(attrs) {
    let container = this;
    let value = null;
    if (attrs !== null) {
      this._user = new this.User(attrs);
      value = JSON.stringify(this._user.toJSON());
    }

    const setItem = value === null ? store.removeItem('skygear-user')
        : store.setItem('skygear-user', value);
    return setItem.then(function () {
      container.ee.emit(USER_CHANGED, container._user);
      return value;
    }, function (err) {
      console.warn('Failed to presist user', err);
      return value;
    });
  }

  get accessToken() {
    return this._accessToken;
  }

  _getAccessToken() {
    let self = this;
    return store.getItem('skygear-accesstoken').then(function (token) {
      self._accessToken = token;
      return token;
    }, function (err) {
      console.warn('Failed to get access', err);
      self._accessToken = null;
      return null;
    });
  }

  _setAccessToken(value) {
    this._accessToken = value;
    const setItem = value === null ? store.removeItem('skygear-accesstoken')
        : store.setItem('skygear-accesstoken', value);
    return setItem.then(function () {
      return value;
    }, function (err) {
      console.warn('Failed to presist accesstoken', err);
      return value;
    });
  }

  get deviceID() {
    return this._deviceID;
  }

  _getDeviceID() {
    let self = this;
    return store.getItem('skygear-deviceid').then(function (deviceID) {
      self._deviceID = deviceID;
      return deviceID;
    }, function (err) {
      console.warn('Failed to get deviceid', err);
      self._deviceID = null;
      return null;
    });
  }

  _setDeviceID(value) {
    let self = this;
    this._deviceID = value;
    const setItem = value === null ? store.removeItem('skygear-deviceid')
        : store.setItem('skygear-deviceid', value);
    return setItem.then(function () {
      return value;
    }, function (err) {
      console.warn('Failed to presist deviceid', err);
      return value;
    }).then(function (deviceID) {
      self.reconfigurePubsubIfNeeded();
      return deviceID;
    });
  }

  get endPoint() {
    return this.url;
  }

  set endPoint(newEndPoint) {
    // TODO: Check the format
    if (newEndPoint) {
      this.url = newEndPoint;
    }
  }

  get publicDB() {
    if (this._publicDB === null) {
      this._publicDB = new Database('_public', this);
    }
    return this._publicDB;
  }

  get privateDB() {
    if (this.accessToken === null) {
      throw new Error('You must login before access to privateDB');
    }
    if (this._privateDB === null) {
      this._privateDB = new Database('_private', this);
    }
    return this._privateDB;
  }

  get relation() {
    return this._relation;
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

  on(channel, callback) {
    return this.pubsub.on(channel, callback);
  }

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
