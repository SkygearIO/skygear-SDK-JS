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

export default class Query {

  constructor(recordCls) {
    if (!Record.validType(recordCls.recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }
    this.recordCls = recordCls;
    this.recordType = recordCls.recordType;
    this._predicate = [];
    this._orPredicate = [];
    this._sort = [];
    this._include = {};
    this._negation = false;
    this.overallCount = false;
    this.limit = 50;
    this.offset = 0;
    this.page = 0;
  }

  like(key, value) {
    this._predicate.push(['like', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  notLike(key, value) {
    this._predicate.push([
      'not',
      ['like', {$type: 'keypath', $val: key}, value]
    ]);

    return this;
  }

  caseInsensitiveLike(key, value) {
    this._predicate.push(['ilike', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  caseInsensitiveNotLike(key, value) {
    this._predicate.push([
      'not',
      ['ilike', {$type: 'keypath', $val: key}, value]
    ]);
    return this;
  }

  equalTo(key, value) {
    this._predicate.push(['eq', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  notEqualTo(key, value) {
    this._predicate.push(['neq', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  greaterThan(key, value) {
    this._predicate.push(['gt', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  greaterThanOrEqualTo(key, value) {
    this._predicate.push(['gte', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  lessThan(key, value) {
    this._predicate.push(['lt', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  lessThanOrEqualTo(key, value) {
    this._predicate.push(['lte', {$type: 'keypath', $val: key}, value]);
    return this;
  }

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

  havingEmails(emails) {
    if (this.recordType !== 'user') {
      throw new Error('havingEmails predicate only works on user record');
    }
    if (!_.isArray(emails)) {
      emails = [emails];
    }

    this._predicate.push([
      'func',
      'userDiscover',
      {emails: emails}
    ]);
    return this;
  }

  havingUsernames(usernames) {
    if (this.recordType !== 'user') {
      throw new Error('havingUsernames predicate only works on user record');
    }
    if (!_.isArray(usernames)) {
      usernames = [usernames];
    }

    this._predicate.push([
      'func',
      'userDiscover',
      {usernames: usernames}
    ]);
    return this;
  }

  addDescending(key) {
    this._sort.push([
      {$type: 'keypath', $val: key},
      'desc'
    ]);
    return this;
  }

  addAscending(key) {
    this._sort.push([
      {$type: 'keypath', $val: key},
      'asc'
    ]);
    return this;
  }

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

  transientInclude(key, mapToKey) {
    mapToKey = mapToKey || key;
    this._include[mapToKey] = {
      $type: 'keypath',
      $val: key
    };
    return this;
  }

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

  get hash() {
    return md5(JSON.stringify(this.toJSON()));
  }

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

  static clone(query) {
    return Query.fromJSON(query.toJSON());
  }

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

  static or(...queries) {
    let recordType = null;
    let recordCls = null;
    _.forEach(queries, (query) => {
      if (!recordType) {
        recordType = query.recordType;
        recordCls = query.recordCls;
      }

      if (recordType !== query.recordType) {
        throw new Error('All queries must be for the same recordType.');
      }
    });

    let orQuery = new Query(recordCls);
    orQuery._orQuery(queries);
    return orQuery;
  }

  static not(query) {
    const queryClone = Query.clone(query);
    queryClone._negation = !queryClone._negation;

    return queryClone;
  }

}
