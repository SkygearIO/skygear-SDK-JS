const _ = require('lodash');

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
        resolve(records);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
  }

  save(record) {
    let payload = {
      database_id: this.dbID, //eslint-disable-line
      records: [record.toJSON()]
    };
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('record:save', payload).then(function (body) {
        record.update(body.result[0]);
        resolve(record);
      }, function (err) {
        reject(err);
      });
    }.bind(this));
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
