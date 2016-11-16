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
});
