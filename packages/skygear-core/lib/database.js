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
const _ = require('lodash');

import Cache from './cache';
import Asset, {isAsset} from './asset';
import {isRecord} from './record';
import Query from './query';
import QueryResult from './query_result';
import {isValueType} from './util';

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
   * Fetches a single record with the specified id from Skygear.
   *
   * Use this method to fetch a single record from Skygear by specifying a
   * record ID in the format of `type/id`. The fetch will be performed
   * asynchronously and the returned promise will be resolved when the
   * operation completes.
   *
   * @param  {String} id - record ID with format `type/id`
   * @return {Promise<Record>} promise with the fetched Record
   */
  getRecordByID(id) {
    let Record = this._Record;
    let [recordType, recordId] = Record.parseID(id);
    let query = new Query(Record.extend(recordType)).equalTo('_id', recordId);
    return this.query(query).then((users) => {
      if (users.length === 1) {
        return users[0];
      } else {
        throw new Error(id + ' does not exist');
      }
    });
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
  query(query, cacheCallback = false) {
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
      cacheStore.get(query.hash).then(function (body) {
        if (remoteReturned) {
          return;
        }
        let records = _.map(body.result, function (attrs) {
          return new Cls(attrs);
        });
        let result = QueryResult.createFromResult(records, body.info);
        cacheCallback(result, true);
      }, function (err) {
        console.log('No cache found', err);
      });
    }
    return this.container.makeRequest('record:query', payload).then((body) => {
      let records = _.map(body.result, function (attrs) {
        return new Cls(attrs);
      });
      let result = QueryResult.createFromResult(records, body.info);
      remoteReturned = true;
      if (this.cacheResponse) {
        cacheStore.set(query.hash, body);
      }
      return result;
    });
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
  _presaveSingleValue(value) {
    if (isAsset(value) && value.file) {
      return makeUploadAssetRequest(this.container, value);
    } else {
      return Promise.resolve(value);
    }
  }

  /**
   * Presave a value as part of a key-value object.
   *
   * This function differs from _presave in that it returns the key of the
   * parent object that is being presaved. This helps constructs the object
   * after resolving all promises.
   */
  _presaveKeyValue(fn, key, value) {
    return this._presave(fn, value)
      .then((v) => [key, v]);
  }

  /**
   * Presave a value.
   *
   * If the value contains other objects that can be presaved, it will
   * iterates each member and create a promise for such object. Essentially this
   * function creates a tree of promises that resembles the object tree.
   */
  _presave(fn, value) {
    if (value === undefined || value === null) {
      return Promise.resolve(value);
    } else if (_.isArray(value)) {
      return Promise.all(_.map(value, this._presave.bind(this, fn)));
    } else if (isRecord(value)) {
      const record = value;
      let tasks = _.map(record, (v, k) => {
        return this._presaveKeyValue(fn, k, v);
      });
      return Promise.all(tasks).then((keyvalues) => {
        _.each(keyvalues, ([k, v]) => {
          record[k] = v;
        });
        return record;
      });
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
      return Promise.all(tasks).then((keyvalues) => {
        _.each(keyvalues, ([k, v]) => {
          obj[k] = v;
        });
        return obj;
      });
    }
  }

  /**
   * Same as {@link Database#delete}.
   *
   * @param  {Record|Record[]|QueryResult} record - the record(s) to delete
   * @return {Promise<Record>} promise with the delete result
   * @see {@link Database#delete}
   */
  del(record) {
    return this.delete(record);
  }

  /**
   * Saves a record or records to Skygear.
   *
   * Use this method to save a record or records to Skygear.
   * The save will be performed asynchronously and the returned promise will
   * be resolved when the operation completes.
   *
   * New record will be created in the database while existing
   * record will be modified.
   *
   * options.atomic can be set to true, which makes the operation either
   * success or failure, but not partially success.
   *
   * @param {Record|Record[]} _records - the record(s) to save
   * @param {Object} [options={}] options - options for saving the records
   * @param {Boolean} [options.atomic] - true if the save request should be
   * atomic
   * @return {Promise<Record>} promise with saved records
   */
  save(_records, options = {}) {
    let records = _records;
    if (!_.isArray(records)) {
      records = [records];
    }

    if (_.some(records, r => r === undefined || r === null)) {
      return Promise.reject(
        'Invalid input, unable to save undefined and null'
      );
    }

    return this._presave(this._presaveSingleValue.bind(this), records)
    .then((processedRecords) => {
      let payload = {
        database_id: this.dbID //eslint-disable-line
      };

      if (options.atomic) {
        payload.atomic = true;
      }

      payload.records = _.map(processedRecords, (perRecord) => {
        return perRecord.toTruncatedJSON();
      });

      return this.container.makeRequest('record:save', payload);
    }).then((body) => {
      let results = body.result;
      let savedRecords = [];
      let errors = [];

      _.forEach(results, (perResult, idx) => {
        if (perResult._type === 'error') {
          savedRecords[idx] = undefined;
          errors[idx] = perResult;
        } else {
          records[idx].update(perResult);
          records[idx].updateTransient(perResult._transient, true);

          savedRecords[idx] = records[idx];
          errors[idx] = undefined;
        }
      });

      if (records.length === 1) {
        if (errors[0]) {
          return Promise.reject(errors[0]);
        }
        return savedRecords[0];
      }
      return {savedRecords, errors};
    });
  }

  /**
   * Deletes a record or records to Skygear.
   *
   * Use this method to delete a record or records to Skygear.
   * The delete will be performed asynchronously and the returned promise will
   * be resolved when the operation completes.
   *
   * @param  {Record|Record[]|QueryResult} _records - the records to delete
   * @return {Promise} promise
   */
  delete(_records) {
    let records = _records;
    let isQueryResult = records instanceof QueryResult;
    if (!_.isArray(records) && !isQueryResult) {
      records = [records];
    }

    let ids = _.map(records, perRecord => perRecord.id);
    let payload = {
      database_id: this.dbID, //eslint-disable-line
      ids: ids
    };

    return this.container.makeRequest('record:delete', payload)
      .then((body) => {
        let results = body.result;
        let errors = [];

        _.forEach(results, (perResult, idx) => {
          if (perResult._type === 'error') {
            errors[idx] = perResult;
          } else {
            errors[idx] = undefined;
          }
        });

        if (records.length === 1) {
          if (errors[0]) {
            return Promise.reject(errors[0]);
          }
          return;
        }
        return errors;
      });
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
  setRecordCreateAccess(recordClass, roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    return this.container.makeRequest('schema:access', {
      type: recordClass.recordType,
      create_roles: roleNames //eslint-disable-line camelcase
    }).then((body) => body.result);
  }

  /**
   * Sets the default ACL of a newly created record of a record type.
   *
   * @param {Class} recordClass - the record class created with
   * {@link Record.extend}
   * @param {ACL} acl - the default acl
   * @return {Promise} promise
   */
  setRecordDefaultAccess(recordClass, acl) {
    return this.container.makeRequest('schema:default_access', {
      type: recordClass.recordType,
      default_access: acl.toJSON() //eslint-disable-line camelcase
    }).then((body) => body.result);
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
   * @param  {Asset} asset - the asset
   * @return {Promise<Asset>} promise
   */
  uploadAsset(asset) {
    return makeUploadAssetRequest(this.container, asset);
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

function makeUploadAssetRequest(container, asset) {
  return new Promise((resolve, reject) => {
    container.makeRequest('asset:put', {
      filename: asset.name,
      'content-type': asset.contentType,
      // asset.file.size for File and Blob
      // asset.file.byteLength for Buffer
      'content-size': asset.file.size || asset.file.byteLength
    })
    .then((res) => {
      const newAsset = Asset.fromJSON(res.result.asset);
      const postRequest = res.result['post-request'];

      let postUrl = postRequest.action;
      if (postUrl.indexOf('/') === 0) {
        postUrl = postUrl.substring(1);
      }
      if (postUrl.indexOf('http') !== 0) {
        postUrl = container.url + postUrl;
      }

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

      _request.end((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(newAsset);
      });
    }, (err) => {
      reject(err);
    });
  });
}
