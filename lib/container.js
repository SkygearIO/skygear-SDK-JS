/* eslint camelcase: 0 */
const request = require('superagent');
const _ = require('lodash');
const store = require('./store');

import Record from './record';
import Query from './query';
import Database from './database';

export default class Container {

  constructor() {
    this.url = '/* @echo API_URL */';
    this.apiKey = null;
    this.token = null;
    this.accessToken = null;
    this.getCurrentAccessToken();
    this._privateDB = null;
    this._publicDB = null;
    this.request = request;
  }

  config(options) {
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options.endPoint) {
      this.endPoint = options.endPoint;
    }
    return new Promise((resolve) => {
      this.getCurrentAccessToken(() => {
        resolve(this);
      });
    });
  }

  configApiKey(ApiKey) {
    this.apiKey = ApiKey;
  }

  signup(username, email, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:signup', {
        user_id: username,
        email: email,
        password: password
      }).end(function (err, res) {
        let body = res.body;
        if (body === null) {
          body = JSON.parse(res.text);
        }
        if (err) {
          let odErr = body.error || err.response.text;
          reject(Error(odErr.message));
        } else {
          container.currentAccessToken = body.result.access_token;
          resolve(container.currentAccessToken);
        }
      });
    });
  }

  login(username, password) {
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:login', {
        user_id: username,
        password: password
      }).end(function (err, res) {
        let body = res.body;
        if (body === null) {
          body = JSON.parse(res.text);
        }
        if (err) {
          let odErr = body.error || err.response.text;
          reject(Error(odErr.message));
        } else {
          container.currentAccessToken = body.result.access_token;
          resolve(container.currentAccessToken);
        }
      });
    });
  }

  logout() {
    let container = this;
    return new Promise(function (resolve, reject) {
      container
        .makeRequest('auth:logout', {})
        .end(function (err, res) {
          let body = res.body;
          if (body === null) {
            body = JSON.parse(res.text);
          }
          if (err) {
            let odErr = body.error || err.response.text;
            reject(Error(odErr));
          } else {
            resolve();
          }
          container.currentAccessToken = null;
        });
    });
  }

  changePassword(oldPassword, newPassword, invalidate=false) {
    if (invalidate) {
      throw Error('Invalidate is not yet implements');
    }
    let container = this;
    return new Promise(function (resolve, reject) {
      container.makeRequest('auth:password', {
        old_password: oldPassword,
        password: newPassword
      }).end(function (err, res) {
        let body = res.body;
        if (body === null) {
          body = JSON.parse(res.text);
        }
        if (err) {
          let odErr = body.error || err.response.text;
          reject(Error(odErr.message));
        } else {
          container.currentAccessToken = body.result.access_token;
          resolve(container.currentAccessToken);
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
      .set('X-Ourd-API-Key', this.apiKey)
      .set('X-Ourd-Access-Token', this.accessToken)
      .set('Accept', 'application/json')
      .send(_data);
    return _request;
  }

  Query(recordCls) {
    return new Query(recordCls);
  }

  getCurrentAccessToken(callback) {
    store.getItem('skygear-accesstoken', function (err, value) {
      this.accessToken = value;
      if (err) {
        callback(null);
      }
      if (callback) {
        callback(this.accessToken);
      }
    }.bind(this));
  }

  get Record() {
    return Record;
  }

  get currentAccessToken() {
    return this.accessToken;
  }

  set currentAccessToken(value) {
    store.setItem('skygear-accesstoken', value, function (err) {
      if (err) {
        console.warn('Failed to presist accesstoken', err);
      }
    });
    this.accessToken = value;
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
    if (this._publicDB == null) {
      this._publicDB = new Database('_public', this);
    }
    return this._publicDB;
  }

  get privateDB() {
    if (this.accessToken === null) {
      throw new Error('You must login before access to privateDB');
    }
    if (this._privateDB == null) {
      this._privateDB = new Database('_private', this);
    }
    return this._privateDB;
  }

}
