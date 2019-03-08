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

/**
 * Enum for error codes
 * @readonly
 * @enum {number}
 */
export const ErrorCodes = {
  UnknownError: 1,
  NetworkFailure: 5,
  RequestTimedOut: 12,

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
  ResponseTimeout: 122,
  DeniedArgument: 123,
  RecordQueryDenied: 124,
  NotConfigured: 125,
  PasswordPolicyViolated: 126,
  UserDisabled: 127,
  VerificationRequired: 128,
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
    this.innerError = null;
  }

  /**
   * Description of the error
   *
   * @return {String} description
   */
  toString() {
    return `SkygearError: ${this.message}`;
  }

  /**
   * Description of the error code of the error
   *
   * @return {String} description
   */
  /* eslint-disable complexity */
  toLocaleString() {
    switch (this.code) {
    case ErrorCodes.NotAuthenticated:
      return 'You have to be authenticated to perform this operation.';
    case ErrorCodes.PermissionDenied:
    case ErrorCodes.AccessKeyNotAccepted:
    case ErrorCodes.AccessTokenNotAccepted:
      return 'You are not allowed to perform this operation.';
    case ErrorCodes.InvalidCredentials:
      return 'You are not allowed to log in because '
        + 'the credentials you provided are not valid.';
    case ErrorCodes.InvalidSignature:
    case ErrorCodes.BadRequest:
      return 'The server is unable to process the request.';
    case ErrorCodes.InvalidArgument:
      return 'The server is unable to process the data.';
    case ErrorCodes.Duplicated:
      return 'This request contains duplicate of an existing '
        + 'resource on the server.';
    case ErrorCodes.ResourceNotFound:
      return 'The requested resource is not found.';
    case ErrorCodes.NotSupported:
      return 'This operation is not supported.';
    case ErrorCodes.NotImplemented:
      return 'This operation is not implemented.';
    case ErrorCodes.ConstraintViolated:
    case ErrorCodes.IncompatibleSchema:
    case ErrorCodes.AtomicOperationFailure:
    case ErrorCodes.PartialOperationFailure:
      return 'A problem occurred while processing this request.';
    case ErrorCodes.UndefinedOperation:
      return 'The requested operation is not available.';
    case ErrorCodes.PluginInitializing:
    case ErrorCodes.PluginUnavailable:
      return 'The server is not ready yet.';
    case ErrorCodes.PluginTimeout:
      return 'The server took too long to process.';
    case ErrorCodes.RecordQueryInvalid:
      return 'A problem occurred while processing this request.';
    case ErrorCodes.ResponseTimeout:
      return 'The server timed out while processing the request.';
    case ErrorCodes.DeniedArgument:
      return 'The server is unable to process the data.';
    case ErrorCodes.RecordQueryDenied:
      return 'You are not allowed to perform this operation.';
    case ErrorCodes.NotConfigured:
      return 'The server is not configured for this operation.';
    case ErrorCodes.PasswordPolicyViolated:
      return 'The password does not meet policy requirement.';
    case ErrorCodes.UserDisabled:
      if (this.info && this.info.message) {
        return 'The user is disabled: ${this.info.message}';
      } else {
        return 'The user is disabled.';
      }
    default:
      return 'An unexpected error has occurred.';
    }
  }
  /* eslint-enable complexity */

  /**
   * Serializes SkyearError to a JSON object.
   *
   * @return {Object} the JSON object
   */
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

  /**
   * Constructs a new SkyearError object from JSON object.
   *
   * @param {Object} attrs - the JSON object
   * @param {String} attrs.message - an error message
   * @param {Number} [attrs.code] - a code for the error condition
   * @param {Object} [attrs.info] - more information about the error
   * @return {SkygearError} the created SkyearError object
   */
  static fromJSON(attrs) {
    const skyErr = new SkygearError(
      attrs.message,
      attrs.code || ErrorCodes.UnexpectedError,
      attrs.info || null
    );
    skyErr._name = attrs.name;
    return skyErr;
  }

  get name() {
    return this._name || codeToString(this.code);
  }
}
