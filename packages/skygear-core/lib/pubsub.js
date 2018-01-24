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
const _ = require('lodash');
const _ws = require('websocket');
let WebSocket = null;
if (_ws) {
  WebSocket = _ws.w3cwebsocket;
} else {
  WebSocket = window.WebSocket; //eslint-disable-line
}
const url = require('url');
const ee = require('event-emitter');

import {EventHandle} from './util';

const ON_OPEN = 'onOpen';
const ON_CLOSE = 'onClose';

/**
 * The Pubsub client
 */
export class Pubsub {

  /**
   * Constructs a new Pubsub object.
   *
   * @param  {container} container - the Skygear container
   * @param  {Boolean} internal - true if it is an internal pubsub client
   * @return {Pubsub} pubsub client
   */
  constructor(container, internal = false) {
    this._container = container;
    this._ws = null;
    this._internal = internal;
    this._queue = [];
    this._ee = ee({});
    this._handlers = {};
    this._reconnectWait = 5000;
    this._retryCount = 0;
  }

  /**
   * Registers a connection open listener
   *
   * @param  {function()} listener - the listener
   * @return {EventHandler} event handler
   */
  onOpen(listener) {
    this._ee.on(ON_OPEN, listener);
    return new EventHandle(this._ee, ON_OPEN, listener);
  }

  /**
   * Registers a connection close listener
   *
   * @param  {function()} listener - the listener
   * @return {EventHandler} event handler
   */
  onClose(listener) {
    this._ee.on(ON_CLOSE, listener);
    return new EventHandle(this._ee, ON_CLOSE, listener);
  }

  _pubsubUrl(internal = false) {
    let parsedUrl = url.parse(this._container.endPoint);
    let protocol = parsedUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    let path = internal ? '/_/pubsub' : '/pubsub';
    var queryString = '?api_key=' + this._container.apiKey;
    return protocol + '//' + parsedUrl.host + path + queryString;
  }

  _hasCredentials() {
    return !!this._container.apiKey;
  }

  /**
   * Connects to server if the Skygear container has credential, otherwise
   * close the connection.
   */
  reconfigure() {
    if (!this._hasCredentials()) {
      this.close();
      return;
    }

    this.connect();
  }

  _onopen() {
    // Trigger registed onOpen callback
    this._ee.emit(ON_OPEN, true);

    // Resubscribe previously subscribed channels
    _.forEach(this._handlers, (handlers, channel) => {
      this._sendSubscription(channel);
    });

    // Flushed queued messages to the server
    _.forEach(this._queue, (data) => {
      this._ws.send(JSON.stringify(data));
    });
    this._queue = [];
  }

  _onmessage(data) {
    _.forEach(this._handlers[data.channel], (handler) => {
      handler(data.data);
    });
  }

  /**
   * Subscribes a function callback on receiving message at the specified
   * channel.
   *
   * @param {string} channel - name of the channel to subscribe
   * @param {function(object:*)} callback - function to be trigger with
   * incoming data
   * @return {function(object:*)} The callback function
   **/
  on(channel, callback) {
    return this.subscribe(channel, callback);
  }

  /**
   * Subscribes the channel for just one message.
   *
   * This function takes one message off from a pubsub channel,
   * returning a promise of that message. When a message
   * is received from the channel, the channel will be unsubscribed.
   *
   * @param {string} channel - name of the channel
   * @return {Promise<Object>} promise of next message in this channel
   */
  once(channel) {
    return new Promise((resolve) => {
      const handler = (data) => {
        this.unsubscribe(channel, handler);
        resolve(data);
      };
      this.subscribe(channel, handler);
    });
  }

  /**
   * Publishes message to a channel.
   *
   * @param {String} channel - name of the channel
   * @param {Object} data - data to be published
   */
  publish(channel, data) {
    if (!channel) {
      throw new Error('Missing channel to publish');
    }

    const dataType = typeof data;
    if (dataType !== 'object' || data === null || _.isArray(data)) {
      throw new Error('Data must be object');
    }

    let publishData = {
      action: 'pub',
      channel,
      data
    };
    if (this.connected) {
      this._ws.send(JSON.stringify(publishData));
    } else {
      this._queue.push(publishData);
    }
  }

  _sendSubscription(channel) {
    if (this.connected) {
      let data = {
        action: 'sub',
        channel: channel
      };
      this._ws.send(JSON.stringify(data));
    }
  }

  _sendRemoveSubscription(channel) {
    if (this.connected) {
      let data = {
        action: 'unsub',
        channel: channel
      };
      this._ws.send(JSON.stringify(data));
    }
  }

  /**
   * Unsubscribes a function callback on the specified channel.
   *
   * If pass in `callback` is null, all callbacks in the specified channel
   * will be removed.
   *
   * @param {string} channel - name of the channel to unsubscribe
   * @param {function(object:*)=} callback - function to be trigger with
   * incoming data
   **/
  off(channel, callback = null) {
    this.unsubscribe(channel, callback);
  }

  /**
   * Subscribes a function callback on receiving message at the specified
   * channel.
   *
   * @param {string} channel - name of the channel to subscribe
   * @param {function(object:*)} handler - function to be trigger with
   * incoming data
   * @return {function(object:*)} The callback function
   **/
  subscribe(channel, handler) {
    if (!channel) {
      throw new Error('Missing channel to subscribe');
    }

    let alreadyExists = this.hasHandlers(channel);
    this._register(channel, handler);
    if (!alreadyExists) {
      this._sendSubscription(channel);
    }
    return handler;
  }

  /**
   * Unsubscribes a function callback on the specified channel.
   *
   * If pass in `callback` is null, all callbacks in the specified channel
   * will be removed.
   *
   * @param {string} channel - name of the channel to unsubscribe
   * @param {function(object:*)=} [handler] - function to be trigger with
   * incoming data
   **/
  unsubscribe(channel, handler = null) {
    if (!channel) {
      throw new Error('Missing channel to unsubscribe');
    }

    if (!this.hasHandlers(channel)) {
      return;
    }

    var handlersToRemove;
    if (handler) {
      handlersToRemove = [handler];
    } else {
      handlersToRemove = this._handlers[channel];
    }

    _.forEach(handlersToRemove, (handlerToRemove) => {
      this._unregister(channel, handlerToRemove);
    });

    if (!this.hasHandlers(channel)) {
      this._sendRemoveSubscription(channel);
    }
  }

  /**
   * Checks if the channel is subscribed with any handler.
   *
   * @param {String} channel - name of the channel
   * @return {Boolean} true if the channel has handlers
   */
  hasHandlers(channel) {
    let handlers = this._handlers[channel];
    return handlers ? handlers.length > 0 : false;
  }

  _register(channel, handler) {
    if (!this._handlers[channel]) {
      this._handlers[channel] = [];
    }
    this._handlers[channel].push(handler);
  }

  _unregister(channel, handler) {
    let handlers = this._handlers[channel];
    handlers = _.reject(handlers, function (item) {
      return item === handler;
    });
    if (handlers.length > 0) {
      this._handlers[channel] = handlers;
    } else {
      delete this._handlers[channel];
    }
  }

  _reconnect() {
    let interval = _.min([this._reconnectWait * this._retryCount, 60000]);
    _.delay(() => {
      this._retryCount += 1;
      this.connect();
    }, interval);
  }

  /**
   * True if it is connected to the server.
   *
   * @type {Boolean}
   */
  get connected() {
    return this._ws && this._ws.readyState === 1;
  }

  /**
   * Closes connection and clear all handlers.
   */
  reset() {
    this.close();
    this._handlers = {};
  }

  /**
   * Closes connection.
   */
  close() {
    if (this._ws) {
      this._clearWebSocket();
      this._ws.close();
      this._ee.emit(ON_CLOSE, false);
      this._ws = null;
    }
  }

  /**
   * @type {WebSocket}
   */
  get WebSocket() {
    return WebSocket;
  }

  _setWebSocket(ws) {
    const emitter = this._ee;
    this._ws = ws;

    if (!this._ws) {
      return;
    }

    this._ws.onopen = () => {
      this._retryCount = 0;
      this._onopen();
    };
    this._ws.onclose = () => {
      emitter.emit(ON_CLOSE, false);
      this._reconnect();
    };
    this._ws.onmessage = (evt) => {
      var message;
      try {
        message = JSON.parse(evt.data);
      } catch (e) {
        console.log('Got malformed websocket data:', evt.data);
        return;
      }
      this._onmessage(message);
    };
  }

  _clearWebSocket() {
    if (!this._ws) {
      return;
    }

    this._ws.onopen = null;
    this._ws.onclose = null;
    this._ws.onmessage = null;
  }

  /**
   * Connects to server if the Skygear container has credentials and not
   * connected.
   */
  connect() {
    if (!this._hasCredentials() || this.connected) {
      return;
    }

    let pubsubUrl = this._pubsubUrl(this._internal);

    // The old websocket will still call our _onopen and we will try to send
    // message with the new websocket, whose readyState may not be OPEN.
    // Therefore, we need to clear the websocket
    this._clearWebSocket();

    let ws = new this.WebSocket(pubsubUrl);
    this._setWebSocket(ws);
  }
}

/**
 * Pubsub container
 *
 * A publish-subscribe interface, providing real-time message-based
 * communication with other users.
 */
export class PubsubContainer {

  /**
   * @param  {Container} container - the Skygear container
   * @return {PubsubContainer}
   */
  constructor(container) {
    /**
     * @private
     */
    this.container = container;

    this._pubsub = new Pubsub(this.container, false);
    this._internalPubsub = new Pubsub(this.container, true);

    /**
     * Indicating if the pubsub client should connect to server automatically.
     *
     * @type {Boolean}
     */
    this.autoPubsub = true;
  }

  /**
   * Subscribes a function callback on receiving message at the specified
   * channel.
   *
   * @param {string} channel - name of the channel to subscribe
   * @param {function(object:*)} callback - function to be trigger with
   * incoming data
   * @return {function(object:*)} The callback function
   **/
  on(channel, callback) {
    return this._pubsub.on(channel, callback);
  }

  /**
   * Unsubscribes a function callback on the specified channel.
   *
   * If pass in `callback` is null, all callbacks in the specified channel
   * will be removed.
   *
   * @param {string} channel - name of the channel to unsubscribe
   * @param {function(object:*)=} callback - function to be trigger with
   * incoming data
   **/
  off(channel, callback = null) {
    this._pubsub.off(channel, callback);
  }

  /**
   * Subscribes the channel for just one message.
   *
   * This function takes one message off from a pubsub channel,
   * returning a promise of that message. When a message
   * is received from the channel, the channel will be unsubscribed.
   *
   * @param {string} channel - name of the channel
   * @return {Promise<Object>} promise of next message in this channel
   */
  once(channel) {
    return this._pubsub.once(channel);
  }

  /**
   * Registers listener on connection between pubsub client and server is open.
   *
   * @param  {function()} listener - function to be triggered when connection
   * open
   */
  onOpen(listener) {
    this._pubsub.onOpen(listener);
  }

  /**
   * Registers listener on connection between pubsub client and server is
   * closed.
   *
   * @param  {function()} listener - function to be triggered when connection
   * closed
   */
  onClose(listener) {
    this._pubsub.onClose(listener);
  }

  /**
   * Publishes message to a channel.
   *
   * @param {String} channel - name of the channel
   * @param {Object} data - data to be published
   */
  publish(channel, data) {
    this._pubsub.publish(channel, data);
  }

  /**
   * Checks if the channel is subscribed with any handler.
   *
   * @param {String} channel - name of the channel
   * @return {Boolean} true if the channel has handlers
   */
  hasHandlers(channel) {
    this._pubsub.hasHandlers(channel);
  }

  /**
   * @private
   */
  get deviceID() {
    return this.container.push.deviceID;
  }

  _reconfigurePubsubIfNeeded() {
    if (!this.autoPubsub) {
      return;
    }

    this.reconfigure();
  }

  /**
   * Connects to server if the Skygear container has credential, otherwise
   * close the connection.
   */
  reconfigure() {
    this._internalPubsub.reset();
    if (this.deviceID !== null) {
      this._internalPubsub.subscribe('_sub_' + this.deviceID, function (data) {
        console.log('Receivied data for subscription: ' + data);
      });
    }
    this._internalPubsub.reconfigure();
    this._pubsub.reconfigure();
  }

}
