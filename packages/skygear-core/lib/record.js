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
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'createdAt'
  },
  _updated_at: { //eslint-disable-line
    parser: (v) => {
      return new Date(v);
    },
    stringify: (v) => {
      return v.toJSON();
    },
    newKey: 'updatedAt'
  },
  _ownerID: {
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'ownerID'
  },
  _created_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
      return v;
    },
    newKey: 'createdBy'
  },
  _updated_by: { //eslint-disable-line
    parser: (v) => {
      return v;
    },
    stringify: (v) => {
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
    stringify: (v) => {
      return v && v.toJSON();
    },
    newKey: '_access'
  }
};

const _metaKeys = _.reduce(_metaAttrs, function (result, value, key) {
  result[value.newKey] = key;
  return result;
}, {});

/**
 * Record provides the model for Skygear {@link Database} to interact with
 * server.
 *
 * Developer may use {@link Record.extend} to create custom record type.
 */
export default class Record {

  constructor(recordType, attrs) {
    if (!Record.validType(recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }
    if (!attrs) {
      attrs = _.assign({}, defaultAttrs);
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
      return value.indexOf('_') !== 0 && !(value in _metaKeys);
    });
  }

  /**
   * Gets all keys of attributes of the records, includig reserved keys.
   *
   * @type {String[]} [description]
   */
  get metaKeys() {
    let keys = Object.keys(this);
    return _.filter(keys, function (value) {
      return value in _metaKeys;
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

  /**
   * Sets public to have no access.
   */
  setPublicNoAccess() {
    this.access.setPublicNoAccess();
  }

  /**
   * Sets public to have read access only.
   */
  setPublicReadOnly() {
    this.access.setPublicReadOnly();
  }

  /**
   * Sets the record readable and writable to public.
   */
  setPublicReadWriteAccess() {
    this.access.setPublicReadWriteAccess();
  }

  /**
   * Sets a specific role to have no access.
   *
   * @param {Role} role - the role
   */
  setNoAccessForRole(role) {
    this.access.setNoAccessForRole(role);
  }

  /**
   * Sets a specific role to have read access only.
   *
   * @param {Role} role - the role
   */
  setReadOnlyForRole(role) {
    this.access.setReadOnlyForRole(role);
  }

  /**
   * Sets a specific role to have read and write access.
   *
   * @param {Role} role - the role
   */
  setReadWriteAccessForRole(role) {
    this.access.setReadWriteAccessForRole(role);
  }

  /**
   * Sets a specific user to have no access.
   *
   * @param {Record} user - the user record
   */
  setNoAccessForUser(user) {
    this.access.setNoAccessForUser(user);
  }

  /**
   * Sets a specific user to have read access only.
   *
   * @param {Record} user - the user record
   */
  setReadOnlyForUser(user) {
    this.access.setReadOnlyForUser(user);
  }

  /**
   * Sets a specific user to have read and write access.
   *
   * @param {Record} user - the user record
   */
  setReadWriteAccessForUser(user) {
    this.access.setReadWriteAccessForUser(user);
  }

  /**
   * Checks if public has read access.
   *
   * @return {Boolean} true if public has read access
   */
  hasPublicReadAccess() {
    this.access.hasPublicReadAccess();
  }

  /**
   * Checks if public has write access.
   *
   * @return {Boolean} true if public has write access
   */
  hasPublicWriteAccess() {
    this.access.hasPublicWriteAccess();
  }

  /**
   * Checks if the specific role has read access.
   *
   * @param {Role} role - the role
   * @return {Boolean} true if the role has read access
   */
  hasReadAccessForRole(role) {
    this.access.hasReadAccessForRole(role);
  }

  /**
   * Checks if the specific role has write access.
   *
   * @param {Role} role - the role
   * @return {Boolean} true if the role has write access
   */
  hasWriteAccessForRole(role) {
    this.access.hasWriteAccessForRole(role);
  }

  /**
   * Checks if the specific user has read access.
   *
   * @param {Record} user - the user
   * @return {Boolean} true if the user has read access
   */
  hasReadAccessForUser(user) {
    this.access.hasReadAccessForUser(user);
  }

  /**
   * Checks if the specific user has write access.
   *
   * @param {Record} user - the user
   * @return {Boolean} true if the user has write access
   */
  hasWriteAccessForUser(user) {
    this.access.hasWriteAccessForUser(user);
  }

  /**
   * @private
   */
  updateTransient(transient_, merge = false) {
    var newTransient = merge ? _.clone(this._transient) : {};
    _.each(transient_, function (value, key) {
      // If value is an object and `_id` field exists, assume
      // that it is a record.
      if (_.isObject(value) && '_id' in value) {
        newTransient[key] = Record.fromJSON(value);
      } else if (_.isObject(value)) {
        newTransient[key] = fromJSON(value);
      } else {
        newTransient[key] = value;
      }
    });
    this._transient = newTransient;
  }

  /**
   * Serializes Record to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    var result = this.toTruncatedJSON();
    result = _.reduce(this.metaKeys, (payload, key) => {
      const value = this[key];
      if (value === undefined) {
        throw new Error(`Unsupported undefined value of record key: ${key}`);
      }
      if (key in _metaKeys) {
        const meta = _metaAttrs[_metaKeys[key]];
        payload[_metaKeys[key]] = meta.stringify(value);
      } else {
        payload[key] = toJSON(value);
      }
      return payload;
    }, result);

    if (!_.isEmpty(this._transient)) {
      result._transient = toJSON(this._transient);
    }
    return result;
  }

  /**
   * Serializes Record to a JSON object without metadata keys.
   *
   * @return {Object} the JSON object
   */
  toTruncatedJSON() {
    return _.reduce(this.attributeKeys, (payload, key) => {
      const value = this[key];
      if (value === undefined) {
        throw new Error(`Unsupported undefined value of record key: ${key}`);
      }
      payload[key] = toJSON(value);
      return payload;
    }, {
      _id: this.id,
      _access: this._access && this._access.toJSON()
    });
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

  /**
   * Extends a Record class with a record type
   *
   * @example
   * const Note = skygear.Record.extend('note');
   * const note = new Note({ 'content': 'abc' });
   *
   * @param  {String} recordType - record type
   * @param  {function} instFunc
   * @return {Class}
   */
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

  /**
   * Constructs a new Record object from JSON object.
   *
   * @param {Object} attrs - the JSON object
   */
  static fromJSON(attrs) {
    const Cls = Record.extend(attrs._id.split('/')[0]);
    return new Cls(attrs);
  }
}

/**
 * Returns whether an object is a Skygear Record.
 *
 * @return {Boolean} true if the specified object is a Skygear Record.
 */
export function isRecord(obj) {
  return obj instanceof Record;
}
