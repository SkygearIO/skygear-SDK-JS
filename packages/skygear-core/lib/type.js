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

/**
 * Sequence
 *
 * A model representing a auto-incrementing sequence in Skygear record.
 */
export class Sequence {

  /**
   * Constructs a new Sequence object.
   */
  constructor() {
  }

  /**
   * Serializes Sequence to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    return {
      $type: 'seq'
    };
  }

}

/**
 * UnknownValue
 *
 * A model representing an unknown type of value in Skygear record.
 */
export class UnknownValue {

  /**
   * Constructs a new UnknownValue object.
   *
   * @param {String} underlyingType - underlying type of the value
   */
  constructor(underlyingType) {
    this.underlyingType = underlyingType;
  }

  /**
   * Serializes UnknownValue to a JSON object.
   *
   * @return {Object} the JSON object
   */
  toJSON() {
    return {
      $type: 'unknown',
      $underlying_type: this.underlyingType //eslint-disable-line camelcase
    };
  }

  /**
   * Constructs a new UnknownValue object from JSON object.
   *
   * @param {Object} attrs - the JSON object
   * @param {String} attrs.$underlying_type - underlying type of the value
   */
  static fromJSON(attrs) {
    return new UnknownValue(attrs.$underlying_type);
  }

}
