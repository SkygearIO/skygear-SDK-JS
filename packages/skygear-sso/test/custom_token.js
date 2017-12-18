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
import { expect } from 'chai';
import { injectToContainer } from '../lib/index';
import Container from '../../skygear-core/lib/container';
import mockSuperagent from '../../skygear-core/test/mock/superagent';


describe('SSO Custom Token', function () {
  // setup container
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/sso/custom_token/login',
    fixtures: function (match, params, headers, fn) {
      expect(params.token).to.equal('eyXXXX');
      return fn({
        result: {
          user_id: 'user-id-1', // eslint-disable-line camelcase
          profile: {
            _type: 'record', // eslint-disable-line camelcase
            _id: 'user/user-id-1', // eslint-disable-line camelcase
            _access: null, // eslint-disable-line camelcase
            username: 'user1',
            email: 'user1@skygear.dev'
          }
        }
      });
    }
  }]);
  container.configApiKey('correctApiKey');
  injectToContainer(container);

  it('can login with custom token', function (done) {
    container.auth.loginWithCustomToken('eyXXXX')
      .then(function (user) {
        expect(user).not.be.null();
        expect(user.email).to.eql('user1@skygear.dev');
        done();
      });
  });
});
