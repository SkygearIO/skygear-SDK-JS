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
import _ from 'lodash';
import md5 from 'md5';

import {toJSON, fromJSON} from './util';
import Record from './record';

/**
* Query object provides database query functions.
* @example
* const Note = skygear.Record.extend('note');
* const query = new skygear.Query(Note);
* query.equalTo('title', 'First note');
* skygear.publicDB.query(query).then((notes) => {
* }, (error) => {
*   console.error(error)
* });'
*/

export default class Query {

  /**
   * Creates Query object from a Record Class.
   * @param {Record} recordCls - Record Class
   *
   */
  constructor(recordCls) {
    if (!Record.validType(recordCls.recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }

    /**
     * @private
     */
    this.recordCls = recordCls;

    /**
     * Record type
     *
     * @type {String}
     */
    this.recordType = recordCls.recordType;
    this._predicate = [];
    this._orPredicate = [];
    this._sort = [];
    this._include = {};
    this._negation = false;

    /**
     * True if the query includes overall count
     *
     * @type {Boolean}
     */
    this.overallCount = false;

    /**
     * Limit of the query result
     *
     * @type {Number}
     */
    this.limit = 50;

    /**
     * Offset of the query result
     *
     * @type {Number}
     */
    this.offset = 0;

    /**
     * Page of the query result
     *
     * @type {Number}
     */
    this.page = 0;
  }

  /**
   * Sets a like predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  like(key, value) {
    this._predicate.push(['like', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a negated like predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  notLike(key, value) {
    this._predicate.push([
      'not',
      ['like', {$type: 'keypath', $val: key}, value]
    ]);

    return this;
  }

  /**
   * Sets a case-insensitive like predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  caseInsensitiveLike(key, value) {
    this._predicate.push(['ilike', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a case-insensitive negated like predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  caseInsensitiveNotLike(key, value) {
    this._predicate.push([
      'not',
      ['ilike', {$type: 'keypath', $val: key}, value]
    ]);
    return this;
  }

  /**
   * Sets an equal predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  equalTo(key, value) {
    this._predicate.push(['eq', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a not equal predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  notEqualTo(key, value) {
    this._predicate.push(['neq', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a greater than predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  greaterThan(key, value) {
    this._predicate.push(['gt', {$type: 'keypath', $val: key}, value]);
    return this;
  }


  /**
   * Sets a greater than or equal to predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  greaterThanOrEqualTo(key, value) {
    this._predicate.push(['gte', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a less than predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  lessThan(key, value) {
    this._predicate.push(['lt', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a less than or equal to predicate.
   * @param  {string} key
   * @param  {string} value
   * @return {Query}  self
   */

  lessThanOrEqualTo(key, value) {
    this._predicate.push(['lte', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  /**
   * Sets a distance less than query.
   * @param  {string} key
   * @param  {Geolocation} loc
   * @param  {Number}  distance
   * @return {Query}  self
   */

  distanceLessThan(key, loc, distance) {
    this._predicate.push([
      'lt',
      [
        'func',
        'distance',
        {$type: 'keypath', $val: key},
        {$type: 'geo', $lng: loc.longitude, $lat: loc.latitude}
      ],
      distance
    ]);
    return this;
  }

  /**
   * Sets a distance greater than query.
   * @param  {string} key
   * @param  {geolocation} loc
   * @param  {Number}  distance
   * @return {Query}  self
   */

  distanceGreaterThan(key, loc, distance) {
    this._predicate.push([
      'gt',
      [
        'func',
        'distance',
        {$type: 'keypath', $val: key},
        {$type: 'geo', $lng: loc.longitude, $lat: loc.latitude}
      ],
      distance
    ]);
    return this;
  }

  /**
   * Sets a contains predicate.
   * @throws {Error}  Throws Error if lookupArray is not an array.
   * @param  {string} key
   * @param  {Array}   lookupArray - values
   * @return {Query}  self
   */

  contains(key, lookupArray) {
    if (!_.isArray(lookupArray)) {
      throw new Error('The second argument of contains must be an array.');
    }

    this._predicate.push([
      'in',
      {$type: 'keypath', $val: key},
      lookupArray
    ]);
    return this;
  }

  /**
   * Sets a not contains predicate.
   * @throws {Error}  Throws Error if lookupArray is not an array.
   * @param  {string} key
   * @param  {Array}   lookupArray - values
   * @return {Query}  self
   */

  notContains(key, lookupArray) {
    if (!_.isArray(lookupArray)) {
      throw new Error('The second argument of contains must be an array.');
    }

    this._predicate.push([
      'not',
      [
        'in',
        {$type: 'keypath', $val: key},
        lookupArray
      ]
    ]);
    return this;
  }

  /**
   * Sets a contains value predicate.
   * @throws {Error}  Throws Error if needle is not a string.
   * @param  {string} key
   * @param  {string} needle
   * @return {Query}  self
   */

  containsValue(key, needle) {
    if (!_.isString(needle)) {
      throw new Error('The second argument of containsValue must be a string.');
    }

    this._predicate.push([
      'in',
      needle,
      {$type: 'keypath', $val: key}
    ]);
    return this;
  }


  /**
   * Sets a not contains value predicate.
   * @throws {Error}  Throws Error if needle is not a string.
   * @param  {string} key
   * @param  {string} needle
   * @return {Query}  self
   */

  notContainsValue(key, needle) {
    if (!_.isString(needle)) {
      throw new Error('The second argument of containsValue must be a string.');
    }

    this._predicate.push([
      'not',
      [
        'in',
        needle,
        {$type: 'keypath', $val: key}
      ]
    ]);
    return this;
  }

  /**
   * Sets a having relation predicate.
   * @param  {string} key
   * @param  {string} rel - relationship, either 'friend' or 'follow'
   * @return {Query}  self
   */

  havingRelation(key, rel) {
    let name = rel.prototype.identifier;
    if (name === 'friend') {
      name = '_friend';
    } else if (name === 'follow') {
      name = '_follow';
    }

    this._predicate.push([
      'func',
      'userRelation',
      {$type: 'keypath', $val: key},
      {$type: 'relation', $name: name, $direction: rel.prototype.direction}
    ]);
    return this;
  }

  /**
   * Sets a not having relation predicate.
   * @param  {string} key
   * @param  {string} rel - relationship, either 'friend' or 'follow'
   * @return {Query}  self
   */

  notHavingRelation(key, rel) {
    let name = rel.prototype.identifier;
    if (name === 'friend') {
      name = '_friend';
    } else if (name === 'follow') {
      name = '_follow';
    }

    this._predicate.push([
      'not',
      [
        'func',
        'userRelation',
        {$type: 'keypath', $val: key},
        {$type: 'relation', $name: name, $direction: rel.prototype.direction}
      ]
    ]);
    return this;
  }

  /**
   * Sets descending predicate.
   * @param {string} key
   * @return {Query} self
   */

  addDescending(key) {
    this._sort.push([
      {$type: 'keypath', $val: key},
      'desc'
    ]);
    return this;
  }

  /**
   * Sets ascending predicate.
   * @param {string} key
   * @return {Query} self
   */
  addAscending(key) {
    this._sort.push([
      {$type: 'keypath', $val: key},
      'asc'
    ]);
    return this;
  }

  /**
   * Sets descending by distance predicate.
   * @param {string} key
   * @param {Geolocation} loc
   * @return {Query} self
   */
  addDescendingByDistance(key, loc) {
    this._sort.push([
      [
        'func',
        'distance',
        {$type: 'keypath', $val: key},
        {$type: 'geo', $lng: loc.longitude, $lat: loc.latitude}
      ],
      'desc'
    ]);
    return this;
  }

  /**
   * Sets ascending by distance predicate.
   * @param {string} key
   * @param {Geolocation} loc
   * @return {Query} self
   */
  addAscendingByDistance(key, loc) {
    this._sort.push([
      [
        'func',
        'distance',
        {$type: 'keypath', $val: key},
        {$type: 'geo', $lng: loc.longitude, $lat: loc.latitude}
      ],
      'asc'
    ]);
    return this;
  }

  /**
   * Sets transient include.
   * @param {string} key
   * @param {string} mapToKey
   * @return {Query} this
   */

  transientInclude(key, mapToKey) {
    mapToKey = mapToKey || key;
    this._include[mapToKey] = {
      $type: 'keypath',
      $val: key
    };
    return this;
  }

  /**
   * Sets transient include distance.
   * @param {string} key
   * @param {string} mapToKey
   * @param {Geolocation} loc
   * @return {Query} this
   */

  transientIncludeDistance(key, mapToKey, loc) {
    mapToKey = mapToKey || key;
    this._include[mapToKey] = [
      'func',
      'distance',
      {$type: 'keypath', $val: key},
      {$type: 'geo', $lng: loc.longitude, $lat: loc.latitude}
    ];
    return this;
  }

  _andQuery(queries) {
    _.forEach(queries, (query) => {
      this._predicate.push(query.predicate);
    });
  }

  _orQuery(queries) {
    _.forEach(queries, (query) => {
      this._orPredicate.push(query.predicate);
    });
  }

  _getOrPredicate() {
    const _orPredicate = _.clone(this._orPredicate);
    if (_orPredicate.length === 0) {
      return [];
    } else if (_orPredicate.length === 1) {
      return _orPredicate[0];
    } else {
      _orPredicate.unshift('or');
      return _orPredicate;
    }
  }


  /**
   * Preicate Function
   * @return {Array} Array of {precidate}
   */

  get predicate() {
    const _predicate = _.clone(this._predicate);
    if (this._orPredicate.length > 0) {
      _predicate.push(this._getOrPredicate());
    }

    let innerPredicate = [];
    if (_predicate.length === 1) {
      innerPredicate = _predicate[0];
    } else if (_predicate.length > 0) {
      _predicate.unshift('and');
      innerPredicate = _predicate;
    }

    if (this._negation) {
      return ['not', innerPredicate];
    } else {
      return innerPredicate;
    }
  }

  /**
   * The computed Query object hash code
   * @return {string} md5 digest of serialized JSON
   */

  get hash() {
    return md5(JSON.stringify(this.toJSON()));
  }

  /**
   * Serializes Query object.
   * @return {object}
   */

  /* eslint camelcase: 0 */
  toJSON() {
    let payload = {
      record_type: this.recordType,
      limit: this.limit,
      sort: this._sort,
      include: this._include,
      count: this.overallCount
    };
    if (this.predicate.length > 1) {
      payload.predicate = toJSON(this.predicate);
    }
    if (this.offset) {
      payload.offset = this.offset;
    }
    if (this.page) {
      payload.page = this.page;
    }
    return payload;
  }

  /**
   * Clones a Query object from a Query object.
   * @param {Query} query - query to be cloned.
   */

  static clone(query) {
    return Query.fromJSON(query.toJSON());
  }

  /**
   * Clones a Query object from payload.
   * @param payload - Payload
   */

  static fromJSON(payload) {
    let json = _.cloneDeep(payload);
    let recordCls = Record.extend(json.record_type);
    let query = new Query(recordCls);

    query.limit = json.limit;
    query._sort = json.sort;
    query.overallCount = json.count;

    if (json.offset) {
      query.offset = json.offset;
    }

    if (json.page) {
      query.page = json.page;
    }

    if (json.predicate && json.predicate.length > 1) {
      let innerPredicate = fromJSON(json.predicate);

      // unwrap 'not' operator
      if (innerPredicate[0] === 'not') {
        query._negation = true;
        innerPredicate = innerPredicate[1];
      }

      // unwrap 'and' operator
      if (innerPredicate.length > 1 && innerPredicate[0] === 'and') {
        innerPredicate.shift();
      }

      let _predicate = [];
      let _orPredicate = [];
      _.each(innerPredicate, (perPredicate) => {
        if (perPredicate.length > 1 && perPredicate[0] === 'or') {
          _orPredicate = perPredicate;
        } else {
          _predicate.push(perPredicate);
        }
      });

      // unwrap 'or' operator
      if (_orPredicate.length > 1) {
        _orPredicate.shift();
      }

      // handler for single predicate
      if (_predicate.length > 1 &&
        typeof _predicate[0] === 'string' &&
        _predicate[0] !== 'and') {
        _predicate = [_predicate];
      }

      query._predicate = _predicate;
      query._orPredicate = _orPredicate;
    }

    return query;
  }

  /**
   * Check if the queries have the same record type
   * @param {Query} queries - Queries
   */

  static isSameRecordType(...queries) {
    let recordType = null;
    for (let index = 0; index < queries.length; index++) {
      const query = queries[index];
      if (!recordType) {
        recordType = query.recordType;
      }

      if (recordType !== query.recordType) {
        return false;
      }
    }

    return true;
  }

  /**
   * Returns a conjunctive query from queries.
   * @param {Query} queries - Queries
   */

  static and(...queries) {
    if (queries.length === 0) {
      throw new Error('Queries cannot be empty.');
    }

    if (!Query.isSameRecordType(queries)) {
      throw new Error('All queries must be for the same recordType.');
    }

    let andQuery = new Query(queries[0].recordCls);
    andQuery._andQuery(queries);
    return andQuery;
  }

  /**
   * Returns a disjunctive query from queries.
   * @param {Query} queries - Queries
   */

  static or(...queries) {
    if (queries.length === 0) {
      throw new Error('Queries cannot be empty.');
    }

    if (!Query.isSameRecordType(queries)) {
      throw new Error('All queries must be for the same recordType.');
    }

    let orQuery = new Query(queries[0].recordCls);
    orQuery._orQuery(queries);
    return orQuery;
  }

  /**
   * Returns a negated query.
   * @param {Query} query - Query
   */

  static not(query) {
    const queryClone = Query.clone(query);
    queryClone._negation = !queryClone._negation;

    return queryClone;
  }

}
