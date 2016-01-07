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
const WebSocket = require('websocket').w3cwebsocket;
const url = require('url');
const ee = require('event-emitter');

import {EventHandle} from './util';

const ON_OPEN = 'onOpen';
const ON_CLOSE = 'onClose';

export default class Pubsub {

  constructor(container, internal = false) {
    this._container = container;
    this._ws = null;
    this._internal = internal;
    this._queue = [];
    this.ee = ee({});
    this._handlers = {};
    this._reconnectWait = 5000;
    this._retryCount = 0;
  }

  onOpen(listener) {
    this.ee.on(ON_OPEN, listener);
    return new EventHandle(this.ee, ON_OPEN, listener);
  }

  onClose(listener) {
    this.ee.on(ON_CLOSE, listener);
    return new EventHandle(this.ee, ON_CLOSE, listener);
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

  reconfigure() {
    if (!this._hasCredentials()) {
      this.close();
      return;
    }

    this.connect();
  }

  _onopen() {
    let self = this;

    // Trigger registed onOpen callback
    this.ee.emit(ON_OPEN, true);

    // Resubscribe previously subscribed channels
    _.forEach(this._handlers, function (handlers, channel) {
      self._sendSubscription(channel);
    });

    // Flushed queued messages to the server
    _.forEach(this._queue, function (data) {
      self._ws.send(JSON.stringify(data));
    });
    this._queue = [];
  }

  _onmessage(data) {
    _.forEach(this._handlers[data.channel], function (handler) {
      handler(data.data);
    });
  }

  on(channel, callback) {
    return this.subscribe(channel, callback);
  }

  publish(channel, message) {
    let data = {
      action: 'pub',
      channel: channel,
      data: message
    };
    if (this.connected) {
      this._ws.send(JSON.stringify(data));
    } else {
      this._queue.push(data);
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

  off(channel, callback = null) {
    this.unsubscribe(channel, callback);
  }

  subscribe(channel, handler) {
    let alreadyExists = this.hasHandlers(channel);
    this._register(channel, handler);
    if (!alreadyExists) {
      this._sendSubscription(channel);
    }
    return handler;
  }

  unsubscribe(channel, handler = null) {
    if (!this.hasHandlers(channel)) {
      return;
    }

    var handlersToRemove;
    if (handler) {
      handlersToRemove = [handler];
    } else {
      handlersToRemove = this._handlers[channel];
    }

    let self = this;
    _.forEach(handlersToRemove, function (handlerToRemove) {
      self._unregister(channel, handlerToRemove);
    });

    if (!this.hasHandlers(channel)) {
      this._sendRemoveSubscription(channel);
    }
  }

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
    let self = this;
    let interval = _.min([this._reconnectWait * this._retryCount, 60000]);
    _.delay(function () {
      self._retryCount += 1;
      self.connect();
    }, interval);
  }

  get connected() {
    return this._ws && this._ws.readyState === 1;
  }

  reset() {
    this.close();
    this._handlers = {};
  }

  close() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }

  get WebSocket() {
    return WebSocket;
  }

  _setWebSocket(ws) {
    const emitter = this.ee;
    this._ws = ws;

    if (!this._ws) {
      return;
    }

    let self = this;
    this._ws.onopen = function () {
      self._retryCount = 0;
      self._onopen();
    };
    this._ws.onclose = function () {
      emitter.emit(ON_CLOSE, false);
      self._reconnect();
    };
    this._ws.onmessage = function (evt) {
      var message;
      try {
        message = JSON.parse(evt.data);
      } catch (e) {
        console.log('Receivied unrecognized data from pubsub websocket.');
        return;
      }
      self._onmessage(message);
    };
  }

  connect() {
    if (!this._hasCredentials() || this.connected) {
      return;
    }

    let pubsubUrl = this._pubsubUrl(this._internal);
    let ws = new this.WebSocket(pubsubUrl);
    this._setWebSocket(ws);
  }
}
