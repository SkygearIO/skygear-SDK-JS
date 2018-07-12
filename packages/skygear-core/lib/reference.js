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
import Record, { isRecord } from './record';

/**
 * Reference
 *
 * A model representing a record reference in Skygear record.
 */
export default class Reference {

  /**
   * Constructs a new Reference object.
   *
   * @example
   * let record = new Record('note', {
   *     _recordType: 'note',
   *     _recordID: '123',
   *     content: 'hello world',
   * });
   * let ref = new Reference(record);
   * console.log('type', ref.recordType);  // note
   * console.log('id', ref.recordType);    // 123
   *
   * @example
   * let ref = new Reference('note', '123');
   * console.log('type', ref.recordType);  // note
   * console.log('id', ref.recordType);    // 123
   *
   * @example
   * // WARNING: This usage is deprecated
   * let ref = new Reference('note/123');
   * console.log('type', ref.recordType);  // note
   * console.log('id', ref.recordType);    // 123
   *
   * @param {Record|String} recordOrRecordType - the referencing record or
   *                                             the record type
   * @param {String}        [recordID]   - the referencing record ID
   */
  constructor(recordOrRecordType, recordID) {
    if (isRecord(recordOrRecordType)) {
      this._recordType = recordOrRecordType.recordType;
      this._recordID = recordOrRecordType.recordID;
      return;
    }

    if (typeof recordOrRecordType === 'string') {
      if (recordID && typeof recordID === 'string') {
        this._recordType = recordOrRecordType;
        this._recordID = recordID;
        return;
      }

      const [type, id] = Record.parseDeprecatedID(recordOrRecordType);
      this._recordType = type;
      this._recordID = id;
      return;
    }

    throw new Error('Fail to construct a record reference');
  }

  /**
   * ID of the referencing record in the deprecated format
   * (i.e. `type/id`).
   *
   * @type {String}
   *
   * @deprecated Use `recordType` and `recordID` instead.
   */
  get id() {
    return [this.recordType, this.recordID].join('/');
  }

  /**
   * Type of the referencing record.
   *
   * @type {String}
   */
  get recordType() {
    return this._recordType;
  }

  /**
   * ID of the referencing record.
   *
   * @type {String}
   */
  get recordID() {
    return this._recordID;
  }

  /**
   * Deserializes Reference from a JSON object.
   *
   * @param {Object} obj - the JSON object
   *
   * @return {Reference} a record reference
   */
  static fromJSON(obj) {
    if (obj.$recordType && obj.$recordID) {
      return new Reference(obj.$recordType, obj.$recordID);
    }

    if (obj.$id) {
      return new Reference(obj.$id);
    }

    throw new Error('Fail to deserialize a record reference');
  }

  /**
   * Serializes Reference to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    return {
      $id: this.id,
      $recordType: this.recordType,
      $recordID: this.recordID,
      $type: 'ref'
    };
  }
}
