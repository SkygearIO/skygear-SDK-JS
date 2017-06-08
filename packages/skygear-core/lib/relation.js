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
const _ = require('lodash');

import User from './user';

export const Outward = 'outward';
export const Inward = 'inward';
export const Mutual = 'mutual';

const format = /^[a-zA-Z]+$/;

export class Relation {

  constructor(identifier, direction, targets = []) {
    if (!Relation.validName(identifier)) {
      throw new Error(
        'Relation identifier can only be [a-zA-Z]+');
    }
    this.identifier = identifier;
    if (Relation.validDirection(direction)) {
      this.direction = direction;
    } else {
      throw new Error(
        'Relation direction not supported.');
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

  static extend(identifier, direction) {
    if (!Relation.validName(identifier)) {
      throw new Error(
        'Relation identifier can only be [a-zA-Z]+');
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

export class RelationQuery {

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

export class RelationResult {

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
        this.success.push(new User(results[i].data));
      }
    }
  }

}

export class RelationRemoveResult {

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
        this.success.push(results[i].id);
      }
    }
  }

}

export class RelationQueryResult extends Array {

  static createFromBody(body) {
    let users = _.map(body.result, function (attrs) {
      return new User(attrs.data);
    });
    let result = new RelationQueryResult();
    users.forEach((val) => result.push(val));
    let info = body.info;
    result._overallCount = info ? info.count : undefined;
    return result;
  }

  get overallCount() {
    return this._overallCount;
  }

}

export class RelationContainer {

  constructor(container) {
    this.container = container;
  }

  query(queryObj) {
    return this.container.makeRequest('relation:query', queryObj.toJSON())
      .then(RelationQueryResult.createFromBody);
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
    return this.container.makeRequest('relation:add', {
      name: relation.identifier,
      direction: relation.direction,
      targets: relation.targetsID
    }).then((body)=>
      new RelationResult(body.result)
    );
  }

  remove(relation) {
    return this.container.makeRequest('relation:remove', {
      name: relation.identifier,
      direction: relation.direction,
      targets: relation.targetsID
    }).then((body)=>
      new RelationRemoveResult(body.result)
    );
  }

  get Query() {
    return RelationQuery;
  }

  get Friend() {
    return Relation.extend('friend', Mutual);
  }

  get Follower() {
    return Relation.extend('follow', Inward);
  }

  get Following() {
    return Relation.extend('follow', Outward);
  }

}
