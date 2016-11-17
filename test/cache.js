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
    cache.store = store;
  });

  it('save value with prefix', function () {
    store.setPurgeableItem = sinon.stub();
    store.setPurgeableItem.returns(Promise.resolve());

    return cache.set('hash', {some: 'json'}).then(function () {
      expect(store.setPurgeableItem)
        .to.be.calledWithMatch('prefix:hash', '{"some":"json"}');
    });
  });

  it('get value with prefix', function () {
    store.getItem = sinon.stub();
    store.getItem.returns(Promise.resolve('{"some":"json"}'));

    return cache.get('hash').then(function (myValue) {
      expect(store.getItem).to.be.calledWithMatch('prefix:hash');
      expect(myValue).to.be.eql({
        some: 'json'
      });
    });
  });

  it('rejects when cache is not found', function () {
    store.getItem = sinon.stub();
    store.getItem.returns(Promise.resolve(null));

    return cache.get('hash').then(function () {
      expect(1).to.be.eql(2);
    }, function () {
      expect(1).to.be.eql(1);
    });
  });

});
