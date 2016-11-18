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
import _ from 'lodash';

export const ErrorCodes = {
  NotAuthenticated: 101,
  PermissionDenied: 102,
  AccessKeyNotAccepted: 103,
  AccessTokenNotAccepted: 104,
  InvalidCredentials: 105,
  InvalidSignature: 106,
  BadRequest: 107,
  InvalidArgument: 108,
  Duplicated: 109,
  ResourceNotFound: 110,
  NotSupported: 111,
  NotImplemented: 112,
  ConstraintViolated: 113,
  IncompatibleSchema: 114,
  AtomicOperationFailure: 115,
  PartialOperationFailure: 116,
  UndefinedOperation: 117,
  PluginUnavailable: 118,
  PluginTimeout: 119,
  RecordQueryInvalid: 120,
  PluginInitializing: 121,
  UnexpectedError: 10000
};

function codeToString(code) {
  return _.findKey(ErrorCodes, function (value) {
    return code === value;
  });
}

/**
 * SkygearError is an error object containing information of an error
 * occurred.
 *
 * @example
 * let err = new SkygearError(
 *   'Unable to parse data',
 *   UnexpectedError,
 *   { content: 'BADDATA' }
 * );
 */
export class SkygearError extends Error {
  /**
   * Creates a SkygearError.
   * @param {string} message - an error message
   * @param {number} code - a code for the error condition
   * @param {Object} info - more information about the error
   */
  constructor(message, code, info) {
    super(message);
    this.message = message;
    this.code = code || ErrorCodes.UnexpectedError;
    this.info = info || null;
  }

  toString() {
    return `SkygearError: ${this.message}`;
  }

  toJSON() {
    const result = {
      name: codeToString(this.code),
      code: this.code,
      message: this.message
    };
    if (this.info) {
      result.info = this.info;
    }
    return result;
  }

  static fromJSON(attrs) {
    return new SkygearError(
      attrs.message,
      attrs.code || ErrorCodes.UnexpectedError,
      attrs.info || null
    );
  }
}
