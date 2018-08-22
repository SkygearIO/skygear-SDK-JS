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

const PUBSUB_OPEN_TIMEOUT_DURATION = 10000;
const PUBSUB_CLOSE_TIMEOUT_DURATION = 3000;

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

/**
 * Publish multiple events to multiple channels.
 *
 * @param {String[]} [channels] - name of the channels
 * @param {Object[]} [eventsData] - events data to be published
 * @return {Promise<CloudCodeContainer>} promise with the cloud code container
 */
export async function publishMultiChannelEvents(channels, eventsData) {
  const container = new CloudCodeContainer();
  const pubsub = container.pubsub;

  // Try to open configure pubsub within the tiemout duration
  const pubsubOpened = await Promise.race([
    new Promise((resolve) => {
      pubsub.onOpen(() => {
        resolve(true);
      });
      return container.config({
        apiKey: settings.masterKey,
        endPoint: settings.skygearEndpoint + '/'
      }).then(() => {
        pubsub._reconfigurePubsubIfNeeded();
        return;
      });
    }),
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, PUBSUB_OPEN_TIMEOUT_DURATION);
    })
  ]);

  if (!pubsubOpened) {
    throw new Error(
      `Failed to open Skygear Pubsub in ${PUBSUB_OPEN_TIMEOUT_DURATION}ms`
    );
  }

  _.map(channels, (eachChannel) => {
    _.map(eventsData, (eachEventData) => {
      pubsub.publish(eachChannel, eachEventData);
    });
  });

  // Try to close pubsub within the tiemout duration
  const pubsubClosed = await Promise.race([
    new Promise((resolve) => {
      pubsub.onClose(() => {
        resolve(true);
      });
      pubsub._pubsub.close();
    }),
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, PUBSUB_CLOSE_TIMEOUT_DURATION);
    })
  ]);

  if (!pubsubClosed) {
    console.warn(
      `Failed to close Skygear Pubsub in ${PUBSUB_CLOSE_TIMEOUT_DURATION}ms`
    );
  }

  return container;
}

/**
 * Publish a single event to multiple channels.
 *
 * @param {String[]} [channels] - name of the channels
 * @param {Object} [eventData] - event data to be published
 * @return {Promise<CloudCodeContainer>} promise with the cloud code container
 */
export async function publishMultiChannelEvent(channels, eventData) {
  return publishMultiChannelEvents(channels, [eventData]);
}

/**
 * Publish multiple events to a channel.
 *
 * @param {String} [channel] - name of the channel
 * @param {Object[]} [eventsData] - events data to be published
 * @return {Promise<CloudCodeContainer>} promise with the cloud code container
 */
export async function publishChannelEvents(channel, eventsData) {
  return publishMultiChannelEvents([channel], eventsData);
}

/**
 * Publish an event to a channel.
 *
 * @param {String} [channel] - name of the channel
 * @param {Object} [eventData] - event data to be published
 * @return {Promise<CloudCodeContainer>} promise with the cloud code container
 */
export async function publishChannelEvent(channel, eventData) {
  return publishMultiChannelEvents([channel], [eventData]);
}
