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
import store from '../lib/store';

describe('Store', function () {
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

  it('should retry when write fails', function () {
    store._purgeableKeys = ['a', 'b', 'c'];
    store._driver = {};
    store._driver.setItem = sinon.stub();
    store._driver.multiRemove = sinon.stub();

    store._driver.setItem.onCall(0).returns(Promise.reject(new Error()));
    store._driver.multiRemove.returns(Promise.resolve());
    store._driver.setItem.onCall(1).returns(Promise.resolve());
    store._driver.setItem.onCall(2).returns(Promise.resolve());

    return store._setItemWithRetry('d', 'd').then(function () {
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

  it('stops retrying when retry count exceeds', function () {
    store._purgeableKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    store._maxRetryCount = 3;
    store._driver = {};
    store._driver.setItem = sinon.stub();
    store._driver.multiRemove = sinon.stub();

    store._driver.multiRemove.returns(Promise.resolve());
    store._driver.setItem.onCall(0).returns(Promise.reject(new Error()));

    store._driver.setItem.onCall(1).returns(Promise.resolve());
    store._driver.setItem.onCall(2).returns(Promise.reject(new Error()));

    store._driver.setItem.onCall(3).returns(Promise.resolve());
    store._driver.setItem.onCall(4).returns(Promise.reject(new Error()));

    store._driver.setItem.onCall(5).returns(Promise.resolve());
    store._driver.setItem.onCall(6).returns(Promise.reject(new Error()));

    return store._setItemWithRetry('11', '11').then(function () {
      // unreachable
      expect(1).to.be.eql(2);
    }, function (e) {
      // the first attempt is not considered as retry
      expect(store._driver.setItem).to.be.callCount(1 + 2 * 3);

      expect(
        store._driver.setItem.getCall(0).calledWithExactly('11', '11')
      ).to.be.true();
      expect(
        store._driver.multiRemove.getCall(0).calledWithExactly([
          '6', '7', '8', '9', '10'
        ])
      ).to.be.true();
      expect(
        store._driver.setItem.getCall(1).calledWithExactly(
          '_skygear_purgeable_keys_',
          '["1","2","3","4","5"]'
        )
      ).to.be.true();

      expect(
        store._driver.setItem.getCall(2).calledWithExactly('11', '11')
      ).to.be.true();
      expect(
        store._driver.multiRemove.getCall(1).calledWithExactly([
          '3', '4', '5'
        ])
      ).to.be.true();
      expect(
        store._driver.setItem.getCall(3).calledWithExactly(
          '_skygear_purgeable_keys_',
          '["1","2"]'
        )
      ).to.be.true();

      expect(
        store._driver.setItem.getCall(4).calledWithExactly('11', '11')
      ).to.be.true();
      expect(
        store._driver.multiRemove.getCall(2).calledWithExactly([
          '2'
        ])
      ).to.be.true();
      expect(
        store._driver.setItem.getCall(5).calledWithExactly(
          '_skygear_purgeable_keys_',
          '["1"]'
        )
      ).to.be.true();

      expect(
        store._driver.setItem.getCall(6).calledWithExactly('11', '11')
      ).to.be.true();

      expect(e.message).to.be.eql('exceeded max retry count');
    });
  });

  it('retries when error happens when setting purgeable item', function () {
    store._maxRetryCount = 1;
    store._purgeableKeys = ['1', '2', '3', '4'];
    const multiSetTransactionally =
      sinon.stub(store, 'multiSetTransactionally');
    multiSetTransactionally.onCall(0).returns(Promise.reject(new Error()));
    multiSetTransactionally.onCall(1).returns(Promise.resolve());
    const _performRecovery = sinon.stub(store, '_performRecovery');
    _performRecovery.returns(Promise.resolve());

    return store.setPurgeableItem('2', 'value:2').then(function () {
      expect(
        multiSetTransactionally.getCall(0).calledWithExactly([
          {
            key: '2',
            value: 'value:2'
          },
          {
            key: '_skygear_purgeable_keys_',
            value: '["2","1","3","4"]'
          }
        ])
      ).to.be.true();
      expect(_performRecovery).to.be.callCount(1);
      expect(
        multiSetTransactionally.getCall(1).calledWithExactly([
          {
            key: '2',
            value: 'value:2'
          },
          {
            key: '_skygear_purgeable_keys_',
            value: '["2","1","3","4"]'
          }
        ])
      ).to.be.true();

      multiSetTransactionally.restore();
      _performRecovery.restore();
    });

  });
});
