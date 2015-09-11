import uuid from 'uuid';
import _ from 'lodash';

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

  constructor(recordType, attrs = defaultAttrs) {
    if (!Record.validType(recordType)) {
      throw new Error('RecordType is not valid. Please start with alphanumeric string.');
    }
    this._recordType = recordType;
    let id = attrs._id;
    if (id === null || id === undefined) {
      id = uuid.v4();
    } else {
      let tuple = id.split('/');
      if (tuple[0] !== this._recordType) {
        throw new Error('_id is not valid. RecordType mismatch.');
      }
      id = tuple[1];
    }
    this._id = id;
    this.update(attrs);
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

  update(attrs) {
    _.each(attrs, function (value, key) {
      if (!key.startsWith('_')) {
        this[key] = value;
      }
    }, this);
  }

  toJSON() {
    let payload = {
      _id: this.ID
    };
    _.each(this.attributeKeys, function (key) {
      payload[key] = this[key];
    }, this);
    return payload;
  }

  static validType(recordType) {
    return recordType && !recordType.startsWith('_');
  }

  static extend(recordType, instFunc) {
    if (!Record.validType(recordType)) {
      throw new Error('RecordType is not valid. Please start with alphanumeric string.');
    }
    let RecordProto = {};
    function RecordCls(attrs = defaultAttrs) {
      Record.call(this, recordType, attrs);
    }
    _.assign(RecordProto, instFunc, {
      constructor: RecordCls
    });
    RecordCls.prototype = _.create(Record.prototype, RecordProto);
    RecordCls.recordType = recordType;
    return RecordCls;
  }

}
