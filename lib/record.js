import uuid from 'uuid';
import _ from 'lodash';
import Geolocation from './geolocation';

/**
  Creates a new Recrod with defined attributes.
  Normally won't call it directly. You are recommended  to use a subclass
  of Parse.Object instead, created by calling extend.

  var Note = Parse.Object.extend('Note');
  var object = new Note({
    'content': 'First note',
  });

 */

const defaultAttrs = {
  _id: null,
  _type: null
};

export default class Record {

  constructor(recordType, attrs = defaultAttrs, transientMapping = {}) {
    if (!Record.validType(recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }
    this._recordType = recordType;
    let id = attrs._id;
    if (id === null || id === undefined) {
      id = uuid.v4();
    } else {
      let [type, name] = Record.parseID(id);
      if (type !== this._recordType) {
        throw new Error('_id is not valid. RecordType mismatch.');
      }
      id = name;
    }
    this._id = id;
    this.update(attrs);
    this.updateTransient(attrs._transient, transientMapping);
  }

  get recordType() {
    return this._recordType;
  }

  get ID() {
    return this._recordType + '/' + this._id;
  }

  get attributeKeys() {
    let keys = Object.keys(this);
    return _.filter(keys, function (value) {
      return !value.startsWith('_');
    });
  }

  get transient() {
    return this._transient;
  }

  update(attrs) {
    _.each(attrs, function (value, key) {
      if (!key.startsWith('_')) {
        if (typeof value === 'object') {
          this[key] = Record.parseAttributeValue(value);
        } else {
          this[key] = value;
        }
      }
    }, this);
  }

  updateTransient(transient, transientMapping) {
    this._transient = {};
    _.forEach(transient, function (n, key) {
      let value = transient[key];
      if (_.isArray(value)) {
        value = value.map(recordDictToObj);
      } else {
        value = recordDictToObj(value);
      }
      this._transient[transientMapping[key].$val] = value;
    }.bind(this));
  }

  toJSON() {
    let payload = {
      _id: this.ID
    };
    _.each(this.attributeKeys, function (key) {
      let value = this[key];
      if (value.toJSON) {
        payload[key] = value.toJSON();
      } else {
        payload[key] = value;
      }
    }, this);
    return payload;
  }

  static validType(recordType) {
    return recordType && !recordType.startsWith('_');
  }

  static parseID(id) {
    let tuple = id.split('/');
    if (tuple.length < 2) {
      throw new Error(
        '_id is not valid. _id has to be in the format `type/id`');
    }
    return [tuple[0], tuple.slice(1).join('/')];
  }

  static extend(recordType, instFunc) {
    if (!Record.validType(recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }
    let RecordProto = {};
    function RecordCls(attrs = defaultAttrs, transientMapping = {}) {
      Record.call(this, recordType, attrs, transientMapping);
    }
    _.assign(RecordProto, instFunc, {
      constructor: RecordCls
    });
    RecordCls.prototype = _.create(Record.prototype, RecordProto);
    RecordCls.recordType = recordType;
    return RecordCls;
  }

  static parseAttributeValue(attrs) {
    switch (attrs.$type) {
      case 'geo':
        return Geolocation.fromJSON(attrs);
      default:
        return attrs;
    }
  }

}

function recordDictToObj(dict) {
  const Cls = Record.extend(dict._id.split('/')[0]);
  return new Cls(dict);
}
