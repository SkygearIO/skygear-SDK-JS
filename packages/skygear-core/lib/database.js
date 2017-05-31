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
import Record from './record';
import Query from './query';
import QueryResult from './query_result';

export default class Database {

  constructor(dbID, container) {
    if (dbID !== '_public' && dbID !== '_private' && dbID !== '_union') {
      throw new Error('Invalid database_id');
    }
    this.dbID = dbID;
    this.container = container;
    this._cacheStore = new Cache(this.dbID);
    this._cacheResponse = true;
  }

  getRecordByID(id) {
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
    return this.container.makeRequest('record:query', payload).then((body)=> {
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
      return this.container.makeUploadAssetRequest(asset)
        .then((a)=> [key, a]);
    } else {
      return Promise.resolve([key, asset]);
    }
  }

  _presave(record) {
    // for every (key, value) pair, process the pair in a Promise
    // the Promise should be resolved by the transformed [key, value] pair
    let tasks = _.map(record, (value, key)=> {
      if (value instanceof Asset) {
        return this._presaveAssetTask(key, value);
      } else {
        return Promise.resolve([key, value]);
      }
    });

    return Promise.all(tasks).then((keyvalues)=> {
      _.each(keyvalues, ([key, value])=> {
        record[key] = value;
      });
      return record;
    });
  }

  del(record) {
    return this.delete(record);
  }

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
    .then((processedRecords)=> {
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
    }).then((body)=> {
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

  delete(_records) {
    let records = _records;
    if (!_.isArray(records)) {
      records = [records];
    }

    let ids = _.map(records, perRecord => perRecord.id);
    let payload = {
      database_id: this.dbID, //eslint-disable-line
      ids: ids
    };

    return this.container.makeRequest('record:delete', payload)
      .then((body)=> {
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

  get cacheStore() {
    return this._cacheStore;
  }

  get cacheResponse() {
    return this._cacheResponse;
  }

  set cacheResponse(value) {
    const b = !!value;
    this._cacheResponse = b;
  }

}
