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

import {UserRecord} from './container';

/**
 * Outward relation direction
 *
 * @type {String}
 */
export const Outward = 'outward';

/**
 * Inward relation direction
 *
 * @type {String}
 */
export const Inward = 'inward';

/**
 * Mutual relation direction
 *
 * @type {String}
 */
export const Mutual = 'mutual';

const format = /^[a-zA-Z]+$/;

/**
 * Relation
 *
 * It describes a relationship of the current user with other users.
 */
export class Relation {

  /**
   * Constructs a new Relation object.
   *
   * @param  {String} identifier - identifier of the relation
   * @param  {String} direction - direction of the relation
   * @param  {Record[]} targets - target users of the relation
   */
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

  /**
   * Target user ids
   *
   * @type {String[]}
   */
  get targetsID() {
    return _.map(this.targets, function (user) {
      return user._id;
    });
  }

  /**
   * @private
   */
  static validDirection(direction) {
    return direction === Mutual
      || direction === Outward
      || direction === Inward;
  }

  /**
   * @private
   */
  static validName(identifier) {
    return format.test(identifier);
  }

  /**
   * @private
   */
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

/**
 * @private
 */
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

/**
 * Result of add relation API
 */
export class RelationResult {

  constructor(results) {
    /**
     * Succesfully added target users
     *
     * @type {Record[]}
     */
    this.success = [];

    /**
     * Errors
     *
     * @type {Object[]}
     */
    this.fails = [];
    this.partialError = false;
    let len = results.length;
    for (let i = 0; i < len; i++) {
      if (results[i].type === 'error') {
        this.fails.push(results[i]);
        this.partialError = true;
      } else {
        this.success.push(new UserRecord(results[i].data));
      }
    }
  }

}

/**
 * Result of remove relation API
 */
export class RelationRemoveResult {

  constructor(results) {
    /**
     * Succesfully removed target users
     *
     * @type {String[]}
     */
    this.success = [];

    /**
     * Errors
     *
     * @type {Object[]}
     */
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

/**
 * Result of query relation API
 */
export class RelationQueryResult extends Array {

  /**
   * @private
   */
  static createFromBody(body) {
    let users = _.map(body.result, function (attrs) {
      return new UserRecord(attrs.data);
    });
    let result = new RelationQueryResult();
    users.forEach((val) => result.push(val));
    let info = body.info;
    result._overallCount = info ? info.count : undefined;
    return result;
  }

  /**
   * The count would return the number of all matching records, and ignore the
   * offset and limit of the query.
   *
   * @type {Number} the number of all matching records
   */
  get overallCount() {
    return this._overallCount;
  }

}

export class RelationContainer {

  constructor(container) {
    this.container = container;
  }

  /**
   * Queries users with a relation query object.
   *
   * @param  {RelationQuery} queryObj
   * @return {Promise<RelationQueryResult>} promise with user records
   */
  query(queryObj) {
    return this.container.makeRequest('relation:query', queryObj.toJSON())
      .then(RelationQueryResult.createFromBody);
  }

  /**
   * Queries friends of current user. Convenient method of
   * {@link RelationContainer#query}.
   *
   * @return {Promise<RelationQueryResult>} promise with user records
   */
  queryFriend() {
    let query = new RelationQuery(this.Friend);
    return this.query(query);
  }

  /**
   * Queries followers of current user. Convenient method of
   * {@link RelationContainer#query}.
   *
   * @return {Promise<RelationQueryResult>} promise with user records
   */
  queryFollower() {
    let query = new RelationQuery(this.Follower);
    return this.query(query);
  }

  /**
   * Queries users that the current user is following. Convenient method of
   * {@link RelationContainer#query}.
   *
   * @return {Promise<RelationQueryResult>} promise with user records
   */
  queryFollowing() {
    let query = new RelationQuery(this.Following);
    return this.query(query);
  }

  /**
   * Adds relation to the current user.
   *
   * @param {Relation} relation
   * @return {Promise<RelationResult>} promise with user records
   */
  add(relation) {
    return this.container.makeRequest('relation:add', {
      name: relation.identifier,
      direction: relation.direction,
      targets: relation.targetsID
    }).then((body) =>
      new RelationResult(body.result)
    );
  }

  /**
   * Removes relation from the current user.
   *
   * @param {Relation} relation
   * @return {Promise<RelationRemoveResult>} promise with user id
   */
  remove(relation) {
    return this.container.makeRequest('relation:remove', {
      name: relation.identifier,
      direction: relation.direction,
      targets: relation.targetsID
    }).then((body) =>
      new RelationRemoveResult(body.result)
    );
  }

  /**
   * Relation query class.
   *
   * @type {RelationQuery}
   */
  get Query() {
    return RelationQuery;
  }

  /**
   * @type {Relation}
   */
  get Friend() {
    return Relation.extend('friend', Mutual);
  }

  /**
   * @type {Relation}
   */
  get Follower() {
    return Relation.extend('follow', Inward);
  }

  /**
   * @type {Relation}
   */
  get Following() {
    return Relation.extend('follow', Outward);
  }

}
