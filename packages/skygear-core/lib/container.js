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
import Role from './role';
import ACL from './acl';
import Record from './record';
import Reference from './reference';
import Query from './query';
import {Database} from './database';
import Geolocation from './geolocation';
import getStore from './store';
import {Sequence} from './type';
import {ErrorCodes} from './error';

import {AuthContainer} from './auth';
import {RelationContainer} from './relation';
import {DatabaseContainer} from './database';
import {PubsubContainer} from './pubsub';
import {PushContainer} from './push';

export const UserRecord = Record.extend('user');

export class BaseContainer {

  constructor() {
    /**
     * @private
     */
    this.url = '/* @echo API_URL */';

    /**
     * API key of the skygear container
     * @type {String}
     */
    this.apiKey = null;

    /**
     * @private
     */
    this.request = request;

    /**
     * @private
     */
    this.ee = ee({});
  }

  /**
   * Sets a new end point and new API key to the container.
   *
   * @param {Object} options - configuration options of the skygear container
   * @param {String} options.apiKey - api key
   * @param {String} options.endPoint - end point
   * @return {Promise} promise with the skygear container
   */
  config(options) {
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options.endPoint) {
      this.endPoint = options.endPoint;
    }

    return Promise.resolve(this);
  }

  /**
   * Sets a new API key to the container.
   *
   * @param  {String} apiKey - api key of the skygear container
   */
  configApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * @private
   */
  makeRequest(action, data) {
    let requestObject = this._prepareRequestObject(action, data);
    let requestData = this._prepareRequestData(action, data);

    return this._handleResponse(new Promise((resolve) => {
      requestObject.send(requestData).end((err, res) => {
        resolve({
          err: err,
          res: res
        });
      });
    }));
  }

  /**
   * Calls a registered lambda function without arguments.
   *
   * @param  {String} name - name of the lambda function being called
   * @param  {Object} data - data passed to the lambda function
   * @return {Promise} promise with result of the lambda function
   */
  lambda(name, data) {
    return this.makeRequest(name, {
      args: data
    }).then((resp) => resp.result);
  }

  _prepareRequestObject(action) {
    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }

    let _action = action.replace(/:/g, '/');
    return this.request
      .post(this.url + _action)
      .set('X-Skygear-API-Key', this.apiKey)
      .set('Accept', 'application/json');
  }

  _prepareRequestData(action, data) {
    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }

    return _.assign({
      action: action,
      api_key: this.apiKey
    }, data);
  }

  _handleResponse(responsePromise) {
    return responsePromise.then(({err, res}) => {
      // Do an application JSON parse because in some condition, the
      // content-type header will got strip and it will not deserial
      // the json for us.
      let body = getRespJSON(res);

      if (err) {
        let skyErr = body.error || err;
        return Promise.reject({
          status: err.status,
          error: skyErr
        });
      } else {
        return Promise.resolve(body);
      }
    });
  }

  /**
   * @type {Query}
   */
  get Query() {
    return Query;
  }

  /**
   * @type {Role}
   */
  get Role() {
    return Role;
  }

  /**
   * @type {ACL}
   */
  get ACL() {
    return ACL;
  }

  /**
   * @type {Record}
   */
  get Record() {
    return Record;
  }

  /**
   * @type {Record}
   */
  get UserRecord() {
    return UserRecord;
  }

  /**
   * @type {Sequence}
   */
  get Sequence() {
    return Sequence;
  }

  /**
   * @type {Asset}
   */
  get Asset() {
    return Asset;
  }

  /**
   * @type {Reference}
   */
  get Reference() {
    return Reference;
  }

  /**
   * @type {Geolocation}
   */
  get Geolocation() {
    return Geolocation;
  }

  /**
   * @type {Database}
   */
  get Database() {
    return Database;
  }

  /**
   * @type {Relation}
   */
  get Friend() {
    return this.relation.Friend;
  }

  /**
   * @type {Relation}
   */
  get Follower() {
    return this.relation.Follower;
  }

  /**
   * @type {Relation}
   */
  get Following() {
    return this.relation.Following;
  }

  /**
   * @type {ErrorCodes}
   */
  get ErrorCodes() {
    return ErrorCodes;
  }

  /**
   * @type {AuthContainer}
   */
  get AuthContainer() {
    return AuthContainer;
  }

  /**
   * @type {RelationContainer}
   */
  get RelationContainer() {
    return RelationContainer;
  }

  /**
   * @type {DatabaseContainer}
   */
  get DatabaseContainer() {
    return DatabaseContainer;
  }

  /**
   * @type {PubsubContainer}
   */
  get PubsubContainer() {
    return PubsubContainer;
  }

  /**
   * @type {PushContainer}
   */
  get PushContainer() {
    return PushContainer;
  }

  /**
   * Endpoint of the skygear container
   *
   * @type {String}
   */
  get endPoint() {
    return this.url;
  }

  /**
   * Endpoint of the skygear container
   *
   * @type {String}
   */
  set endPoint(newEndPoint) {
    // TODO: Check the format
    if (newEndPoint) {
      if (!_.endsWith(newEndPoint, '/')) {
        newEndPoint = newEndPoint + '/';
      }
      this.url = newEndPoint;
    }
  }

  /**
   * @private
   */
  get store() {
    if (!this._store) {
      this._store = getStore();
    }
    return this._store;
  }

  /**
   * Clears all cache in skygear container store
   *
   * @return {Promise} resolve when cache is cleared successfully
   */
  clearCache() {
    return this.store.clearPurgeableItems();
  }

}

export default class Container extends BaseContainer {

  constructor() {
    super();

    this._auth = new AuthContainer(this);
    this._relation = new RelationContainer(this);
    this._db = new DatabaseContainer(this);
    this._pubsub = new PubsubContainer(this);
    this._push = new PushContainer(this);
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

  /**
   * @type {AuthContainer}
   */
  get auth() {
    return this._auth;
  }

  /**
   * @type {RelationContainer}
   */
  get relation() {
    return this._relation;
  }

  /**
   * @type {PublicDatabase}
   */
  get publicDB() {
    return this._db.public;
  }

  /**
   * @type {Database}
   */
  get privateDB() {
    return this._db.private;
  }

  /**
   * @type {PubsubContainer}
   */
  get pubsub() {
    return this._pubsub;
  }

  /**
   * @type {PushContainer}
   */
  get push() {
    return this._push;
  }

  config(options) {
    return super.config(options).then(() => {
      let promises = [
        this.auth._getUser(),
        this.auth._getAccessToken(),
        this.push._getDeviceID()
      ];
      return Promise.all(promises);
    }).then(() => {
      this.pubsub._reconfigurePubsubIfNeeded();
      return this;
    }, () => {
      return this;
    });
  }

  _prepareRequestObject(action, data) {
    let requestObject = super._prepareRequestObject(action, data);

    requestObject = requestObject
      .set('X-Skygear-Access-Token', this.auth.accessToken);

    if (this.timeoutOptions !== undefined && this.timeoutOptions !== null) {
      requestObject = requestObject.timeout(this.timeoutOptions);
    }

    return requestObject;
  }

  _prepareRequestData(action, data) {
    let requestData = super._prepareRequestData(action, data);

    return _.assign({
      access_token: this.auth.accessToken
    }, requestData);
  }

  _handleResponse(responsePromise) {
    return super._handleResponse(responsePromise)
      .catch((err) => {
        // Logout user implicitly if
        let errorCode = err.error.code;
        if (errorCode === this.ErrorCodes.AccessTokenNotAccepted) {
          return Promise.all([
            this.auth._setAccessToken(null),
            this.auth._setUser(null)
          ]).then(() => {
            return Promise.reject(err);
          });
        }

        return Promise.reject(err);
      });
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
