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
import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import sinon from 'sinon';
import Pubsub from '../lib/pubsub';
import Container from '../lib/container';

describe('Pubsub', function () {
  var fn1 = function () { };
  var fn2 = function () { };
  var container;
  var pubsub;
  var ws;

  beforeEach(function () {
    container = new Container();
    container.autoPubsub = false;
    container.configApiKey('API_KEY');
    pubsub = new Pubsub(container, true);
    ws = {
      readyState: 1
    };
    pubsub._setWebSocket(ws);
  });

  it('return is connected', function () {
    expect(pubsub.connected).to.be.true();
  });

  it('WebSocket getter', function () {
    expect(pubsub.WebSocket).not.be.null();
  });

  it('send subscription when connected', function () {
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'sub',
        channel: 'CHANNEL'
      });
    });
    pubsub.subscribe('CHANNEL', fn1);
    expect(pubsub._handlers.CHANNEL).to.deep.equal([fn1]);
    expect(ws.send).to.be.calledOnce();
  });

  it('not send for subscription when disconnected', function () {
    ws.readyState = 2;
    ws.send = sinon.spy();
    pubsub.subscribe('CHANNEL', fn1);
    expect(ws.send).not.to.be.called();
  });

  it('not send for subscription when channel already subscribed', function () {
    ws.send = sinon.spy();
    pubsub._handlers = {
      CHANNEL: [fn1]
    };
    pubsub.subscribe('CHANNEL', fn2);
    expect(pubsub._handlers.CHANNEL).to.deep.equal([fn1, fn2]);
    expect(ws.send).not.to.be.called();
  });

  it('call send to publish message', function () {
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'pub',
        channel: 'CHANNEL',
        data: 'DATA'
      });
    });
    pubsub.publish('CHANNEL', 'DATA');
    expect(ws.send).to.be.calledOnce();
  });

  it('call send to unsubscribe a channel', function () {
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'unsub',
        channel: 'CHANNEL'
      });
    });
    pubsub._handlers = {
      CHANNEL: [fn1]
    };
    pubsub.unsubscribe('CHANNEL', fn1);
    expect(pubsub.hasHandlers('CHANNEL')).to.be.false();
    expect(ws.send).to.be.calledOnce();
  });

  it('call send to unsubscribe a handler', function () {
    ws.send = sinon.spy();
    pubsub._handlers = {
      CHANNEL: [fn1, fn2]
    };
    pubsub.unsubscribe('CHANNEL', fn1);
    expect(pubsub._handlers.CHANNEL).to.deep.equal([fn2]);
    expect(ws.send).not.to.be.called();
  });

  it('call send once to unsubscribe all', function () {
    ws.send = sinon.spy();
    pubsub._handlers = {
      CHANNEL: [fn1, fn2]
    };
    pubsub.unsubscribe('CHANNEL');
    expect(pubsub.hasHandlers('CHANNEL')).to.be.false();
    expect(ws.send).to.be.calledOnce();
  });

  it('unsubscribe non-existent channel', function () {
    pubsub.unsubscribe('CHANNEL', null);
  });

  it('no error to unsubscribe when not connected', function () {
    pubsub._setWebSocket(null);
    pubsub._handlers = {
      CHANNEL: [fn1, fn2]
    };
    pubsub.unsubscribe('CHANNEL', null);
  });

  it('handler is called for message', function () {
    var fn = sinon.spy(function (data) {
      expect(data).to.equal('DATA');
    });
    pubsub._handlers = {
      CHANNEL: [fn]
    };
    ws.onmessage({data: '{"channel": "CHANNEL", "data": "DATA"}'});
    expect(fn).to.be.calledOnce();
  });

  it('no error on malformed message', function () {
    ws.onmessage('MALFORMED MESSAGE');
  });

  it('resubscribe on connection open', function () {
    var fn = function () { };
    pubsub._handlers = {
      CHANNEL: [fn]
    };
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'sub',
        channel: 'CHANNEL'
      });
    });
    ws.onopen();
    expect(ws.send).to.be.calledOnce();
  });

  it('resend queued messages on open when no websocket', function () {
    pubsub._setWebSocket(null);
    pubsub.publish('CHANNEL', 'MESSAGE');
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'pub',
        channel: 'CHANNEL',
        data: 'MESSAGE'
      });
    });
    pubsub._setWebSocket(ws);
    ws.onopen();
    expect(ws.send).to.be.calledOnce();
  });

  it('resend queued messages on open after disconnected', function () {
    ws.readyState = 2;
    ws.send = sinon.spy();
    pubsub.publish('CHANNEL', 'MESSAGE');
    expect(ws.send).not.to.be.called();
    ws.readyState = 1;
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'pub',
        channel: 'CHANNEL',
        data: 'MESSAGE'
      });
    });
    ws.onopen();
    expect(ws.send).to.be.calledOnce();
  });

  it('once should subscribe channel and return promise', function () {
    sinon.spy(pubsub, 'subscribe');
    const promise = pubsub.once('CHANNEL');
    promise.catch(function (err) {
      throw err;
    });
    assert(pubsub.subscribe.calledOnce);
    assert(promise instanceof Promise);
  });

  it('once should unsubscribe on message and resolve promise', function () {
    ws.send = function () {};
    sinon.spy(pubsub, 'unsubscribe');
    const promise = pubsub.once('CHANNEL');
    promise.catch(function (err) {
      throw err;
    });
    ws.onmessage({data: '{"channel": "CHANNEL", "data": "DATA"}'});
    assert(pubsub.unsubscribe.calledOnce);
    promise.then(function (data) {
      assert(data === 'DATA');
    });
  });

});

describe('Pubsub connection', function () {
  var container;
  var pubsub;
  var internalPubsub;

  beforeEach(function () {
    container = new Container();
    container.autoPubsub = false;
    container.configApiKey('API_KEY');
    pubsub = new Pubsub(container, false);
    internalPubsub = new Pubsub(container, true);
  });

  it('close when disconnected', function () {
    var ws = {
      readyState: 1,
      close: sinon.spy()
    };
    pubsub._setWebSocket(ws);
    pubsub.close();
    expect(ws.close).to.be.calledOnce();
  });

  it('close when no web socket', function () {
    pubsub._setWebSocket(null);
    pubsub.close();
  });

  it('reset', function () {
    pubsub.reset();
    expect(pubsub._handlers).to.deep.equal({});
  });

  it('reconfigure not internal', function () {
    var spy = sinon.spy(function () {
      return { };
    });
    sinon.stub(pubsub, 'WebSocket', {
      get: function () {
        return spy;
      }
    });
    pubsub.reconfigure();
    expect(spy).to.be.calledWith('ws://skygear.dev/pubsub?api_key=API_KEY');
  });

  it('reconfigure internal', function () {
    var spy = sinon.spy(function () {
      return { };
    });
    sinon.stub(internalPubsub, 'WebSocket', {
      get: function () {
        return spy;
      }
    });
    internalPubsub.reconfigure();
    expect(spy).to.be.calledWith('ws://skygear.dev/_/pubsub?api_key=API_KEY');
  });

  it('call reconfigure without api_key', function () {
    container.configApiKey(null);
    var spy = sinon.spy(function () {
      return { };
    });
    sinon.stub(pubsub, 'WebSocket', {
      get: function () {
        return spy;
      }
    });
    pubsub.reconfigure();
    expect(spy).not.to.be.called();
  });

  it('call connect without api_key', function () {
    container.configApiKey(null);
    var spy = sinon.spy();
    sinon.stub(pubsub, 'WebSocket', {
      get: spy
    });
    pubsub.connect();
    expect(spy).not.to.be.called();
  });

  it('reconnect after connection closed', function (done) {
    var ws = {
      readyState: 2
    };
    pubsub._setWebSocket(ws);
    sinon.stub(pubsub, 'WebSocket', {
      get: function () {
        return function () {
          done();
          return ws;
        };
      }
    });
    ws.onclose();
  });

  it('should call onOpen listener when ws opened', function () {
    const listener = sinon.spy(function () {
      return { };
    });
    pubsub.onOpen(listener);
    pubsub._setWebSocket({
      readyState: 1
    });
    pubsub._ws.onopen();
    expect(listener).to.be.called();
  });

  it('should call onClose listener when ws closed', function () {
    const listener = sinon.spy(function () {
      return { };
    });
    pubsub.onClose(listener);
    pubsub._setWebSocket({
      readyState: 1
    });
    pubsub._ws.onclose();
    expect(listener).to.be.called();
  });

  it('should not call a canceled onClose/onOpen listener', function () {
    const listener = sinon.spy(function () {
      return { };
    });
    const openHanlder = pubsub.onOpen(listener);
    const closeHandler = pubsub.onClose(listener);
    openHanlder.cancel();
    closeHandler.cancel();
    pubsub._setWebSocket({
      readyState: 1
    });
    pubsub._ws.onopen();
    pubsub._ws.onclose();
    expect(listener).not.to.be.called();
  });

});
