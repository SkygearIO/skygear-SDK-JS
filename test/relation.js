/*eslint-disable camelcase, no-unused-vars, dot-notation, no-new */
import {expect, assert} from 'chai';
import Container from '../lib/container';
import User from '../lib/user';
import {
  Outward,
  Inward,
  Mutual,
  Relation,
  RelationResult,
  RelationQuery,
  RelationAction
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
      new User({user_id: 'id1'}),
      new User({user_id: 'id2'})
    ];
    let r = new Relation('follow', Outward, users);
    expect(r.targetsID).to.eql(['id1', 'id2']);
  });
});

describe('RelationQuery', function () {
  let Following = RelationAction.extend('follow', Outward);

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
    let relationResult = new RelationResult([
      'id1',
      'id2'
    ]);
    expect(relationResult.partialError).to.eql(false);
    expect(relationResult.fails).to.eql([]);
  });

  it('set partialError is true on partial success result', function () {
    let relationResult = new RelationResult([
      'id1',
      {
        id: 'id2',
        type: 'error',
        data: {}
      }
    ]);
    expect(relationResult.success).eql(['id1']);
    expect(relationResult.partialError).to.eql(true);
    expect(relationResult.fails).to.eql([{
      id: 'id2',
      type: 'error',
      data: {}
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
          user_id: 'follower1'
        }, {
          user_id: 'follower2'
        }],
        info: {
          count: 24
        }
      });
    }
    if (params['name'] === 'follow' && params['direction'] === 'outward') {
      return fn({
        result: [{
          user_id: 'following1'
        }]
      });
    }
  }
}, {
  pattern: 'http://skygear.dev/relation/add',
  fixtures: function (match, params, headers, fn) {
    if (params['name'] === 'follow') {
      return fn({
        result: [{
          id: 'ben'
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
          id: 'following1'
        }]
      });
    }
  }
}]);

describe('RelationAction', function () {

  let container = new Container();
  container.autoPubsub = false;
  container.request = request;
  container.configApiKey('correctApiKey');
  let relationAction = new RelationAction(container);

  it('query following with helper method', function () {
    return relationAction.queryFollowing().then(function (users) {
      expect(users.length).to.be.equal(1);
      expect(users[0]).to.be.instanceof(User);
      expect(users[0].id).to.be.equal('following1');
    }, function (error) {
      throw Error();
    });
  });

  it('query follower with helper method', function () {
    return relationAction.queryFollower().then(function (users) {
      expect(users.length).to.be.equal(2);
      expect(users[0]).to.be.instanceof(User);
      expect(users[0].id).to.be.equal('follower1');
    }, function (error) {
      throw Error();
    });
  });

  it('follow a user', function () {
    let relation = new relationAction.Following([new User({
      user_id: 'ben'
    })]);
    return relationAction.add(relation).then(function (result) {
      expect(result.success.length).to.be.equal(1);
      expect(result.success[0].id).to.be.equal('ben');
      expect(result.fails.length).to.be.equal(0);
    }, function (error) {
      throw Error();
    });
  });

  it('unfollow a user', function () {
    let relation = new relationAction.Following([new User({
      user_id: 'ben'
    })]);
    return relationAction.add(relation).then(function (result) {
      expect(result.success.length).to.be.equal(1);
      expect(result.success[0].id).to.be.equal('ben');
      expect(result.fails.length).to.be.equal(0);
    }, function (error) {
      throw Error();
    });
  });

});
/*eslint-enable camelcase, no-unused-vars, dot-notation, no-new */
