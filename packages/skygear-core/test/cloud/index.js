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
import {
  op,
  every,
  event,
  handler,
  provides,
  hook
} from '../../lib/cloud';
import registry from '../../lib/cloud/registry';

describe('Cloud registry functions', function () {
  it('op', function () {
    function func() {}
    const options = {
      authRequired: true,
      userRequired: false
    };
    op('abc', func, options);

    expect(registry.paramMap.op).to.be.eql([{
      name: 'abc',
      key_required: true,
      user_required: false
    }]);
    expect(registry.funcMap.op).to.be.eql({
      abc: func
    });
  });

  it('every', function () {
    function func() {}
    every('@daily', func);

    expect(registry.paramMap.timer).to.be.eql([{
      name: 'func',
      spec: '@daily'
    }]);
    expect(registry.funcMap.timer).to.be.eql({
      func: func
    });
  });

  it('event', function () {
    function func() {}
    event('abc', func);

    expect(registry.paramMap.event).to.be.eql([{
      name: 'abc'
    }]);
    expect(registry.funcMap.event).to.be.eql({
      abc: [func]
    });
  });

  it('handler', function () {
    function func() {}
    const options = {
      method: 'POST',
      authRequired: true,
      userRequired: false
    };
    handler('abc', func, options);

    expect(registry.paramMap.handler).to.be.eql([{
      name: 'abc',
      methods: ['POST'],
      key_required: true,
      user_required: false
    }]);
    expect(registry.handlers).to.be.eql({
      abc: {
        POST: func
      }
    });
  });

  it('provides', function () {
    function func() {}
    class ABCAuthProvider {}
    provides('auth', 'com.abc', ABCAuthProvider);

    expect(registry.paramMap.provider).to.be.eql([{
      type: 'auth',
      id: 'com.abc'
    }]);
    expect(registry.providers['com.abc']).to.be.instanceof(ABCAuthProvider);
  });

  it('hook', function () {
    function func() {}
    const options = {
      type: 'Food',
      trigger: 'hungry',
      async: false
    };
    hook('abc', func, options);

    expect(registry.paramMap.hook).to.be.eql([{
      name: 'abc',
      type: 'Food',
      trigger: 'hungry',
      async: false
    }]);
    expect(registry.funcMap.hook).to.be.eql({
      abc: func
    });
    expect(registry._hookTypeMap).to.be.eql({
      abc: 'Food'
    });
  });

});

/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
