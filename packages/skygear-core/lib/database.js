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
import Asset from './asset';
import Query from './query';
import QueryResult from './query_result';

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
    this._cacheStore = new Cache(this.dbID);
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

  _presaveAssetTask(key, asset) {
    if (asset.file) {
      return makeUploadAssetRequest(this.container, asset)
        .then((a) => [key, a]);
    } else {
      return Promise.resolve([key, asset]);
    }
  }

  _presave(record) {
    // for every (key, value) pair, process the pair in a Promise
    // the Promise should be resolved by the transformed [key, value] pair
    let tasks = _.map(record, (value, key) => {
      if (value instanceof Asset) {
        return this._presaveAssetTask(key, value);
      } else {
        return Promise.resolve([key, value]);
      }
    });

    return Promise.all(tasks).then((keyvalues) => {
      _.each(keyvalues, ([key, value]) => {
        record[key] = value;
      });
      return record;
    });
  }

  /**
   * Same as {@link Database#delete}.
   *
   * @param  {Record|Record[]|QueryResult} record - the record(s) to delete
   * @return {Promise<Record>} promise with the delete result
   * @see Database#delete
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

    const presaveTasks = _.map(records, this._presave.bind(this));
    return Promise.all(presaveTasks)
    .then((processedRecords) => {
      let payload = {
        database_id: this.dbID //eslint-disable-line
      };

      if (options.atomic) {
        payload.atomic = true;
      }

      payload.records = _.map(processedRecords, (perRecord) => {
        return perRecord.toJSON();
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

  get defaultACL() {
    return this._Record.defaultACL;
  }

  setDefaultACL(acl) {
    this._Record.defaultACL = acl;
  }

  setRecordCreateAccess(recordClass, roles) {
    let roleNames = _.map(roles, function (perRole) {
      return perRole.name;
    });

    return this.container.makeRequest('schema:access', {
      type: recordClass.recordType,
      create_roles: roleNames //eslint-disable-line camelcase
    }).then((body) => body.result);
  }

  setRecordDefaultAccess(recordClass, acl) {
    return this.container.makeRequest('schema:default_access', {
      type: recordClass.recordType,
      default_access: acl.toJSON() //eslint-disable-line camelcase
    }).then((body) => body.result);
  }

}

export class DatabaseContainer {

  constructor(container) {
    this.container = container;

    this._public = null;
    this._private = null;
    this._cacheResponse = true;
  }

  get public() {
    if (this._public === null) {
      this._public = new PublicDatabase('_public', this.container);
      this._public.cacheResponse = this._cacheResponse;
    }
    return this._public;
  }

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

  uploadAsset(asset) {
    return makeUploadAssetRequest(this.container, asset);
  }

  get cacheResponse() {
    return this._cacheResponse;
  }

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
      'content-size': asset.file.size
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

      _request.attach('file', asset.file).end((err) => {
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
