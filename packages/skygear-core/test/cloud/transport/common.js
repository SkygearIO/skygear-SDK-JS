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
import CommonTransport
  from '../../../lib/cloud/transport/common';
import { SkygearResponse, SkygearRequest }
  from '../../../lib/cloud/transport/common';

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
      },
      context: {
        user_id: '0383f77599f1412e938f29ae79c3dcc8'
      }
    }).then((result) => {
      expect(opFunc).to.be.calledWithMatch({
        key: 'value'
      }, {
        context: {
          user_id: '0383f77599f1412e938f29ae79c3dcc8'
        }
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
      },
      context: {
        user_id: '0383f77599f1412e938f29ae79c3dcc8'
      }
    }).then((result) => {
      expect(hookFunc).to.be.calledWith(
        sinon.match.any,
        sinon.match(null),
        sinon.match.any,
        sinon.match({
          context: {
            user_id: '0383f77599f1412e938f29ae79c3dcc8'
          }
        })
      );
      expect(result).to.be.eql({
        result: {
          _access: null,
          _id: 'note/uuid'
        }
      });
      done();
    });
  });

  it('should call with handlerHandler', function (done) {
    const registry = new Registry();
    const handlerFunc = sinon.spy(function (req) {
      return req.json.data;
    });
    handlerFunc.handlerName = 'handler1';
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
        body: 'eyJkYXRhIjoi4pyTIn0=', // {"data":"✓"}
        path: '/handler1',
        query_string: 'q=1'
      },
      context: {
        user_id: '0383f77599f1412e938f29ae79c3dcc8'
      }
    }).then((result) => {
      expect(result.result.body).to.eql('4pyT'); // ✓
      expect(handlerFunc).to.be.calledWith(
        sinon.match.any,
        sinon.match({
          context: {
            user_id: '0383f77599f1412e938f29ae79c3dcc8'
          }
        })
      );
      done();
    }).catch(done);
  });

  it('parse parameters in path', function() {
    expect(SkygearRequest._parseParamsInPath('download/:platform/:version', '/download/osx/1.0.0')).to.be.deep.eql({
      platform: 'osx',
      version: '1.0.0'
    });
  });

  it('parse parameters in path, calacala parameters', function() {
    expect(SkygearRequest._parseParamsInPath('hello/:param1/world/:param2', '/hello/foo/world/bar')).to.be.deep.eql({
      param1: 'foo',
      param2: 'bar'
    });
  });

  it('parse parameters in non parameterized path', function() {
    expect(SkygearRequest._parseParamsInPath('a/normal/url', '/a/normal/url')).to.be.deep.eql({});
  });

  it('call with handlerHandler with params in req', function () {
    const registry = new Registry();
    registry.registerHandler('user/:id', function(req) {
      return req;
    }, {
      method: ['GET'],
      authRequired: false,
      userRequired: true
    });
    const transport = new CommonTransport(registry);
    return transport.handlerHandler({
      kind: 'handler',
      name: 'user/12345678',
      param: {
        method: 'GET',
        header: {
          'Content-Type': ['application/json'],
          'Content-Length': ['16']
        },
        body: 'eyJkYXRhIjoi4pyTIn0=', // {"data":"✓"}
        path: '/user/12345678',
        query_string: 'q=1'
      },
      context: {
        user_id: '0383f77599f1412e938f29ae79c3dcc8'
      }
    }).then((result) => {
      const buf = Buffer.from(result.result.body, 'base64');
      const body = JSON.parse(buf);
      expect(body.params).to.deep.equal({
        id: '12345678'
      });
    })
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

describe('SkygearResponse', function () {
  it('should create default response', function () {
    const r = new SkygearResponse();
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.equal('');
    expect(r.headers).to.eql({});
  });

  it('should create response with options', function () {
    const r = new SkygearResponse({
      statusCode: 400,
      body: 'Hello World',
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    expect(r.statusCode).to.equal(400);
    expect(r.body).to.equal('Hello World');
    expect(r.headers).to.eql({
      'Content-Type': 'text/plain'
    });
  });

  it('should get header', function () {
    const r = new SkygearResponse({
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    expect(r.getHeader('Content-Type')).to.eql('text/plain');
  });

  it('should set header', function () {
    const r = new SkygearResponse();
    r.setHeader('Content-Type', 'text/plain');
    expect(r.headers).to.eql({
      'Content-Type': 'text/plain'
    });
  });

  it('should remove header', function () {
    const r = new SkygearResponse({
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    r.removeHeader('Content-Type');
    expect(r.headers).to.eql({});
  });

  it('should write body', function () {
    const r = new SkygearResponse();
    r.write('Hello');
    r.write(' World');
    expect(r.body).to.eql('Hello World');
  });

  it('should return result JSON', function () {
    const r = new SkygearResponse({
      statusCode: 400,
      body: 'Hello World',
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    expect(r.toResultJSON()).to.eql({
      header: {
        'Content-Type': 'text/plain'
      },
      status: 400,
      body: 'SGVsbG8gV29ybGQ=' // 'Hello World'
    });
  });

  it('should wrap another SkygearResponse', function () {
    const r = new SkygearResponse();
    expect(SkygearResponse.wrap(r)).to.eql(r);
  });

  it('should wrap plain object', function () {
    const r = SkygearResponse.wrap({
      success: 'OK'
    });
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.equal('{"success":"OK"}');
    expect(r.headers).to.eql({
      'Content-Type': 'application/json'
    });
  });

  it('should wrap string', function () {
    const r = SkygearResponse.wrap('Hello World');
    expect(r.statusCode).to.equal(200);
    expect(r.body).to.equal('Hello World');
    expect(r.headers).to.eql({
      'Content-Type': 'text/plain; charset=utf-8'
    });
  });

  it('should check if obj is a SkygearResponse', function () {
    expect(SkygearResponse.isInstance(new SkygearResponse())).to.equal(true);
    expect(SkygearResponse.isInstance({})).to.equal(false);
  });
});

/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
