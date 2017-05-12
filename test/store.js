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
import getStore from '../packages/skygear-core/lib/store';

describe('Store', function () {
  const store = getStore();

  it('maintains purgeable keys in LRU order', function () {
    expect(store._maintainLRUOrder([], [])).to.be.eql(
      []
    );

    expect(store._maintainLRUOrder([], ['d'])).to.be.eql(
      ['d']
    );

    expect(store._maintainLRUOrder(['a'], [])).to.be.eql(
      ['a']
    );

    expect(store._maintainLRUOrder(['a', 'b', 'c'], ['b'])).to.be.eql(
      ['b', 'a', 'c']
    );

    expect(store._maintainLRUOrder(['a', 'b', 'c'], ['d'])).to.be.eql(
      ['d', 'a', 'b', 'c']
    );

    expect(store._maintainLRUOrder(['a', 'b', 'c', 'd'], ['d', 'b'])).to.be.eql(
      ['d', 'b', 'a', 'c']
    );

  });

  it('removes purgeable keys in LRU order', function () {
    expect(store._removeKeysInLRUOrder([], [])).to.be.eql(
      []
    );

    expect(store._removeKeysInLRUOrder([], ['d'])).to.be.eql(
      []
    );

    expect(store._removeKeysInLRUOrder(['a'], [])).to.be.eql(
      ['a']
    );

    expect(store._removeKeysInLRUOrder(['a', 'b', 'c'], ['b'])).to.be.eql(
      ['a', 'c']
    );

    expect(store._removeKeysInLRUOrder(['a', 'b', 'c'], ['d'])).to.be.eql(
      ['a', 'b', 'c']
    );

    expect(store._removeKeysInLRUOrder(
      ['a', 'b', 'c', 'd'],
      ['d', 'b'])
    ).to.be.eql(
      ['a', 'c']
    );
  });

  it('emulates transaction', function () {

    store._driver = {};
    store._driver.multiSet = sinon.stub();
    store._driver.multiRemove = sinon.stub();
    store._driver.multiGet = sinon.stub();

    const keys = ['cache:3', 'all_keys'];
    const newKeyValuePairs = [
      {key: 'cache:3', value: 'value:new'},
      {key: 'all_keys', value: 'cache:1 cache:2 cache:3'}
    ];
    const oldKeyValuePairs = [
      {key: 'cache:3', value: null},
      {key: 'all_keys', value: 'cache:1 cache:2'}
    ];

    store._driver.multiGet.withArgs(keys)
      .returns(Promise.resolve(oldKeyValuePairs));
    store._driver.multiSet.onCall(0)
      .returns(Promise.reject(new Error('limit exceeded')));
    store._driver.multiRemove.withArgs(keys)
      .returns(Promise.resolve());
    store._driver.multiSet.onCall(1)
      .returns(Promise.resolve());

    return store.multiSetTransactionally(newKeyValuePairs).then(function () {
      // this should be unreachable
      expect(1).to.be.eql(2);
    }, function () {
      expect(store._driver.multiGet.withArgs(keys)).to.be.callCount(1);
      expect(
        store._driver.multiSet.getCall(0).calledWithExactly(newKeyValuePairs))
      .to.be.true();
      expect(store._driver.multiRemove.withArgs(keys)).to.be.callCount(1);
      expect(
        store._driver.multiSet.getCall(1).calledWithExactly(oldKeyValuePairs))
      .to.be.true();
    });

  });

  it('store metadata when storing purgeable key-value pair', function () {
    store._purgeableKeys = ['a', 'b', 'c'];
    store._driver = {};
    store._driver.multiGet = sinon.stub();
    store._driver.multiSet = sinon.stub();

    const keys = ['d', '_skygear_purgeable_keys_'];
    const keyValuePairs = [
      {
        key: 'd',
        value: 'd'
      },
      {
        key: '_skygear_purgeable_keys_',
        value: '["d","a","b","c"]'
      }
    ];

    store._driver.multiGet.withArgs(keys).returns(Promise.resolve([
      {
        key: 'd',
        value: null
      },
      {
        key: '_skygear_purgeable_keys_',
        value: '["a","b","c"]'
      }
    ]));
    store._driver.multiSet.withArgs(keyValuePairs).returns(Promise.resolve());

    return store.setPurgeableItem('d', 'd').then(function () {
      expect(store._driver.multiGet.withArgs(keys)).to.be.callCount(1);
      expect(store._driver.multiSet.withArgs(keyValuePairs)).to.be.callCount(1);
      expect(store._purgeableKeys).to.be.eql(['d', 'a', 'b', 'c']);
    });
  });

  it('selects least recently used keys to purge', function () {
    expect(store._selectKeysToPurge([])).to.be.eql([]);
    expect(store._selectKeysToPurge(['a'])).to.be.eql(['a']);
    expect(store._selectKeysToPurge(['a', 'b'])).to.be.eql(['b']);
    expect(store._selectKeysToPurge(['a', 'b', 'c'])).to.be.eql(['b', 'c']);
  });

  it('purges purgeable items when write fails', function () {
    store._purgeableKeys = ['a', 'b', 'c'];
    store._driver = {};
    store._driver.setItem = sinon.stub();
    store._driver.multiRemove = sinon.stub();

    store._driver.setItem.onCall(0).returns(Promise.reject(new Error()));
    store._driver.multiRemove.returns(Promise.resolve());
    store._driver.setItem.onCall(1).returns(Promise.resolve());

    return store.setItem('d', 'd').then(function () {
      expect(1).to.be.eql(2);
    }, function () {
      expect(store._driver.setItem).to.be.callCount(2);
      expect(store._driver.multiRemove).to.be.callCount(1);

      expect(
        store._driver.setItem.getCall(0).calledWithExactly('d', 'd')
      ).to.be.true();

      expect(store._driver.multiRemove.withArgs(['b', 'c'])).to.be.callCount(1);

      expect(
        store._driver.setItem.getCall(1).calledWithExactly(
          '_skygear_purgeable_keys_',
          '["a"]'
        )
      );

      expect(store._purgeableKeys).to.be.eql(['a']);
    });
  });

});
