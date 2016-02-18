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
import {expect} from 'chai';
import sinon from 'sinon';
import Cache from '../lib/cache';

describe('Cache', function () {

  let cache;
  let store;

  beforeEach(function () {
    cache = new Cache('prefix');
    store = {};
    store.getItem = sinon.spy();
    store.setItem = sinon.spy();
    cache.store = store;
  });

  it('save value with prefix', function () {
    cache.set('hash', 'value');
    expect(store.setItem).to.be.calledWithMatch('prefix:hash', 'value');
  });

  it('get value with prefix', function () {
    cache.get('hash');
    expect(store.getItem).to.be.calledWithMatch('prefix:hash');
  });

  it('cache keys is unique', function () {
    cache.set('hash', 'dump');
    cache.set('hash', 'realvalue');
    expect(store.setItem).to.be.calledWithMatch('prefix:hash', 'dump');
    expect(store.setItem).to.be.calledWithMatch('prefix:hash', 'realvalue');
    expect(cache.keys).to.be.eql(['prefix:hash']);
  });

  it('reset clears data', function () {
    cache.reset();
    expect(store.setItem).to.be.calledWithMatch('prefix:keys', '[]');
    expect(cache.keys).to.be.eql([]);
  });


});
