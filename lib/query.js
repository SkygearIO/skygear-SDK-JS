import _ from 'lodash';
import md5 from 'md5';

import {toJSON} from './util';
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
    this.overallCount = false;
    this.limit = 50;
    this.offset = 0;
  }

  like(key, value) {
    this._predicate.push(['like', {$type: 'keypath', $val: key}, value]);
    return this;
  }

  caseInsensitiveLike(key, value) {
    this._predicate.push(['ilike', {$type: 'keypath', $val: key}, value]);
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

  havingRelation(key, rel) {
    var name = rel.prototype.identifier;
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

    if (_predicate.length === 0) {
      return [];
    }
    if (_predicate.length === 1) {
      return _predicate[0];
    } else {
      _predicate.unshift('and');
      return _predicate;
    }
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
    return payload;
  }

  get hash() {
    return md5(JSON.stringify(this.toJSON()));
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

}
