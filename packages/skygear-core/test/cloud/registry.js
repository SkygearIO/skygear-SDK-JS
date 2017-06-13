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
import {Registry} from '../../lib/cloud/registry';

describe('Registry', function () {
  it('init with empty funcList', function () {
    const registry = new Registry();
    expect(registry.funcList()).to.be.eql({
      op: [],
      event: [],
      handler: [],
      hook: [],
      timer: [],
      provider: []
    });
  });

  it('add lambda to funcList', function () {
    const registry = new Registry();
    function op() {}
    registry.registerOp('lambda', op, {
      userRequired: true,
      authRequired: false
    });
    expect(registry.funcList().op).to.be.eql([{
      name: 'lambda',
      auth_required: false,
      user_required: true
    }]);

    expect(registry.getFunc('op', 'lambda')).to.be.eql(op);
  });

  it('add db hook to funcList', function () {
    const registry = new Registry();
    function beforeNote() {}
    registry.registerHook('beforeNote', beforeNote, {
      type: 'Note',
      trigger: 'beforeSave'
    });
    expect(registry.funcList().hook).to.be.eql([{
      name: 'beforeNote',
      type: 'Note',
      trigger: 'beforeSave'
    }]);

    expect(registry.getFunc('hook', 'beforeNote')).to.be.eql(beforeNote);
  });

  it('add timer to funcList', function () {
    const registry = new Registry();
    function perHour() {}
    registry.registerTimer('perHour', perHour, {
      spec: '@every 3600s'
    });
    expect(registry.funcList().timer).to.be.eql([{
      name: 'perHour',
      spec: '@every 3600s'
    }]);

    expect(registry.getFunc('timer', 'perHour')).to.be.eql(perHour);
  });

  it('add duplicated lambda to funcList, will cause override', function () {
    const registry = new Registry();
    function op() {}
    function op2() {}
    registry.registerOp('lambda', op, {
      userRequired: true,
      authRequired: false
    });
    registry.registerOp('lambda', op2, {
      userRequired: true,
      authRequired: false
    });
    expect(registry.funcList().op).to.be.eql([{
      name: 'lambda',
      auth_required: false,
      user_required: true
    }]);

    expect(registry.getFunc('op', 'lambda')).to.be.eql(op2);
  });

  it('add handler to funcList', function () {
    const registry = new Registry();
    function pubHandler() {}
    registry.registerHandler('pubHandler', pubHandler, {
      method: ['GET'],
      authRequired: false,
      userRequired: true
    });
    expect(registry.funcList().handler).to.be.eql([{
      name: 'pubHandler',
      methods: ['GET'],
      auth_required: false,
      user_required: true
    }]);

    expect(registry.getHandler('pubHandler', 'GET')).to.be.eql(pubHandler);
  });

  it('add handler with parameters to funcList', function() {
    const registry = new Registry();
    function handlerWithParams() {}
    registry.registerHandler('download/:platform/:version', handlerWithParams, {
      method: ['GET'],
      authRequired: false,
      userRequired: true
    });
    expect(registry.funcList().handler).to.be.eql([{
      name: 'download/:platform/:version',
      methods: ['GET'],
      auth_required: false,
      user_required: true
    }]);
    expect(registry.getHandler('download/osx/1.0.0', 'GET')).to.be.eql(handlerWithParams);
  });

  it('add handler with parameters to funcList, calacala parameters', function() {
    const registry = new Registry();
    function handlerWithParams() {}
    registry.registerHandler('hello/:param1/world/:param2', handlerWithParams, {
      method: ['GET'],
      authRequired: false,
      userRequired: true
    });
    expect(registry.funcList().handler).to.be.eql([{
      name: 'hello/:param1/world/:param2',
      methods: ['GET'],
      auth_required: false,
      user_required: true
    }]);
    expect(registry.getHandler('hello/foo/world/bar', 'GET')).to.be.eql(handlerWithParams);
  });

  it('match handler with normal path', function() {
    expect(Registry._matchHandler('foo/bar', 'foo/bar')).to.eql(true);
  });

  it('match handler with parameterized path', function() {
    expect(Registry._matchHandler('download/:platform/:version', 'download/osx/1.0.0')).to.eql(true);
  });

  it('match handler with parameterized path - false', function() {
    expect(Registry._matchHandler('download/:platform/:version', 'sthelse/osx/1.0.0')).to.eql(false);
  });

  it('match handler with calacala parameterized path', function() {
    expect(Registry._matchHandler('hello/:foo/world/:bar', 'hello/1/world/2')).to.eql(true);
  });

  it('add static asset collect func', function () {
    const registry = new Registry();
    function staticAsset() {}
    registry.registerAsset('/static/css', staticAsset);
    expect(registry.staticAsset).to.be.eql({
      '/static/css': staticAsset
    });
  });

  it('add various func type to funcList', function () {
    const registry = new Registry();
    function perHour() {}
    registry.registerTimer('perHour', perHour, {
      spec: '@every 3600s'
    });
    function op() {}
    registry.registerOp('lambda', op, {
      userRequired: true,
      authRequired: false
    });
    function beforeNote() {}
    registry.registerHook('beforeNote', beforeNote, {
      type: 'Note',
      trigger: 'beforeSave'
    });
    expect(registry.funcList().hook).to.be.eql([{
      name: 'beforeNote',
      type: 'Note',
      trigger: 'beforeSave'
    }]);

    expect(registry.getFunc('hook', 'beforeNote')).to.be.eql(beforeNote);
    expect(registry.getFunc('op', 'lambda')).to.be.eql(op);
    expect(registry.getFunc('timer', 'perHour')).to.be.eql(perHour);
  });
});

/*eslint-enable camelcase, dot-notation, no-unused-vars, quote-props */
