/* eslint camelcase: 0 */
const request = require('superagent');
const _ = require('lodash');
const store = require('./store');
const url = require('url');

import Asset from './asset';
import Record from './record';
import Reference from './reference';
import Query from './query';
import Database from './database';
import Pubsub from './pubsub';

var React;
if (typeof window !== 'undefined') {
  React = require('react-native');
}

export default class Container {

  constructor() {
    this.url = '/* @echo API_URL */';
    this.apiKey = null;
    this.token = null;
    this._accessToken = null;
    this._deviceID = null;
    this._getAccessToken();
    this._getDeviceID();
    this._privateDB = null;
    this._publicDB = null;
    this.request = request;
    this._internalPubsub = new Pubsub();
    this._pubsub = new Pubsub();
    this.autoPubsub = true;
  }

  config(options) {
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options.endPoint) {
      this.endPoint = options.endPoint;
    }

    let promises = [
      this._getAccessToken(),
      this._getDeviceID()
    ];
    let self = this;
    return Promise.all(promises).then(function () {
      if (self.autoPubsub) {
        self.reconfigurePubsub();
      }
      return self;
    }, function () {
      return self;
    });
  }

  configApiKey(ApiKey) {
    this.apiKey = ApiKey;
  }

  signup(username, password) {
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
      }).then(function (body) {
        return container._setAccessToken(body.result.access_token);
      }).then(resolve, reject);
    });
  }

  login(username, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:login', {
        username: username,
        password: password
      }).then(function (body) {
        return container._setAccessToken(body.result.access_token);
      }).then(resolve, reject);
    });
  }

  loginWithEmail(email, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:login', {
        email: email,
        password: password
      }).then(function (body) {
        return container._setAccessToken(body.result.access_token);
      }).then(resolve, reject);
    });
  }

  logout() {
    let container = this;
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

  registerDevice(token, type) {
    if (!token) {
      throw new Error('Token cannot be empty');
    }

    if (!type) {
      if (React) {
        if (React.PushNotificationIOS) {
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
        .put(self.url + 'files/' + asset.name)
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
            let skyErr = body.error || err.response && err.response.text;
            reject({
              status: err.status,
              error: skyErr
            });
          } else {
            asset.name = body.result.$name;
            resolve(asset);
          }
        });
    });
  }

  makeRequest(action, data) {
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
          let skyErr = body.error || err.response && err.response.text;
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

  get Record() {
    return Record;
  }

  get Asset() {
    return Asset;
  }

  get Reference() {
    return Reference;
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
    let self = this;
    return store.setItem('skygear-accesstoken', value).then(function (token) {
      self._accessToken = token;
      return token;
    }, function (err) {
      console.warn('Failed to presist accesstoken', err);
      self._accessToken = value;
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
    return store.setItem('skygear-deviceid', value).then(function (deviceID) {
      self._deviceID = deviceID;
      return deviceID;
    }, function (err) {
      console.warn('Failed to presist deviceid', err);
      self._deviceID = value;
      return value;
    }).then(function (deviceID) {
      if (self.autoPubsub) {
        self.reconfigurePubsub();
      }
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

  get pubsub() {
    return this._pubsub;
  }

  reconfigurePubsub() {
    this._internalPubsub.reset();
    if (this.deviceID !== null) {
      this._internalPubsub.subscribe('_sub_' + this.deviceID, function (data) {
        console.log('Receivied data for subscription: ' + data);
      });
    }
    this._internalPubsub.configure(this._pubsubUrl(true),
        this.apiKey, this.accessToken);
    this._pubsub.configure(this._pubsubUrl(),
        this.apiKey, this.accessToken);
  }

  _pubsubUrl(internal = true) {
    var parsedUrl = url.parse(this.endPoint);
    var protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    var path = internal ? '/_/pubsub' : '/pubsub';
    return protocol + '//' + parsedUrl.host + path;
  }

  on(channel, callback) {
    return this.pubsub.subscribe(channel, callback);
  }

  off(channel, callback = null) {
    this.pubsub.unsubscribe(channel, callback);
  }
}

function getRespJSON(res) {
  if (res && res.body) {
    return res.body;
  }
  if (res && res.text) {
    return JSON.parse(res.text);
  }

  return {};
}
