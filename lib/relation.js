const _ = require('lodash');

import User from './user';

export const Outward = 'outward';
export const Inward = 'inward';
export const Mutual = 'mutual';

const format = /^[a-zA-Z]*$/;

class Relation {

  constructor(identifier, direction, targets = []) {
    this.identifier = identifier;
    if (Relation.validDirection(direction)) {
      this.direction = direction;
    } else {
      throw new Error(
        'Relation direction not support.');
    }
    this.targets = targets;
    this.fails = [];
  }

  get targetsID() {
    return _.map(this.targets, function (user) {
      return user.id;
    });
  }

  static validDirection(direction) {
    return direction === Mutual
      || direction === Outward
      || direction === Inward;
  }

  static validName(identifier) {
    return format.test(identifier);
  }
}

class RelationQuery {

  constructor(relationCls) {
    this.identifier = relationCls.prototype.identifier;
    this.direction = relationCls.prototype.direction;
    this.limit = 50;
    this.page = 0;
  }

  toJSON() {
    return {
      name: this.identifier,
      direction: this.direction,
      limit: this.limit,
      page: this.page
    };
  }

}

class RelationResult {

  constructor(results) {
    this.success = [];
    this.fails = [];
    this.partialError = false;
    let len = results.length;
    for (let i = 0; i < len; i++) {
      if (results[i].type === 'error') {
        this.fails.push(results[i]);
        this.partialError = true;
      } else {
        this.success.push(results[i]);
      }
    }
  }

}

export default class RelationAction {

  constructor(container) {
    this.container = container;
  }

  _resolve(body) {
    let users = _.map(body.result, function (attrs) {
      return new User(attrs);
    });
    return users;
  }

  query(queryObj) {
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('relation:query', queryObj.toJSON())
        .then(this._resolve.bind(this), function (err) {
          reject(err);
        });
    }.bind(this));
  }

  queryFriend(actor) {
    if (actor === null) {
      actor = this.container.currentUser;
    }
    let query = new RelationQuery(this.Friend);
    query.user = actor;
    return this.query(query);
  }

  queryFollower(actor) {
    if (actor === null) {
      actor = this.container.currentUser;
    }
    let query = new RelationQuery(this.Follower);
    query.user = actor;
    return this.query(query);
  }

  queryFollowing(actor) {
    if (actor === null) {
      actor = this.container.currentUser;
    }
    let query = new RelationQuery(this.Following);
    query.user = actor;
    return this.query(query);
  }

  add(relation) {
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('relation:add', {
        name: relation.identifier,
        direction: relation.direction,
        targets: relation.targetsID
      }).then(function (body) {
        let result = new RelationResult(body.result);
        resolve(result);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
  }

  remove(relation) {
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('relation:remove', {
        name: relation.identifier,
        direction: relation.direction,
        targets: relation.targetsID
      }).then(function (body) {
        let result = new RelationResult(body.result);
        resolve(result);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
  }

  Query(relationCls) {
    return new RelationQuery(relationCls);
  }

  get Friend() {
    return RelationAction.extend('friend', Mutual);
  }

  get Follower() {
    return RelationAction.extend('follow', Inward);
  }

  get Following() {
    return RelationAction.extend('follow', Outward);
  }

  static extend(identifier, direction) {
    if (!Relation.validName(identifier)) {
      throw new Error(
        'Relation identifier can only be [a-zA-Z]');
    }
    let RelationProto = {
      identifier: identifier,
      direction: direction
    };
    function RelationCls(targets = []) {
      Relation.call(this, identifier, direction);
      this.targets = targets;
    }
    RelationCls.prototype = _.create(Relation.prototype, RelationProto);
    return RelationCls;
  }

}
