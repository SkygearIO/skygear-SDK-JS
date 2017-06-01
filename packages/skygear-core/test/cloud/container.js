/**
 * Copyright 2017 Oursky Ltd.
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
import CloudCodeContainer
  from '../../lib/cloud/container';
import mockSuperagent from '../mock/superagent';

describe('Cloud container', function () {
  it('should store user for each container', function () {
    let container1 = new CloudCodeContainer();
    let container2 = new CloudCodeContainer();
    for (let container of [container1, container2]) {
      container.request = mockSuperagent([{
        pattern: 'http://skygear.dev/auth/login',
        fixtures: function (match, params, headers, fn) {
          if (params['username'] === 'user1' &&
            params['password'] === 'passwd'
          ) {
            return fn({
              'result': {
                'user_id': 'user:id1',
                'access_token': 'uuid1',
                'username': 'user1',
                'email': 'user1@skygear.io'
              }
            });
          }
          if (params['username'] === null && params['password'] === null) {
            return fn({
              'result': {
                'user_id': 'user:id2',
                'access_token': 'uuid2',
                'username': 'user2',
                'email': 'user2@skygear.io'
              }
            });
          }
        }
      }]);
      container.configApiKey('correctApiKey');
      container.autoPubsub = false;
    }
    return Promise.all([
      container1.signupWithUsername('username', 'passwd'),
      container2.signupAnonymously()
    ])
    .then(([user1, user2]) => {
      assert.equal(container1.accessToken, 'uuid1');
      assert.instanceOf(container1.currentUser, container1.User);
      assert.equal(container1.currentUser.id, 'user:id1');
      assert.equal(container2.accessToken, 'uuid2');
      assert.instanceOf(container2.currentUser, container2.User);
      assert.equal(container2.currentUser.id, 'user:id2');
    });
  });
});
