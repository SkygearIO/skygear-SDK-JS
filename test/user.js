import {expect, assert} from 'chai';
import uuid from 'uuid';
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
    expect(function() {
      new User({
        username: 'rick'
      });
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
    })
  });

  it('deserialize from json', function() {
    const payload = {
      user_id: 'non-uuid',
      username: 'rick',
      email: 'rick.mak@gmail.com'
    };
    const user = User.fromJSON(payload);
    expect(user).to.be.an.instanceof(User);
  });


});
