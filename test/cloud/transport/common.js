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
/*eslint-disable camelcase, dot-notation, no-unused-vars, quote-props */
import {assert, expect} from 'chai';
import sinon from 'sinon';
import {Registry} from '../../../lib/cloud/registry';
import CommonTransport from '../../../lib/cloud/transport/common';

describe('CommonTransport', function () {
  it('should throw Error initHandler', function (done) {
    const registry = new Registry();
    const transport = new CommonTransport(registry);
    return transport.initHandler().catch((err) => {
      expect(err).not.to.be.null();
      done();
    });
  });

  it('should call with opHandler', function (done) {
    const registry = new Registry();
    const opFunc = sinon.stub().returns('op result');
    registry.getFunc = sinon.stub().returns(opFunc);
    const transport = new CommonTransport(registry);
    return transport.opHandler({
      kind: 'op',
      name: 'lambda',
      param: {
        key: 'value'
      }
    }).then((result) => {
      expect(opFunc).to.be.calledWithMatch({
        key: 'value'
      });
      expect(result).to.be.eql({
        result: 'op result'
      });
      done();
    });
  });

  it('should call with eventHandler', function (done) {
    const registry = new Registry();
    const eventFunc = sinon.stub().returns('event result');
    registry.getEventFunctions =
      sinon.stub()
      .withArgs('hello')
      .returns([eventFunc]);

    const transport = new CommonTransport(registry);
    return transport.eventHandler({
      kind: 'event',
      name: 'hello',
      param: {
        hello: 'world'
      }
    }).then((result) => {
      expect(eventFunc).to.be.calledWithMatch({
        hello: 'world'
      });
      expect(result).to.be.eql({
        result: 'event result'
      });
      done();
    });
  });

  it('should call with multiple eventHandlers', function (done) {
    const registry = new Registry();
    const eventFunc1 = sinon.stub().returns('event result 1');
    const eventFunc2 = sinon.stub().returns('event result 2');
    registry.getEventFunctions =
      sinon.stub()
      .withArgs('hello')
      .returns([eventFunc1, eventFunc2]);

    const transport = new CommonTransport(registry);
    return transport.eventHandler({
      kind: 'event',
      name: 'hello',
      param: {
        hello: 'world'
      }
    }).then((result) => {
      expect(eventFunc1).to.be.calledWithMatch({
        hello: 'world'
      });
      expect(eventFunc2).to.be.calledWithMatch({
        hello: 'world'
      });
      expect(result).to.be.eql({
        result: [
          'event result 1',
          'event result 2'
        ]
      });
      done();
    });
  });

  it('should return empty array if no event handlers', function (done) {
    const registry = new Registry();

    const transport = new CommonTransport(registry);
    return transport.eventHandler({
      kind: 'event',
      name: 'hello',
      param: {
        hello: 'world'
      }
    }).then((result) => {
      expect(result).to.be.eql({
        result: []
      });
      done();
    }).catch(done);
  });

  it('should call with timerHandler', function (done) {
    const registry = new Registry();
    const timerFunc = sinon.spy();
    registry.getFunc = sinon.stub().returns(timerFunc);
    const transport = new CommonTransport(registry);
    return transport.timerHandler({
      kind: 'timer',
      name: 'every30s'
    }).then(() => {
      expect(timerFunc).to.be.called();
      done();
    });
  });

  it('should call with hookHandler', function (done) {
    const registry = new Registry();
    const hookFunc = sinon.stub().returns(undefined);
    registry.getFunc = sinon.stub().returns(hookFunc);
    registry.getHookType = sinon.stub().returns('note');
    const transport = new CommonTransport(registry);
    return transport.hookHandler({
      kind: 'hook',
      name: 'beforeNote',
      param: {
        record: {
          '_id': 'note/uuid'
        },
        original: null
      }
    }).then((result) => {
      expect(hookFunc).to.be.called();
      expect(result).to.be.eql({
        result: {
          _access: [{
            level: 'read',
            public: true
          }],
          _id: 'note/uuid'
        }
      });
      done();
    });
  });

  it('should call with handlerHandler', function (done) {
    const registry = new Registry();
    const handlerFunc = sinon.spy();
    registry.getHandler = sinon.stub().returns(handlerFunc);
    const transport = new CommonTransport(registry);
    return transport.handlerHandler({
      kind: 'handler',
      name: 'pubHandler',
      param: {
        method: 'POST',
        header: {
          'Content-Type': ['application/json'],
          'Content-Length': ['16']
        },
        body: 'eyJkYXRhIjoidmFsdWUifQ==', // {"data":"value"}
        path: '/handler1',
        query_string: 'q=1'
      }
    }).then(() => {
      expect(handlerFunc).to.be.called();
      done();
    });
  });

  it('should call init event handler properly', function (done) {
    const initInfo = {
      op: [],
      event: [
        {name: 'init'},
        {name: 'server-ready'}
      ],
      handler: [],
      hook: [],
      timer: [],
      provider: []
    };
    const registry = new Registry();
    registry.funcList = sinon.stub().returns(initInfo);

    const transport = new CommonTransport(registry);
    return transport.eventHandler({
      kind: 'event',
      name: 'init',
      param: {
        config: {
          http: true,
          hostname: 'https://demo.skygeario.com/'
        }
      }
    }).then((result) => {
      // TODO(benlei): Check whether config is properly saved
      expect(registry.funcList).to.be.calledOnce();
      expect(result).to.be.eql({
        result: initInfo
      });
      done();
    });
  });

  it('should call with providerHandler', function (done) {
    const registry = new Registry();
    const providerFunc = {
      handleAction: sinon.spy()
    };
    registry.getProvider = sinon.stub().returns(providerFunc);
    const transport = new CommonTransport(registry);
    return transport.providerHandler({
      kind: 'provider',
      name: 'io.skygear',
      param: {
        action: 'login',
        auth_data: {
          token: 'uuid-from-io.skygear',
          expiry: 1478677997870
        }
      }
    }).then(() => {
      expect(providerFunc.handleAction).to.be.calledWithMatch('login', {
        action: 'login',
        auth_data: {
          token: 'uuid-from-io.skygear',
          expiry: 1478677997870
        }
      });
      done();
    });
  });
});

/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
