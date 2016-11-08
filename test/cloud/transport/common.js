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
  it('should return funcList with initHandler', function () {
    const registry = new Registry();
    const transport = new CommonTransport(registry);
    expect(transport.initHandler()).to.be.eql({
      op: [],
      handler: [],
      hook: [],
      timer: [],
      provider: []
    });
  });

  it('should call with opHandler', function () {
    const registry = new Registry();
    const opFunc = sinon.stub().returns('op result');
    registry.getFunc = sinon.stub().returns(opFunc);
    const transport = new CommonTransport(registry);
    const result = transport.opHandler({
      kind: 'op',
      name: 'lambda',
      param: {
        key: 'value'
      }
    });
    expect(opFunc).to.be.calledWithMatch({
      key: 'value'
    });
    expect(result).to.be.eql({
      result: 'op result'
    });
  });

  it('should call with timerHandler', function () {
    const registry = new Registry();
    const timerFunc = sinon.spy();
    registry.getFunc = sinon.stub().returns(timerFunc);
    const transport = new CommonTransport(registry);
    transport.timerHandler({
      kind: 'timer',
      name: 'every30s'
    });
    expect(timerFunc).to.be.called();
  });

  it('should call with hookHandler', function () {
    const registry = new Registry();
    const hookFunc = sinon.stub().returns(undefined);
    registry.getFunc = sinon.stub().returns(hookFunc);
    registry.getHookType = sinon.stub().returns('note');
    const transport = new CommonTransport(registry);
    const result = transport.hookHandler({
      kind: 'hook',
      name: 'beforeNote',
      param: {
        record: {
          '_id': 'note/uuid'
        },
        original: null
      }
    });
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
  });

  it('should call with handlerHandler', function () {
    const registry = new Registry();
    const handlerFunc = sinon.spy();
    registry.getFunc = sinon.stub().returns(handlerFunc);
    const transport = new CommonTransport(registry);
    transport.timerHandler({
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
    });
    expect(handlerFunc).to.be.called();
  });

});

/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
