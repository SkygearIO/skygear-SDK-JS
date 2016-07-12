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
import QueryResult from './query_result';

export default class Database {

  constructor(dbID, container) {
    if (dbID !== '_public' && dbID !== '_private') {
      throw new Error('Invalid database_id');
    }
    this.dbID = dbID;
    this.container = container;
    this._cacheStore = new Cache(this.dbID);
  }

  query(query, cacheCallback = false) {
    let remoteReturned = false;
    let cacheStore = this.cacheStore;
    let Cls = query.recordCls;
    let payload = _.assign({
      database_id: this.dbID //eslint-disable-line
    }, query.toJSON());
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
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('record:query', payload).then(function (body) {
        let records = _.map(body.result, function (attrs) {
          return new Cls(attrs);
        });
        let result = QueryResult.createFromResult(records, body.info);
        remoteReturned = true;
        cacheStore.set(query.hash, body);
        resolve(result);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
  }

  _presaveAssetTask(key, asset) {
    if (asset.file) {
      return new Promise(function (resolve, reject) {
        this.container.makeUploadAssetRequest(asset).then(function (a) {
          resolve([key, a]);
        }, function (err) {
          reject(err);
        });
      }.bind(this));
    } else {
      return Promise.resolve([key, asset]);
    }
  }

  _presave(record) {
    let self = this;

    return new Promise(function (resolve, reject) {
      // for every (key, value) pair, process the pair in a Promise
      // the Promise should be resolved by the transformed [key, value] pair
      let tasks = _.map(record, function (value, key) {
        if (value instanceof Asset) {
          return self._presaveAssetTask(key, value);
        } else {
          return Promise.resolve([key, value]);
        }
      });

      Promise.all(tasks).then(function (keyvalues) {
        _.each(keyvalues, function ([key, value]) {
          record[key] = value;
        });
        resolve(record);
      }, function (err) {
        reject(err);
      });
    });
  }

  del(record) {
    return this.delete(record);
  }

  save(_records) {
    let self = this;

    let records = _records;
    if (!_.isArray(records)) {
      records = [records];
    }

    return new Promise(function (resolve, reject) {
      _.map(records, function (r) {
        if (r === undefined || r === null) {
          reject('Invalid input, unable to save undefined and null');
        }
      });

      const presaveTasks = _.map(records, self._presave.bind(self));
      Promise.all(presaveTasks)
      .then(function (processedRecords) {
        let payload = {
          database_id: self.dbID //eslint-disable-line
        };

        payload.records = _.map(processedRecords, (perRecord) => {
          return perRecord.toJSON();
        });

        return self.container.makeRequest('record:save', payload);
      }).then(function (body) {
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
            reject(errors[0]);
          } else {
            resolve(savedRecords[0]);
          }
        } else {
          resolve({savedRecords, errors});
        }
      }, function (err) {
        reject(err);
      }).catch(function (err) {
        reject(err);
      });
    });
  }

  delete(_records) {
    let self = this;

    let records = _records;
    if (!_.isArray(records)) {
      records = [records];
    }

    let ids = _.map(records, perRecord => perRecord.id);
    let payload = {
      database_id: this.dbID, //eslint-disable-line
      ids: ids
    };

    return new Promise(function (resolve, reject) {
      self.container.makeRequest('record:delete', payload)
      .then(function (body) {
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
            reject(errors[0]);
          } else {
            resolve();
          }
        } else {
          resolve(errors);
        }
      }, function (err) {
        reject(err);
      });
    });
  }

  get cacheStore() {
    return this._cacheStore;
  }

  clearCache() {
    return this._cacheStore.reset();
  }

}
