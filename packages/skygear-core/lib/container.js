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
import request from 'superagent';
import _ from 'lodash';
import ee from 'event-emitter';

import Asset from './asset';
import Role from './role';
import ACL from './acl';
import Record from './record';
import Reference from './reference';
import Query from './query';
import {Database, PublicDatabase} from './database'; // eslint-disable-line no-unused-vars
import Geolocation from './geolocation';
import getStore from './store';
import {Sequence} from './type';
import {
  SkygearError,
  ErrorCodes
} from './error';

import {AuthContainer} from './auth';
import {Relation, RelationContainer} from './relation'; //eslint-disable-line no-unused-vars
import {DatabaseContainer} from './database';
import {PubsubContainer} from './pubsub';
import {PushContainer} from './push';
import {fromJSON, toJSON} from './util';

/**
 * @type {Record}
 */
export const UserRecord = Record.extend('user');

/**
 * BaseContainer provides the basic configuration for connecting to a
 * Skygear server.
 *
 * For development under different environments, developer may refer to these
 * classes:
 * - Web developement: {@link Container}
 * - React Native: {@link ReactNativeContainer}
 * - Cloud development: {@link CloudCodeContainer}
 *
 * It also proxies other Skygear classes, like {@link BaseContainer#Query}.
 * Thus developer who install Skygear with <script> tag in browser can have
 * access to those classes.
 */
export class BaseContainer {

  constructor() {
    /**
     * @private
     */
    this.url = '/* @echo API_URL */' || null;

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
   * The version of Skygear.
   *
   * @type {String}
   */
  static get VERSION() {
    return '/* @echo SKYGEAR_VERSION */';
  }

  /**
   * The version of Skygear. Convenient getter.
   *
   * @type {String}
   */
  get VERSION() {
    return this.constructor.VERSION;
  }

  /**
   * Sets a new end point and new API key to the container.
   *
   * @param {Object} options - configuration options of the skygear container
   * @param {String} options.apiKey - api key
   * @param {String} options.endPoint - end point
   * @return {Promise<BaseContainer>} promise with the skygear container
   */
  async config(options) {
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options.endPoint) {
      this.endPoint = options.endPoint;
    }

    return this;
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
   * Sets a new end point to the container.
   *
   * @param  {String} endPoint - end point of the skygear container
   */
  configEndPoint(endPoint) {
    this.endPoint = endPoint;
  }

  /**
   * @private
   */
  async makeRequest(action, data) {
    let requestObject = this._prepareRequestObject(action, data);
    let requestData = this._prepareRequestData(action, data);
    const response = await new Promise((resolve) => {
      requestObject.send(requestData).end((err, res) => {
        resolve({
          err: err,
          res: res
        });
      });
    });
    return this._handleResponse(response.err, response.res);
  }

  /**
   * Calls a registered lambda function without arguments.
   *
   * @param  {String} name - name of the lambda function being called
   * @param  {Object} data - data passed to the lambda function
   * @return {Promise<Object>} promise with result of the lambda function
   */
  async lambda(name, data) {
    const presavedData = await this.publicDB._presave(
      this.publicDB._presaveSingleValue.bind(this.publicDB),
      data
    );

    const resp = await this.makeRequest(name, {
      args: presavedData ? toJSON(presavedData) : undefined
    });
    return fromJSON(resp.result);
  }

  _prepareRequestObject(action) {
    if (this.endPoint === null) {
      throw Error('Please config endpoint');
    }

    if (this.apiKey === null) {
      throw Error('Please config ApiKey');
    }

    let _action = action.replace(/:/g, '/');
    return this.request
      .post(this.url + _action)
      .set({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Skygear-API-Key': this.apiKey,
        'X-Skygear-SDK-Version': `skygear-SDK-JS/${this.VERSION}`
      });
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

  async _handleResponse(err, res) {
    // Do an application JSON parse because in some condition, the
    // content-type header will got strip and it will not deserial
    // the json for us.
    let body = getRespJSON(res);

    if (err) {
      let skyErr = body.error || err;
      throw {
        status: err.status,
        error: skyErr
      };
    } else {
      return body;
    }
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
   * @type {SkygearError}
   */
  get Error() {
    return SkygearError;
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
   * Clears all cache in skygear container store.
   *
   * @return {Promise} resolve when cache is cleared successfully
   */
  async clearCache() {
    return this.store.clearPurgeableItems();
  }

}

/**
 * Container provides configuration for connecting to Skygear server, and
 * accessors to other containers, providing various functionalities:
 * - `skygear.auth` - {@link AuthContainer}: User authentications and user
 * roles API.
 * - `skygear.relation` - {@link RelationContainer}: User relation API, like
 * add and query Friends.
 * - `skygear.privateDB` - {@link Database}: Private database of the current
 * user, with record API, like query, save and delete.
 * - `skygear.publicDB` - {@link PublicDatabase}: Public database, providing
 * the same record API as {@link Database}, but with additional record role
 * API.
 * - `skygear.pubsub` - {@link PubsubContainer}: A publish-subscribe interface,
 * providing real-time message-based communication with other users.
 * - `skygear.push` - {@link PushContainer}: Push Notifications.
 */
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

  /**
   * Sets a new end point and new API key to the container.
   *
   * After configuration,
   * - it tries to restore the user, access token and device id, and,
   * - the pubsub client connects to skygear server if a user is restored.
   *
   * @param {Object} options - configuration options of the skygear container
   * @param {String} options.apiKey - api key
   * @param {String} options.endPoint - end point
   * @return {Promise<Container>} promise with the skygear container
   */
  async config(options) {
    try {
      await super.config(options);
      let promises = [
        this.auth._getUser(),
        this.auth._getAccessToken(),
        this.push._getDeviceID()
      ];
      await Promise.all(promises);
      this.pubsub._reconfigurePubsubIfNeeded();
    } catch (err) {
      // do nothing
    }
    return this;
  }

  _prepareRequestObject(action, data) {
    let requestObject = super._prepareRequestObject(action, data);

    if (this.auth.accessToken) {
      requestObject = requestObject
        .set('X-Skygear-Access-Token', this.auth.accessToken);
    }

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

  async _handleResponse(err, res) {
    try {
      return await super._handleResponse(err, res);
    } catch (innerError) {
      // Logout user implicitly if
      let errorCode = innerError.error.code;
      if (errorCode === this.ErrorCodes.AccessTokenNotAccepted) {
        await Promise.all([
          this.auth._setAccessToken(null),
          this.auth._setUser(null)
        ]);
      }
      throw innerError;
    }
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
