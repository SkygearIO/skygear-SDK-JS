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
  _ownerID: {
    parser: (v) => {
      return v;
    },
    newKey: 'ownerID'
  },
  _created_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    newKey: 'createdBy'
  },
  _updated_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    newKey: 'updatedBy'
  },
  _access: {
    parser: (v) => {
      let acl = v;
      if (v && v.toJSON) {
        acl = v.toJSON();
      }
      return ACL.fromJSON(acl);
    },
    newKey: '_access'
  }
};

const _metaKey = _.map(_metaAttrs, function (obj) {
  return obj.newKey;
});

/**
 * Record provides the model for Skygear {@link Database} to interact with
 * server.
 *
 * Developer may use {@link Record.extend} to create custom record type.
 */
export default class Record {

  constructor(recordType, attrs = defaultAttrs) {
    if (!Record.validType(recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }
    this._recordType = recordType;
    // Favouring `id`, since `id` will always contains type information if
    // exist.
    let id = attrs.id || attrs._id;
    if (id === null || id === undefined) {
      id = uuid.v4();
    } else {
      let [type, name] = Record.parseID(id);
      if (type !== this._recordType) {
        throw new Error('_id is not valid. RecordType mismatch.');
      }
      id = name;
    }
    delete attrs.id; // because `id` is a readonly property
    this._id = id;
    this._access = null;
    this.update(attrs);
    this.updateTransient(attrs._transient);
  }

  /**
   * @type {String}
   */
  get recordType() {
    return this._recordType;
  }

  /**
   * Record id in the format of `type/id`
   *
   * @type {String}
   */
  get id() {
    return this._recordType + '/' + this._id;
  }

  /**
   * @type {ACL}
   */
  get access() {
    if (this._access === null || this._access === undefined) {
      this._access = new ACL();
    }
    return this._access;
  }

  /**
   * @type {ACL}
   */
  set access(acl) {
    this._access = acl;
  }

  /**
   * Set ACL of the record.
   *
   * @param {ACL} acl
   */
  setAccess(acl) {
    this.access = acl;
  }

  /**
   * Gets all keys of attributes of the records. Skygear reserved keys, that is
   * underscore prefixed keys, are excluded.
   *
   * @type {String[]} [description]
   */
  get attributeKeys() {
    let keys = Object.keys(this);
    return _.filter(keys, function (value) {
      return value.indexOf('_') !== 0 && !_.includes(_metaKey, value);
    });
  }

  /**
   * Returns a dictionary of transient fields.
   *
   * Transient fields are attached to an instance of Record and it is never
   * persisted on server, but they may be returned as extra data about the
   * record when fetched or queried from server with
   * {@link Query#transientInclude}.
   *
   * @type {Object}
   */
  get $transient() {
    return this._transient;
  }

  /**
   * Updates record attributes with a dictionary.
   *
   * @param  {Object} attrs
   */
  update(attrs) {
    _.each(this.attributeKeys, (key) => {
      delete this[key];
    });

    _.each(attrs, (value, key) => {
      if (key.indexOf('_') !== 0) {
        if (_.isObject(value)) {
          this[key] = fromJSON(value);
        } else {
          this[key] = value;
        }
      } else if (key in _metaAttrs) {
        let meta = _metaAttrs[key];
        this[meta.newKey] = meta.parser(value);
      }
    });
  }

  setPublicNoAccess() {
    this.access.setPublicNoAccess();
  }

  setPublicReadOnly() {
    this.access.setPublicReadOnly();
  }

  setPublicReadWriteAccess() {
    this.access.setPublicReadWriteAccess();
  }

  setNoAccessForRole(role) {
    this.access.setNoAccessForRole(role);
  }

  setReadOnlyForRole(role) {
    this.access.setReadOnlyForRole(role);
  }

  setReadWriteAccessForRole(role) {
    this.access.setReadWriteAccessForRole(role);
  }

  setNoAccessForUser(user) {
    this.access.setNoAccessForUser(user);
  }

  setReadOnlyForUser(user) {
    this.access.setReadOnlyForUser(user);
  }

  setReadWriteAccessForUser(User) {
    this.access.setReadWriteAccessForUser(User);
  }

  hasPublicReadAccess() {
    this.access.hasPublicReadAccess();
  }

  hasPublicWriteAccess() {
    this.access.hasPublicWriteAccess();
  }

  hasReadAccess(role) {
    this.access.hasReadAccess(role);
  }

  hasWriteAccess(role) {
    this.access.hasWriteAccess(role);
  }

  hasReadAccessForRole(role) {
    this.access.hasReadAccessForRole(role);
  }

  hasWriteAccessForRole(role) {
    this.access.hasWriteAccessForRole(role);
  }

  hasReadAccessForUser(user) {
    this.access.hasReadAccessForUser(user);
  }

  hasWriteAccessForUser(user) {
    this.access.hasWriteAccessForUser(user);
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
      _access: this._access && this._access.toJSON()
    };
    _.each(this.attributeKeys, (key) => {
      const value = this[key];
      if (value === undefined) {
        throw new Error(`Unsupported undefined value of record key: ${key}`);
      }
      payload[key] = toJSON(value);
    });

    return payload;
  }

  /**
   * @private
   */
  static validType(recordType) {
    return recordType && recordType.indexOf('_') !== 0;
  }

  /**
   * @private
   */
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
