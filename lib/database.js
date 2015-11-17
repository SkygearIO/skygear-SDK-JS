const _ = require('lodash');

import Asset from './asset';
import QueryResult from './query_result';

export default class Database {

  constructor(dbID, container) {
    if (dbID !== '_public' && dbID !== '_private') {
      throw new Error('Invalid database_id');
    }
    this.dbID = dbID;
    this.container = container;
  }

  query(query) {
    let Cls = query.recordCls;
    let payload = _.assign({
      database_id: this.dbID //eslint-disable-line
    }, query.toJSON());
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('record:query', payload).then(function (body) {
        let records = _.map(body.result, function (attrs) {
          return new Cls(attrs, query._include);
        });
        let result = QueryResult.createFromResult(records, body.info);
        resolve(result);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
  }

  _uploadAssetTask(key, asset) {
    return new Promise(function (resolve, reject) {
      this.container.makeUploadAssetRequest(asset).then(function (a) {
        resolve([key, a]);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
  }

  _presave(record) {
    let self = this;

    return new Promise(function (resolve, reject) {
      // for every (key, value) pair, process the pair in a Promise
      // the Promise should be resolved by the transformed [key, value] pair
      let tasks = _.map(record, function (value, key) {
        if (value instanceof Asset) {
          return self._uploadAssetTask(key, value);
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

  save(record) {
    let self = this;
    return new Promise(function (resolve, reject) {
      self._presave(record).then(function (r) {
        let payload = {
          database_id: self.dbID, //eslint-disable-line
          records: [r.toJSON()]
        };
        return self.container.makeRequest('record:save', payload);
      }).then(function (body) {
        record.update(body.result[0]);
        resolve(record);
      }, function (err) {
        reject(err);
      }).catch(function (e) {
        reject(e);
      });
    });
  }

  del(record) {
    let ids = [record.ID];
    let payload = _.assign({
      database_id: this.dbID, //eslint-disable-line
      ids: ids
    });
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('record:delete', payload)
        .then(function () {
          resolve();
        }, function (err) {
          reject(err);
        });
    }.bind(this));
  }

}
