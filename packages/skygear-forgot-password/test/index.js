/**
 * Copyright 2018 Oursky Ltd.
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
/*eslint-disable dot-notation, no-unused-vars, quote-props */
import {assert, expect} from 'chai';
import Container from '../../skygear-core/lib/container';
import { injectToContainer } from '../lib/index';

import mockSuperagent from '../../skygear-core/test/mock/superagent';

describe('AuthContainer with Forgot Password', function () {
  let container = new Container();
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([
    {
      pattern: 'http://skygear.dev/_auth/me',
      fixtures: function (match, params, headers, fn) {
        const token = params['access_token'];
        if (token) {
          if (token === 'token-1') {
            return fn({
              result: {
                user_id: 'user-id-1', // eslint-disable-line camelcase
                login_ids: { // eslint-disable-line camelcase
                  username: 'user1',
                  email: 'user1@skygear.dev'
                },
                metadata: {}
              }
            });
          }
        } else {
          return fn({
            error: {
              name: 'NotAuthenticated',
              code: 101,
              message: 'Authentication is needed to get current user'
            }
          });
        }
      }
    },
    {
      pattern: 'http://skygear.dev/_auth/verify_request',
      fixtures: function (match, params, headers, fn) {
        const token = params['access_token'];
        if (token !== 'token-1') {
          return fn({
            error: {
              name: 'NotAuthenticated',
              code: 101,
              message: 'Authentication is needed to get current user'
            }
          });
        }
        const expectedArgs = {
          record_key: 'email' // eslint-disable-line camelcase
        };
        if (params['args'] === expectedArgs) {
          return fn({
            result: {}
          });
        } else {
          return fn({
            error: {
              name: 'InvalidArgument',
              code: 108,
              message: 'invalid argument'
            }
          });
        }
      }
    },
    {
      pattern: 'http://skygear.dev/_auth/verify_code',
      fixtures: function (match, params, headers, fn) {
        const token = params['access_token'];
        if (token !== 'token-1') {
          return fn({
            error: {
              name: 'NotAuthenticated',
              code: 101,
              message: 'Authentication is needed to get current user'
            }
          });
        }
        const expectedArgs = {
          code: '123456'
        };
        if (params['args'] === expectedArgs) {
          return fn({
            result: {}
          });
        } else {
          return fn({
            error: {
              name: 'InvalidArgument',
              code: 108,
              message: 'invalid argument'
            }
          });
        }
      }
    }
  ]);
  injectToContainer(container);

  it('should sent verification request', async function () {
    container.auth._accessToken = 'token-1';
    await container.auth.requestVerification('email');
  });

  it('should return user when verify code', async function () {
    container.auth._accessToken = 'token-1';
    const user = await container.auth.verifyUserWithCode('123456');
    assert.instanceOf(user, container.User);
    assert.equal(user.userID, 'user-id-1');
    assert.equal(user.loginIDs.username, 'user1');
    assert.equal(user.loginIDs.email, 'user1@skygear.dev');
  });
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
