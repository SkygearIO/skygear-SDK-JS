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
/*eslint-disable camelcase, no-unused-vars, dot-notation, no-new */
import {expect, assert} from 'chai';
import Container, {UserRecord} from '../lib/container';
import Record from '../lib/record';
import {
  Outward,
  Inward,
  Mutual,
  Relation,
  RelationResult,
  RelationQuery,
  RelationContainer
} from '../lib/relation';


describe('Relation', function () {
  it('reject invalid direction', function () {
    expect(function () {
      new Relation('', Outward);
    }).to.throw(
      'Relation identifier can only be [a-zA-Z]+'
    );
  });

  it('reject invalid direction', function () {
    expect(function () {
      new Relation('friendOfFriend');
    }).to.throw(
      'Relation direction not supported.'
    );
  });

  it('create with array of users', function () {
    let users = [
      new UserRecord({
        _recordType: 'user',
        _recordID: 'id1'
      }),
      new UserRecord({
        _recordType: 'user',
        _recordID: 'id2'
      })
    ];
    let r = new Relation('follow', Outward, users);
    expect(r.targetsID).to.eql(['id1', 'id2']);
  });
});

describe('RelationQuery', function () {
  let Following = Relation.extend('follow', Outward);

  it('create with default', function () {
    let relationQuery = new RelationQuery(Following);
    expect(relationQuery.identifier).to.eql('follow');
    expect(relationQuery.direction).to.eql('outward');
    expect(relationQuery.limit).to.eql(50);
    expect(relationQuery.page).to.eql(0);
  });

  it('serialize correctly', function () {
    let relationQuery = new RelationQuery(Following);
    relationQuery.limit = 10;
    relationQuery.page = 2;
    expect(relationQuery.toJSON()).to.eql({
      name: 'follow',
      direction: 'outward',
      limit: 10,
      page: 2
    });
  });
});

describe('RelationResult', function () {
  it('set partialError is false on all success result', function () {
    let relationResult = new RelationResult([{
      id: 'id1',
      type: 'user',
      data: {
        _type: 'record',
        _recordType: 'user',
        _recordID: 'id1',
        _access: null,
        username: 'user1'
      }
    }, {
      id: 'id2',
      type: 'user',
      data: {
        _type: 'record',
        _recordType: 'user',
        _recordID: 'id2',
        _access: null,
        username: 'user2'
      }
    }]);
    expect(relationResult.partialError).to.eql(false);
    expect(relationResult.fails).to.eql([]);
  });

  it('set partialError is true on partial success result', function () {
    let relationResult = new RelationResult([{
      id: 'id1',
      type: 'user',
      data: {
        _type: 'record',
        _recordType: 'user',
        _recordID: 'id1',
        _access: null,
        username: 'user1'
      }
    }, {
      id: 'id2',
      type: 'error',
      data: {
        _id: 'id2'
      }
    }]);
    let user1 = relationResult.success[0];
    expect(user1).to.be.instanceof(UserRecord);
    expect(user1.recordType).eql('user');
    expect(user1.recordID).eql('id1');
    expect(relationResult.partialError).to.eql(true);
    expect(relationResult.fails).to.eql([{
      id: 'id2',
      type: 'error',
      data: {
        _id: 'id2'
      }
    }]);
  });
});

import mockSuperagent from './mock/superagent';

let request = mockSuperagent([{
  pattern: 'http://skygear.dev/relation/query',
  fixtures: function (match, params, headers, fn) {
    if (params['name'] === 'follow' && params['direction'] === 'inward') {
      return fn({
        result: [{
          id: 'follower1',
          type: 'user',
          data: {
            _type: 'record',
            _recordType: 'user',
            _recordID: 'follower1',
            _access: null,
            username: 'follower1',
            email: 'follower1@skygear.io'
          }
        }, {
          id: 'follower2',
          type: 'user',
          data: {
            _type: 'record',
            _recordType: 'user',
            _recordID: 'follower2',
            _access: null,
            username: 'follower2',
            email: 'follower2@skygear.io'
          }
        }],
        info: {
          count: 24
        }
      });
    }
    if (params['name'] === 'follow' && params['direction'] === 'outward') {
      return fn({
        result: [{
          id: 'following1',
          type: 'user',
          data: {
            _type: 'record',
            _recordType: 'user',
            _recordID: 'following1',
            _access: null,
            username: 'following1',
            email: 'following1@skygear.io'
          }
        }],
        info: {
          count: 1
        }
      });
    }
  }
}, {
  pattern: 'http://skygear.dev/relation/add',
  fixtures: function (match, params, headers, fn) {
    if (params['name'] === 'follow') {
      return fn({
        result: [{
          id: 'ben',
          type: 'user',
          data: {
            _type: 'record',
            _recordType: 'user',
            _recordID: 'ben',
            _access: null,
            username: 'ben-skygear',
            email: 'ben@skygear.io'
          }
        }]
      });
    }
  }
}, {
  pattern: 'http://skygear.dev/relation/remove',
  fixtures: function (match, params, headers, fn) {
    if (params['name'] === 'follow') {
      return fn({
        result: [{
          id: 'ben'
        }]
      });
    }
  }
}]);

describe('RelationContainer', function () {

  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.request = request;
  container.configApiKey('correctApiKey');
  let relationAction = new RelationContainer(container);

  it('query following with helper method', async function () {
    const users = await relationAction.queryFollowing();
    expect(users.length).to.be.equal(1);
    expect(users[0]).to.be.instanceof(UserRecord);
    expect(users[0].recordType).to.be.equal('user');
    expect(users[0].recordID).to.be.equal('following1');
    expect(users.overallCount).to.be.equal(1);
  });

  it('query follower with helper method', async function () {
    const users = await relationAction.queryFollower();
    expect(users.length).to.be.equal(2);
    expect(users[0]).to.be.instanceof(UserRecord);
    expect(users[0].recordType).to.be.equal('user');
    expect(users[0].recordID).to.be.equal('follower1');
    expect(users.overallCount).to.be.equal(24);
  });

  it('follow a user', async function () {
    let relation = new relationAction.Following([new UserRecord({
      _recordType: 'user',
      _recordID: 'ben'
    })]);
    const result = await relationAction.add(relation);
    expect(result.success.length).to.be.equal(1);
    expect(result.success[0]).to.be.instanceof(UserRecord);
    expect(result.success[0].recordType).to.be.equal('user');
    expect(result.success[0].recordID).to.be.equal('ben');
    expect(result.fails.length).to.be.equal(0);
  });

  it('unfollow a user', async function () {
    let relation = new relationAction.Following([new UserRecord({
      _recordType: 'user',
      _recordID: 'ben'
    })]);
    const result = await relationAction.remove(relation);
    console.log(result);
    expect(result.success.length).to.be.equal(1);
    expect(result.success[0]).to.be.equal('ben');
    expect(result.fails.length).to.be.equal(0);
  });

});
/*eslint-enable camelcase, no-unused-vars, dot-notation, no-new */
