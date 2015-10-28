import _ from 'lodash';

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
    this._sort = [];
    this._include = {};
    this.limit = 50;
    this.offset = 0;
  }

  like(key, value) {
    this._predicate.push(['like', {$type: 'keypath', $val: key}, value]);
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
    this._predicate.push('or');
    _.forEach(queries, (query) => {
      this._predicate.push(query.predicate);
    });
  }

  get predicate() {
    if (this._predicate.length === 0) {
      return [];
    }
    if (this._predicate.length === 1) {
      return this._predicate[0];
    } else {
      let _predicate = _.clone(this._predicate);
      if (_predicate[0] !== 'or') {
        _predicate.unshift('and');
      }
      return _predicate;
    }
  }

  /* eslint camelcase: 0 */
  toJSON() {
    let payload = {
      record_type: this.recordType,
      limit: this.limit,
      sort: this._sort,
      include: this._include
    };
    if (this.predicate.length > 1) {
      payload.predicate = predicateToJSON(this.predicate);
    }
    if (this.offset) {
      payload.offset = this.offset;
    }
    return payload;
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

function predicateToJSON(predicate) {
  return predicate.map(c => {
    if (c.toJSON) {
      return c.toJSON();
    }
    return c;
  });
}
