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
import _ from 'lodash';

import {BaseContainer} from '../container';

import {CloudCodeAuthContainer} from './auth';
import {RelationContainer} from '../relation';
import {DatabaseContainer} from '../database';
import {PubsubContainer} from '../pubsub';
import {CloudCodePushContainer} from './push';
import {settings} from './settings';

export default class CloudCodeContainer extends BaseContainer {

  constructor({ sendPluginRequest, asUserId } = {}) {
    super();

    this.asUserId = asUserId;
    this.sendPluginRequest = !!sendPluginRequest;

    this._auth = new CloudCodeAuthContainer(this);
    this._relation = new RelationContainer(this);
    this._db = new DatabaseContainer(this);
    this._pubsub = new PubsubContainer(this);
    this._push = new CloudCodePushContainer(this);
  }

  get auth() {
    return this._auth;
  }

  get relation() {
    return this._relation;
  }

  get publicDB() {
    return this._db.public;
  }

  get privateDB() {
    return this._db.private;
  }

  get pubsub() {
    return this._pubsub;
  }

  get push() {
    return this._push;
  }

  _prepareRequestObject(action, data) {
    let requestObject = super._prepareRequestObject(action, data);

    if (this.auth.accessToken) {
      requestObject = requestObject.set(
        'X-Skygear-Access-Token', this.auth.accessToken);
    }

    return requestObject;
  }

  _prepareRequestData(action, data) {
    let requestData = super._prepareRequestData(action, data);
    let extraData = {};

    if (this.auth.accessToken) {
      extraData.access_token = this.auth.accessToken;
    }

    if (this.asUserId) {
      extraData._user_id = this.asUserId;
    }

    if (this.sendPluginRequest) {
      extraData._from_plugin = true;
    }

    return _.assign(extraData, requestData);
  }

}

/**
 * Get a configured CloudCodeContainer.
 *
 * @param {String} [userId] - user ID of the user. If not specified, the default
 * is determined by the server.
 * @return {CloudCodeContainer} the cloud code container that acts as
 * the specified user.
 */
export function getContainer(userId) {
  const container = new CloudCodeContainer();
  container.apiKey = settings.masterKey;
  container.endPoint = settings.skygearEndpoint + '/';
  if (userId) {
    container.asUserId = userId;
  }
  return container;
}
