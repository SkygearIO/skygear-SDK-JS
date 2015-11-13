/*eslint-disable no-unused-expressions */
const chai = require('chai');

import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import Pubsub from '../lib/pubsub';

chai.use(sinonChai);

describe('Pubsub', function () {
  var fn1 = function () { };
  var fn2 = function () { };
  var pubsub;
  var ws;

  beforeEach(function () {
    pubsub = new Pubsub();
    ws = {
      readyState: 1
    };
    pubsub._setWebSocket(ws);
  });

  it('return is connected', function () {
    expect(pubsub.connected).to.be.true;
  });

  it('WebSocket getter', function () {
    expect(pubsub.WebSocket).not.be.null;
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
    expect(ws.send).to.be.calledOnce;
  });

  it('not send for subscription when disconnected', function () {
    ws.readyState = 2;
    ws.send = sinon.spy();
    pubsub.subscribe('CHANNEL', fn1);
    expect(ws.send).not.to.be.called;
  });

  it('not send for subscription when channel already subscribed', function () {
    ws.send = sinon.spy();
    pubsub._handlers = {
      CHANNEL: [fn1]
    };
    pubsub.subscribe('CHANNEL', fn2);
    expect(pubsub._handlers.CHANNEL).to.deep.equal([fn1, fn2]);
    expect(ws.send).not.to.be.called;
  });

  it('call send to publish message', function () {
    ws.send = sinon.spy(function (data){
      expect(JSON.parse(data)).to.deep.equal({
        action: 'pub',
        channel: 'CHANNEL',
        data: 'DATA'
      });
    });
    pubsub.publish('CHANNEL', 'DATA');
    expect(ws.send).to.be.calledOnce;
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
    expect(pubsub.hasHandlers('CHANNEL')).to.be.false;
    expect(ws.send).to.be.calledOnce;
  });

  it('call send to unsubscribe a handler', function () {
    ws.send = sinon.spy();
    pubsub._handlers = {
      CHANNEL: [fn1, fn2]
    };
    pubsub.unsubscribe('CHANNEL', fn1);
    expect(pubsub._handlers.CHANNEL).to.deep.equal([fn2]);
    expect(ws.send).not.to.be.called;
  });

  it('call send once to unsubscribe all', function () {
    ws.send = sinon.spy();
    pubsub._handlers = {
      CHANNEL: [fn1, fn2]
    };
    pubsub.unsubscribe('CHANNEL');
    expect(pubsub.hasHandlers('CHANNEL')).to.be.false;
    expect(ws.send).to.be.calledOnce;
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
    expect(fn).to.be.calledOnce;
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
    expect(ws.send).to.be.calledOnce;
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
    expect(ws.send).to.be.calledOnce;
  });

  it('resend queued messages on open after disconnected', function () {
    ws.readyState = 2;
    ws.send = sinon.spy();
    pubsub.publish('CHANNEL', 'MESSAGE');
    expect(ws.send).not.to.be.called;
    ws.readyState = 1;
    ws.send = sinon.spy(function (data) {
      expect(JSON.parse(data)).to.deep.equal({
        action: 'pub',
        channel: 'CHANNEL',
        data: 'MESSAGE'
      });
    });
    ws.onopen();
    expect(ws.send).to.be.calledOnce;
  });

});

describe('Pubsub connection', function () {
  var pubsub;

  beforeEach(function () {
    pubsub = new Pubsub();
  });

  it('close when disconnected', function () {
    var ws = {
      readyState: 1,
      close: sinon.spy()
    };
    pubsub._setWebSocket(ws);
    pubsub.close();
    expect(ws.close).to.be.calledOnce;
  });

  it('close when no web socket', function () {
    pubsub._setWebSocket(null);
    pubsub.close();
  });

  it('reset', function () {
    pubsub.reset();
    expect(pubsub._handlers).to.deep.equal({});
  });

  it('configure', function () {
    var spy = sinon.spy(function () {
      return { };
    });
    sinon.stub(pubsub, 'WebSocket', {
      get: function () {
        return spy;
      }
    });
    pubsub.configure('URL', 'API_KEY');
    expect(spy).to.be.calledWith('URL?api_key=API_KEY');
  });

  it('call configure without api_key and url', function () {
    var spy = sinon.spy(function () {
      return { };
    });
    sinon.stub(pubsub, 'WebSocket', {
      get: function () {
        return spy;
      }
    });
    pubsub.configure();
    expect(spy).not.to.be.called;
  });

  it('call connect without api_key and url', function () {
    var spy = sinon.spy();
    sinon.stub(pubsub, 'WebSocket', {
      get: spy
    });
    pubsub.connect();
    expect(spy).not.to.be.called;
  });

  it('reconnect after connection closed', function (done) {
    var ws = {
      readyState: 2
    };
    pubsub._setWebSocket(ws);
    pubsub._apiKey = 'API_KEY';
    pubsub._url = 'URL';
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
});
/*eslint-enable no-unused-expressions */
