import Record from './record';


export default class Query {

  constructor(recordCls) {
    if (!Record.validType(recordCls.recordType)) {
      throw new Error('RecordType is not valid. Please start with alphanumeric string.');
    }
    this.recordCls = recordCls;
    this.recordType = recordCls.recordType;
    this.predicate = [];
    this._sort = [];
    this.limit = 50;
    this.offset = 0;
  }

  equalTo(key, value) {
    this.predicate.push(['eq', key, value]);
    return this;
  }

  notEqualTo(key, value) {
    this.predicate.push(['neq', key, value]);
    return this;
  }

  greaterThan(key, value) {
    this.predicate.push(['gt', key, value]);
    return this;
  }

  greaterThanOrEqualTo(key, value) {
    this.predicate.push(['gte', key, value]);
    return this;
  }

  lessThan(key, value) {
    this.predicate.push(['lt', key, value]);
    return this;
  }

  lessThanOrEqualTo(key, value) {
    this.predicate.push(['lte', key, value]);
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

  /* eslint camelcase: 0 */
  toJSON() {
    return {
      record_type: this.recordType,
      predicate: JSON.stringify(this.predicate),
      limit: this.limit,
      sort: this._sort
    };
  }

}
