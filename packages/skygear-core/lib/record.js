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
import Role from './role'; // eslint-disable-line no-unused-vars
import { SkygearError, ErrorCodes } from './error';
import deprecate from 'util-deprecate';

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
  _deleted: {
    parser: (v) => {
      return JSON.parse(v);
    },
    newKey: 'deleted'
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

    let {
      _id,
      _recordID,
      _recordType,
      ...otherAttrs
    } = attrs || {};

    // fallback to parse `_id` only when `_recordID` is unavailable
    if (!_recordID && _id) {
      [_recordType, _recordID] = Record.parseDeprecatedID(_id);
    }

    if (_recordType && _recordType !== recordType) {
      throw new SkygearError(
        `_recordType ${_recordType} in attributes does not match ` +
        `the constructor recordType ${recordType}`,
        ErrorCodes.InvalidArgument
      );
    }

    this._recordType = recordType;
    this._recordID = _recordID || uuid.v4();

    this._access = null;
    this.update(otherAttrs);
    this.updateTransient(otherAttrs._transient);
  }

  /**
   * Type of the record.
   *
   * @type {String}
   */
  get recordType() {
    return this._recordType;
  }

  /**
   * ID of the record.
   *
   * @type {String}
   */
  get recordID() {
    return this._recordID;
  }

  /**
   * @private
   */
  get getDeprecatedID() {
    return deprecate(
      () => [this.recordType, this.recordID].join('/'),
      'A deprecated record ID representation, i.e. `record.id`, is accessed. ' +
        'This will not be supported in the coming version.'
    );
  }

  /**
   * ID of the record in the deprecated format (i.e. `type/id`).
   *
   * @type {String}
   *
   * @deprecated Use `recordType` and `recordID` instead.
   */
  get id() {
    return this.getDeprecatedID();
  }

  /**
   * ACL of the record.
   *
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
   * @type {String[]}
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
   * @type {String[]}
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
        if (_.isPlainObject(value)) {
          this[key] = fromJSON(value);
        } else {
          this[key] = value;
        }
      } else if (key in _metaAttrs) {
        const meta = _metaAttrs[key];
        const parser = meta.parser;
        if (parser) {
          this[meta.newKey] = parser(value);
        }
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
      if (Record.isSerializedRecord(value)) {
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
    const result = _.reduce(this.metaKeys, (payload, key) => {
      const value = this[key];
      if (value === undefined) {
        throw new Error(`Unsupported undefined value of record key: ${key}`);
      }
      if (key in _metaKeys) {
        const meta = _metaAttrs[_metaKeys[key]];
        const stringify = meta.stringify;
        if (stringify) {
          payload[_metaKeys[key]] = stringify(value);
        }
      } else {
        payload[key] = toJSON(value);
      }
      return payload;
    }, this.toTruncatedJSON());

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
      _id: [this.recordType, this.recordID].join('/'),
      _recordType: this.recordType,
      _recordID: this.recordID,
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
  static get parseDeprecatedID() {
    return deprecate(
      (deprecatedID) => {
        const tuple = deprecatedID.split('/');
        if (tuple.length < 2) {
          throw new Error(
            'Fail to parse the deprected ID. ' +
            'Make sure the ID is in the format `type/id`'
          );
        }

        return [tuple[0], tuple.slice(1).join('/')];
      },
      'A deprecated record ID representation is used. ' +
        'This will not be supported in the coming version.'
    );
  }

  /**
   * Extends a Record class with a record type
   *
   * @example
   * const Note = skygear.Record.extend('note');
   * const note = new Note({ 'content': 'abc' });
   *
   * @param  {String} recordType - record type
   * @param  {Map<String, Function>} instMethods - instance methods
   * @return {Class}
   */
  static extend(recordType, instMethods = {}) {
    if (!Record.validType(recordType)) {
      throw new Error(
        'RecordType is not valid. Please start with alphanumeric string.');
    }

    const RecordCls = function (attrs) {
      Record.call(this, recordType, attrs);
    };
    RecordCls.prototype = _.create(Record.prototype, {
      ...instMethods,
      constructor: RecordCls
    });
    RecordCls.recordType = recordType;

    return RecordCls;
  }

  /**
   * Constructs a new Record object from JSON object.
   *
   * @param {Object} obj - the JSON object
   */
  static fromJSON(obj) {
    if (!Record.isSerializedRecord(obj)) {
      throw new Error('Fail to deserialize a record');
    }

    const recordType
      = obj._recordType || Record.parseDeprecatedID(obj._id)[0];

    return new Record(recordType, obj);
  }

  /**
   * @private
   */
  static isSerializedRecord(obj) {
    if (!_.isObject(obj)) {
      return false;
    }

    if ('_recordID' in obj && '_recordType' in obj) {
      return true;
    }

    if ('_id' in obj) {
      return true;
    }

    return false;
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
