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
/*eslint-disable no-new, camelcase */
import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import User from '../lib/user';

describe('User', function () {

  it('create with userid, email and username', function () {
    const user = new User({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com'
    });
    expect(user).to.be.an.instanceof(User);
  });

  it('fails to create without user_id', function () {
    expect(function () {
      new User({
        username: 'rick'
      }); //eslint-disable-line no-unused-vars
    }).to.throw(
      'Missing user_id.'
    );
  });

  it('serialize for persist', function () {
    const user = new User({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com'
    });
    expect(user.toJSON()).eql({
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com'
    });
  });

  it('deserialize from json', function () {
    const payload = {
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com'
    };
    const user = User.fromJSON(payload);
    expect(user).to.be.an.instanceof(User);
  });

});
/*eslint-enable no-new, camelcase */
