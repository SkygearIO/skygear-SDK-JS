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
      this.container.makeRequest('record:query', payload).end(function (err, res) {
        if (err) {
          let odErr = res.body.error || err.response.text;
          reject(Error(odErr.message));
        } else {
          let records = _.map(res.body.result, function (attrs) {
            return new Cls(attrs);
          });
          resolve(records);
        }
      });
    }.bind(this));
  }

  save(record) {
    let payload = {
      database_id: this.dbID, //eslint-disable-line
      records: [record.toJSON()]
    };
    return new Promise(function (resolve, reject) {
      this.container.makeRequest('record:save', payload).end(function (err, res) {
        if (err) {
          let odErr = res.body.error || err.response.text;
          reject(Error(odErr.message));
        } else {
          record.update(res.body.result[0]);
          resolve(record);
        }
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
      this.container.makeRequest('record:delete', payload).end(function (err, res) {
        if (err) {
          let odErr = res.body.error || err.response.text;
          reject(Error(odErr.message));
        } else {
          resolve();
        }
      });
    }.bind(this));
  }

}
