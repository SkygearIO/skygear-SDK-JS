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
import uuid from 'uuid';
import _ from 'lodash';
import {toJSON, fromJSON} from './util';
import ACL from './acl';

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

const _metaAttrs = {
  _created_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    newKey: 'createdAt'
  },
  _updated_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    newKey: 'updatedAt'
  },
  _acl: {
    parser: (v) => {
      return ACL.fromJSON(v);
    },
    newKey: '_acl'
  }
};

const _metaKey = _.map(_metaAttrs, function (obj) {
  return obj.newKey;
});

export default class Record {

  constructor(recordType, attrs = defaultAttrs) {
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
    this._acl = Record.defaultACL;
    this.update(attrs);
    this.updateTransient(attrs._transient);
  }

  get recordType() {
    return this._recordType;
  }

  get id() {
    return this._recordType + '/' + this._id;
  }

  get acl() {
    return this._acl;
  }

  setACL(acl) {
    this._acl = acl || Record.defaultACL;
  }

  get attributeKeys() {
    let keys = Object.keys(this);
    return _.filter(keys, function (value) {
      return !value.startsWith('_') && !_.includes(_metaKey, value);
    });
  }

  get $transient() {
    return this._transient;
  }

  update(attrs) {
    _.each(this.attributeKeys, function (key) {
      delete this[key];
    }, this);

    _.each(attrs, function (value, key) {
      if (!key.startsWith('_')) {
        if (_.isObject(value)) {
          this[key] = fromJSON(value);
        } else {
          this[key] = value;
        }
      } else if (key in _metaAttrs) {
        let meta = _metaAttrs[key];
        this[meta.newKey] = meta.parser(value);
      }
    }, this);
  }

  addReadAccess(role) { //eslint-disable-line no-unused-vars
    // TODO: add read access
    console.error('Not yet implemented');
  }

  removeReadAccess(role) { //eslint-disable-line no-unused-vars
    // TODO: remove read access
    console.error('Not yet implemented');
  }

  addWriteAccess(role) { //eslint-disable-line no-unused-vars
    // TODO: add write access
    console.error('Not yet implemented');
  }

  removeWriteAccess(role) { //eslint-disable-line no-unused-vars
    // TODO: remove write access
    console.error('Not yet implemented');
  }

  updateTransient(transient_, merge = false) {
    var newTransient = merge ? _.clone(this._transient) : {};
    _.each(transient_, function (value, key) {
      // If value is an object and `_id` field exists, assume
      // that it is a record.
      if (_.isObject(value) && '_id' in value) {
        newTransient[key] = recordDictToObj(value);
      } else if (_.isObject(value)) {
        newTransient[key] = fromJSON(value);
      } else {
        newTransient[key] = value;
      }
    });
    this._transient = newTransient;
  }

  toJSON() {
    let payload = {
      _id: this.id,
      _acl: this.acl.toJSON()
    };
    _.each(this.attributeKeys, function (key) {
      payload[key] = toJSON(this[key]);
    }, this);

    return payload;
  }

  static get defaultACL() {
    return ACL.Default;
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

function recordDictToObj(dict) {
  const Cls = Record.extend(dict._id.split('/')[0]);
  return new Cls(dict);
}
