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
import xml2js from 'xml2js';

import Cache from './cache';
import Asset, {isAsset} from './asset';
import Record, { isRecord } from './record'; // eslint-disable-line no-unused-vars
import Query from './query';
import QueryResult from './query_result';
import {isValueType} from './util';
import { ErrorCodes, SkygearError } from './error';
import ACL from './acl'; // eslint-disable-line no-unused-vars
import Container from './container'; // eslint-disable-line no-unused-vars
import Role from './role'; // eslint-disable-line no-unused-vars
import {Store} from './store'; // eslint-disable-line no-unused-vars

export class Database {

  /**
   * Creates a Skygear database.
   *
   * @param  {String} dbID - database ID
   * @param  {Container} container - Skygear Container
   * @return {Database}
   */
  constructor(dbID, container) {
    if (dbID !== '_public' && dbID !== '_private' && dbID !== '_union') {
      throw new Error('Invalid database_id');
    }

    /**
     * The database ID
     * @type {String}
     */
    this.dbID = dbID;

    /**
     * @private
     */
    this.container = container;
    this._cacheStore = new Cache(this.dbID, this.container.store);
    this._cacheResponse = true;
  }

  /**
   * Fetches a single record with the specified ID.
   *
   * The fetch will be performed asynchronously and the returned
   * promise will be resolved when the record is found.
   *
   * @param  {String} recordType - record Type
   * @param  {String} recordID - record ID
   *
   * @return {Promise<Record>} promise with the fetched Record
   */
  async fetchRecordByID(recordType, recordID) {
    const RecordCls = this._Record.extend(recordType);
    const query = new Query(RecordCls).equalTo('_id', recordID);
    const records = await this.query(query);
    if (records.length === 1) {
      return records[0];
    } else {
      throw new SkygearError(
        `Cannot find ${recordType} record with ID ${recordID}`,
        ErrorCodes.ResourceNotFound
      );
    }
  }

  /**
   * Fetches records with the specified IDs.
   *
   * The fetch will be performed asynchronously and the returned
   * promise will be resolved when the operation completes.
   *
   * @typedef {Record | Error} FetchResult
   *
   * @param  {String} recordType - record Type
   * @param  {String} recordIDs - record ID
   *
   * @return {Promise<FetchResult[]>} promise with the fetch results
   */
  async fetchRecordsByID(recordType, recordIDs) {
    const RecordCls = this._Record.extend(recordType);
    const query = new Query(RecordCls).contains('_id', recordIDs);
    const records = await this.query(query);

    const fetchedRecordMap = _.reduce(
      records,
      (acc, eachRecord) => {
        return {
          ...acc,
          [eachRecord.recordID]: eachRecord
        };
      },
      {}
    );

    const fetchResult = _.map(
      recordIDs,
      eachRecordID =>
        fetchedRecordMap[eachRecordID] ||
        new SkygearError(
          `Cannot find ${recordType} record with ID ${eachRecordID}`,
          ErrorCodes.ResourceNotFound
        )
    );

    return fetchResult;
  }

  /**
   * Fetches records that match the Query from Skygear.
   *
   * Use this method to fetch records from Skygear by specifying a Query.
   * The fetch will be performed asynchronously and the returned promise will
   * be resolved when the operation completes.
   *
   * If cacheCallback is provided, the SDK would try to fetch result of the
   * query from local cache, before issuing query request to the server, and
   * trigger the cacheCallback function if cached result is found.
   *
   * @param  {Query} query
   * @param  {function(queryResult:QueryResult,isCached:boolean)} cacheCallback
   * @return {Promise<QueryResult>} promise with the QueryResult
   */
  async query(query, cacheCallback = false) {
    let remoteReturned = false;
    let cacheStore = this.cacheStore;
    let Cls = query.recordCls;
    let queryJSON = query.toJSON();

    if (!queryJSON.offset && queryJSON.page > 0) {
      queryJSON.offset = queryJSON.limit * (queryJSON.page - 1);
    }

    let payload = _.assign({
      database_id: this.dbID //eslint-disable-line
    }, queryJSON);

    if (cacheCallback) {
      (async () => {
        try {
          const body = await cacheStore.get(query.hash);
          if (remoteReturned) {
            return;
          }
          let records = _.map(body.result, function (attrs) {
            return new Cls(attrs);
          });
          let result = QueryResult.createFromResult(records, body.info);
          cacheCallback(result, true);
        } catch (err) {
          console.log('No cache found', err);
        }
      })();
    }

    const body = await this.container.makeRequest('record:query', payload);
    let records = _.map(body.result, function (attrs) {
      return new Cls(attrs);
    });
    let result = QueryResult.createFromResult(records, body.info);
    remoteReturned = true;
    if (this.cacheResponse) {
      await cacheStore.set(query.hash, body);
    }
    return result;
  }

  /**
   * Presave a single value.
   *
   * A single value is the smallest unit of object to presave. In other words,
   * a single value does not contain smaller values to presave.
   *
   * This function returns a promise that may perform other operations, such
   * as calling the server to upload asset.
   */
  async _presaveSingleValue(value) {
    if (isAsset(value) && value.file) {
      return this.uploadAsset(value);
    } else {
      return value;
    }
  }

  /**
   * Presave a value as part of a key-value object.
   *
   * This function differs from _presave in that it returns the key of the
   * parent object that is being presaved. This helps constructs the object
   * after resolving all promises.
   */
  async _presaveKeyValue(fn, key, value) {
    const v = await this._presave(fn, value);
    return [key, v];
  }

  /**
   * Presave a value.
   *
   * If the value contains other objects that can be presaved, it will
   * iterates each member and create a promise for such object. Essentially this
   * function creates a tree of promises that resembles the object tree.
   */
  async _presave(fn, value) {
    if (value === undefined || value === null) {
      return value;
    } else if (_.isArray(value)) {
      return Promise.all(_.map(value, this._presave.bind(this, fn)));
    } else if (isRecord(value)) {
      const record = value;
      let tasks = _.map(record, (v, k) => {
        return this._presaveKeyValue(fn, k, v);
      });
      const keyvalues = await Promise.all(tasks);
      _.each(keyvalues, ([k, v]) => {
        record[k] = v;
      });
      return record;
    } else if (isValueType(value) || !_.isObject(value)) {
      // The value does not contain other objects that can be presaved.
      // Call _presaveSingleValue to create the actual promise which performs
      // other operations, such as upload asset.
      return fn(value);
    } else {
      const obj = value;
      let tasks = _.chain(obj)
        .keys()
        .map((key) => this._presaveKeyValue(fn, key, obj[key]))
        .value();
      const keyvalues = await Promise.all(tasks);
      _.each(keyvalues, ([k, v]) => {
        obj[k] = v;
      });
      return obj;
    }
  }

  /**
   * @private
   */
  _checkRecordsToSave(records) {
    if (_.some(records, r => r === undefined || r === null)) {
      throw new SkygearError(
        'Invalid input, unable to save undefined and null',
        ErrorCodes.InvalidArgument
      );
    }
  }

  /**
   * @private
   */
  async _save(records, atomic = true) {
    this._checkRecordsToSave(records);

    const processedRecords = await this._presave(
      this._presaveSingleValue.bind(this),
      records
    );

    const payloadRecords = _.map(
      processedRecords,
      eachRecord => eachRecord.toTruncatedJSON()
    );

    const payload = {
      database_id: this.dbID, //eslint-disable-line
      records: payloadRecords,
      atomic: atomic
    };

    return await this.container.makeRequest('record:save', payload);
  }

  /**
   * Saves a record to Skygear.
   *
   * @param {Record} record the record to save
   * @return {Promise<Record>} promise of saved record
   */
  async saveRecord(record) {
    let body;
    try {
      body = await this._save([record]);
    } catch (e) {
      if (e.code !== ErrorCodes.AtomicOperationFailure) {
        throw e;
      }
      const atomicError = e;
      const deprecatedID = [record.recordType, record.recordID].join('/');
      const errorInfo = atomicError.info[deprecatedID];
      throw SkygearError.fromJSON(errorInfo);
    }

    return this._Record.fromJSON(body.result[0]);
  }

  /**
   * Saves records to Skygear atomically.
   *
   * @param {Record[]} records the records to save
   * @return {Promise<Record[]>} promise of saved records
   */
  async saveRecords(records) {
    const body = await this._save(records);
    const savedRecords = _.map(
      body.result,
      eachResult => this._Record.fromJSON(eachResult)
    );
    return savedRecords;
  }

  /**
   * Saves records to Skygear non-atomically.
   *
   * @typedef {Record | Error} NonAtomicSaveResult
   *
   * @param {Record[]} records the records to save
   * @return {Promise<NonAtomicSaveResult[]>} promise of non-atomic save results
   */
  async saveRecordsNonAtomically(records) {
    const body = await this._save(records, false);
    const saveResult = _.map(
      body.result,
      eachResult => {
        const eachResultType = eachResult._type;
        if (eachResultType === 'record') {
          return this._Record.fromJSON(eachResult);
        }

        if (eachResultType === 'error') {
          return SkygearError.fromJSON(eachResult);
        }

        throw new SkygearError(`Unknown result type ${eachResultType}`);
      }
    );
    return saveResult;
  }

  /**
   * @private
   */
  async _deleteByIDs(type, ids, atomic = true) {
    const deprecatedIDs = _.map(
      ids,
      eachID => [type, eachID].join('/')
    );
    const recordIdentifiers = _.map(
      ids,
      eachID => ({
        _id: [type, eachID].join('/'),
        _recordType: type,
        _recordID: eachID
      })
    );
    const payload = {
      database_id: this.dbID, //eslint-disable-line
      records: recordIdentifiers,
      ids: deprecatedIDs,
      atomic
    };

    return await this.container.makeRequest('record:delete', payload);
  }

  /**
   * @private
   */
  async _delete(records, atomic = true) {
    const deprecatedIDs = _.map(
      records,
      perRecord => [perRecord.recordType, perRecord.recordID].join('/')
    );
    const recordIdentifiers = _.map(records, perRecord => ({
      _recordType: perRecord.recordType,
      _recordID: perRecord.recordID
    }));
    const payload = {
      database_id: this.dbID, //eslint-disable-line
      records: recordIdentifiers,
      ids: deprecatedIDs,
      atomic
    };

    return await this.container.makeRequest('record:delete', payload);
  }

  /**
   * Delete a record specified by the type and the ID
   *
   * @param {String} type - the record type
   * @param {String} id - the record ID
   * @return {Promise<String>} a promise of the deleted record ID
   */
  async deleteRecordByID(type, id) {
    let body;
    try {
      body = await this._deleteByIDs(type, [id]);
    } catch (atomicError) {
      const deprecatedID = [type, id].join('/');
      const errorInfo = atomicError.info[deprecatedID];
      throw SkygearError.fromJSON(errorInfo);
    }

    const result = body.result[0];
    return result._recordID || this._Record.parseDeprecatedID(result._id)[1];
  }

  /**
   * Delete records specified by the type and their IDs
   *
   * This method deletes records in the same type. To delete records in
   * multiple types, try to use {@link Database#deleteRecords}
   *
   * @param {String} type - the type of the records
   * @param {String[]} ids - the IDs of the records
   * @return {Promise<String[]>} a promise of the deleted record IDs
   */
  async deleteRecordsByID(type, ids) {
    const body = await this._deleteByIDs(type, ids);
    const resultIDs = _.map(
      body.result,
      (eachResult) =>
        eachResult._recordID ||
        this._Record.parseDeprecatedID(eachResult._id)[1]
    );
    return resultIDs;
  }

  /**
   * Delete a record from Skygear
   *
   * After deleting a record, the return one would have the property
   * `deleted` set to `true`.
   *
   * @param {Record} record - the record
   * @return {Promise<Record>} a promise of the deleted record
   */
  async deleteRecord(record) {
    let body;
    try {
      body = await this._delete([record]);
    } catch (atomicError) {
      const deprecatedID = [record.recordType, record.recordID].join('/');
      const errorInfo = atomicError.info[deprecatedID];
      throw SkygearError.fromJSON(errorInfo);
    }

    const result = body.result[0];
    if (
      !record._recordType &&
      !record._recordID &&
      !record._id
    ) {
      throw new SkygearError('Received malformed server response');
    }

    let foundRecord;

    if (
        result._recordType === record.recordType &&
        result._recordID === record.recordID ||
        result._id === [record.recordType, record.recordID].join('/')
    ) {
      foundRecord = record;
    }

    if (!foundRecord) {
      throw new SkygearError('Received unknown record');
    }

    return this._Record.fromJSON({
      ...foundRecord.toJSON(),
      _deleted: true
    });
  }

  /**
   * Delete records from Skygear
   *
   * After deleting the records, the return ones would have the property
   * `deleted` set to `true`.
   *
   * @param {Record[] | QueryResult} records - the records
   * @return {Promise<Record[]>} a promise of the deleted records
   */
  async deleteRecords(records) {
    const recordMap = _.reduce(
      records,
      (acc, eachRecord) => {
        const deprecatedID = [
          eachRecord.recordType,
          eachRecord.recordID
        ].join('/');

        acc[deprecatedID] = eachRecord;
        return acc;
      },
      {}
    );
    const body = await this._delete(records);
    const resultRecords = _.map(
      body.result,
      eachResult => {
        let foundRecord;
        if (eachResult._recordType && eachResult._recordID) {
          const deprecatedID = [
            eachResult._recordType,
            eachResult._recordID
          ].join('/');

          foundRecord = recordMap[deprecatedID];
        } else if (eachResult._id) {
          foundRecord = recordMap[eachResult._id];
        } else {
          throw new SkygearError('Received malformed server response');
        }

        if (!foundRecord) {
          throw new SkygearError('Received unknown record');
        }

        return this._Record.fromJSON({
          ...foundRecord.toJSON(),
          _deleted: true
        });
      }
    );

    return resultRecords;
  }

  /**
   * Delete records specified by the type and their IDs non-atomicallly
   *
   * @typedef {String | Error} NonAtomicDeleteByIDResult
   *
   * @param {String} type - the type of the records
   * @param {String[]} id - the IDs of the records
   * @return {Promise<NonAtomicDeleteByIDResult[]>} a promise of the deletion result
   */
  async deleteRecordsByIDNonAtomically(type, ids) {
    const body = await this._deleteByIDs(type, ids, false);
    const deletionResult = _.map(
      body.result,
      eachResult => {
        const eachResultType = eachResult._type;
        if (eachResultType === 'record') {
          return (
            eachResult._recordID ||
            this._Record.parseDeprecatedID(eachResult._id)[1]
          );
        }

        if (eachResultType === 'error') {
          return SkygearError.fromJSON(eachResult);
        }

        throw new SkygearError(`Unknown result type ${eachResultType}`);
      }
    );
    return deletionResult;
  }

  /**
   * Delete records from Skygear non-atomicallly
   *
   * After deleting the records, the return ones would have the property
   * `deleted` set to `true`.
   *
   * @typedef {Record | Error} NonAtomicDeleteResult
   *
   * @param {Record[] | QueryResult} records - the records
   * @return {Promise<NonAtomicDeleteResult[]>} a promise of the deletion result
   */
  async deleteRecordsNonAtomically(records) {
    const recordMap = _.reduce(
      records,
      (acc, eachRecord) => {
        const deprecatedID = [
          eachRecord.recordType,
          eachRecord.recordID
        ].join('/');

        acc[deprecatedID] = eachRecord;
        return acc;
      },
      {}
    );

    const body = await this._delete(records, false);
    const deletionResult = _.map(
      body.result,
      eachResult => {
        const eachResultType = eachResult._type;
        if (eachResultType === 'record') {
          let foundRecord;
          if (eachResult._recordType && eachResult._recordID) {
            const deprecatedID = [
              eachResult._recordType,
              eachResult._recordID
            ].join('/');

            foundRecord = recordMap[deprecatedID];
          } else if (eachResult._id) {
            foundRecord = recordMap[eachResult._id];
          } else {
            throw new SkygearError('Received malformed server response');
          }

          if (!foundRecord) {
            return new SkygearError('Received unknown record');
          }

          return this._Record.fromJSON({
            ...foundRecord.toJSON(),
            _deleted: true
          });
        }

        if (eachResultType === 'error') {
          return SkygearError.fromJSON(eachResult);
        }

        throw new SkygearError(`Unknown result type ${eachResultType}`);
      }
    );
    return deletionResult;
  }

  /**
   * @type {Store}
   */
  get cacheStore() {
    return this._cacheStore;
  }

  /**
   * Indicating if query result should be cached locally
   *
   * @type {boolean}
   */
  get cacheResponse() {
    return this._cacheResponse;
  }

  /**
   * Indicating if query result should be cached locally
   *
   * @type {boolean}
   */
  set cacheResponse(value) {
    const b = !!value;
    this._cacheResponse = b;
  }

  get _Record() {
    return this.container.Record;
  }

  /**
   * Uploads asset to Skygear server.
   *
   * @param  {Asset} asset - the asset
   * @return {Promise<Asset>} promise
   */
  uploadAsset(asset) {
    return makeUploadAssetRequest(this.container, asset);
  }
}

export class PublicDatabase extends Database {

  /**
   * The default ACL of a newly created record
   *
   * @type {ACL}
   */
  get defaultACL() {
    return this._Record.defaultACL;
  }

  /**
   * Sets default ACL of a newly created record.
   *
   * @param {ACL} acl - the default acl
   */
  setDefaultACL(acl) {
    this._Record.defaultACL = acl;
  }

  /**
   * Sets the roles that are allowed to create records of a record type.
   *
   * @param {Class} recordClass - the record class created with
   * {@link Record.extend}
   * @param {Role[]} roles - the roles
   * @return {Promise} promise
   */
  async setRecordCreateAccess(recordClass, roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    const body = await this.container.makeRequest('schema:access', {
      type: recordClass.recordType,
      create_roles: roleNames //eslint-disable-line camelcase
    });
    return body.result;
  }

  /**
   * Sets the default ACL of a newly created record of a record type.
   *
   * @param {Class} recordClass - the record class created with
   * {@link Record.extend}
   * @param {ACL} acl - the default acl
   * @return {Promise} promise
   */
  async setRecordDefaultAccess(recordClass, acl) {
    const body = await this.container.makeRequest('schema:default_access', {
      type: recordClass.recordType,
      default_access: acl.toJSON() //eslint-disable-line camelcase
    });
    return body.result;
  }

}

/**
 * @private
 */
export class DatabaseContainer {

  /**
   * Creates a DatabaseContainer.
   *
   * @param  {Container} container - the Skygear container
   */
  constructor(container) {
    /**
     * @private
     */
    this.container = container;

    this._public = null;
    this._private = null;
    this._cacheResponse = true;
  }

  /**
   * @type {PublicDatabase}
   */
  get public() {
    if (this._public === null) {
      this._public = new PublicDatabase('_public', this.container);
      this._public.cacheResponse = this._cacheResponse;
    }
    return this._public;
  }

  /**
   * Private database of the current user
   *
   * @type {Database}
   */
  get private() {
    if (this.container.accessToken === null) {
      throw new Error('You must login before access to privateDB');
    }
    if (this._private === null) {
      this._private = new Database('_private', this.container);
      this._private.cacheResponse = this._cacheResponse;
    }
    return this._private;
  }

  /**
   * Uploads asset to Skygear server.
   *
   * @deprecated use Database.uploadAsset instead.
   *
   * @param  {Asset} asset - the asset
   * @return {Promise<Asset>} promise
   */
  async uploadAsset(asset) {
    return this.public.uploadAsset(asset);
  }

  /**
   * True if the database cache result from response
   *
   * @type {Boolean}
   */
  get cacheResponse() {
    return this._cacheResponse;
  }

  /**
   * True if the database cache result from response
   *
   * @type {Boolean}
   */
  set cacheResponse(value) {
    const b = !!value;
    this._cacheResponse = b;
    if (this._public) {
      this._public.cacheResponse = b;
    }
    if (this._private) {
      this._private.cacheResponse = b;
    }
  }

}

async function makeUploadAssetRequest(container, asset) {
  const res = await container.makeRequest('asset:put', {
    filename: asset.name,
    'content-type': asset.contentType,
    // asset.file.size for File and Blob
    // asset.file.byteLength for Buffer
    'content-size': asset.file.size || asset.file.byteLength
  });

  const newAsset = Asset.fromJSON(res.result.asset);
  const postRequest = res.result['post-request'];

  let postUrl = postRequest.action;
  if (postUrl.indexOf('/') === 0) {
    postUrl = postUrl.substring(1);
  }
  if (postUrl.indexOf('http') !== 0) {
    postUrl = container.url + postUrl;
  }

  await new Promise((resolve, reject) => {
    let _request = container.request
      .post(postUrl)
      .set('X-Skygear-API-Key', container.apiKey);
    if (postRequest['extra-fields']) {
      _.forEach(postRequest['extra-fields'], (value, key) => {
        _request = _request.field(key, value);
      });
    }

    if (asset.file instanceof Buffer) {
      // need providing file name to buffer
      _request = _request.attach('file', asset.file, asset.name);
    } else {
      _request = _request.attach('file', asset.file);
    }

    _request.end(async (err) => {
      if (err) {
        try {
          const [code, message] = await parseS3XmlErrorMessage(err);
          reject(_s3ErrorToSkyError(code, message));
        } catch (_err) {
          reject(err);
        }

        return;
      }

      resolve();
    });
  });
  return newAsset;
}


/**
 * Best effort to parse s3 error code and message.
 * If success, resolve with [code, message].
 */
async function parseS3XmlErrorMessage(error) {
  if (!error.response || !error.response.text) {
    throw new Error('Unable to get response text');
  }

  return new Promise((resolve, reject) => {
    xml2js.parseString(error.response.text, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      // this is where s3 place the error
      if (result.Error &&
          result.Error.Code && result.Error.Code[0] &&
          result.Error.Message && result.Error.Message[0]) {
        resolve([result.Error.Code[0], result.Error.Message[0]]);
        return;
      }

      reject(new Error('Malformed S3 response error'));
    });
  });
}

function _s3ErrorToSkyError(code, message) {
  const codeMap = {
    EntityTooLarge: ErrorCodes.AssetSizeTooLarge
  };

  return new SkygearError(message, codeMap[code] || ErrorCodes.UnexpectedError);
}
