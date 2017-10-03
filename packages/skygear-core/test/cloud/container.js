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
import CloudCodeContainer from '../../lib/cloud/container';
import {getContainer} from '../../lib/cloud/container';
import {settings} from '../../lib/cloud/settings';
import mockSuperagent from '../mock/superagent';

describe('Cloud container', function () {
  it('should store user for each container', function () {
    let container1 = new CloudCodeContainer();
    let container2 = new CloudCodeContainer();
    for (let container of [container1, container2]) {
      container.request = mockSuperagent([{
        pattern: 'http://skygear.dev/auth/login',
        fixtures: function (match, params, headers, fn) {
          if (params['auth_data'] &&
            params['auth_data']['username'] === 'user1' &&
            params['password'] === 'passwd'
          ) {
            return fn({
              'result': {
                'user_id': 'user:id1',
                'access_token': 'uuid1',
                'profile': {
                  '_type': 'record', // eslint-disable-line camelcase
                  '_id': 'user/user:id1', // eslint-disable-line camelcase
                  '_access': null, // eslint-disable-line camelcase
                  'username': 'user1',
                  'email': 'user1@skygear.io'
                }
              }
            });
          }
          if (params['auth_data'] === null && params['password'] === null) {
            return fn({
              'result': {
                'user_id': 'user:id2',
                'access_token': 'uuid2',
                'profile': {
                  '_type': 'record', // eslint-disable-line camelcase
                  '_id': 'user/user:id2', // eslint-disable-line camelcase
                  '_access': null, // eslint-disable-line camelcase
                  'username': 'user2',
                  'email': 'user2@skygear.io'
                }
              }
            });
          }
        }
      }]);
      container.configApiKey('correctApiKey');
      container.pubsub.autoPubsub = false;
    }
    return Promise.all([
      container1.auth.signupWithUsername('username', 'passwd'),
      container2.auth.signupAnonymously()
    ])
    .then(([user1, user2]) => {
      assert.equal(container1.auth.accessToken, 'uuid1');
      assert.instanceOf(container1.auth.currentUser, container1.UserRecord);
      assert.equal(container1.auth.currentUser.id, 'user/user:id1');
      assert.equal(container2.auth.accessToken, 'uuid2');
      assert.instanceOf(container2.auth.currentUser, container2.UserRecord);
      assert.equal(container2.auth.currentUser.id, 'user/user:id2');
    });
  });
});

describe('getContainer', function () {
  it('should return container', function () {
    let container = getContainer('user-id');
    assert.equal(container.endPoint, settings.skygearEndpoint + '/');
    assert.equal(container.apiKey, settings.masterKey);
    assert.equal(container.asUserId, 'user-id');
  });

  it('should return container for user', function () {
    let container = getContainer();
    assert.equal(container.endPoint, settings.skygearEndpoint + '/');
    assert.equal(container.apiKey, settings.masterKey);
    assert.isUndefined(container.asUserId);
  });
});
