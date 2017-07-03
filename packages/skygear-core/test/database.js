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
/*eslint-disable dot-notation, no-new, no-unused-vars, quote-props */
import {expect, assert} from 'chai';
import sinon from 'sinon';
import {Database} from '../lib/database';
import Record from '../lib/record';
import QueryResult from '../lib/query_result';
import Query from '../lib/query';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

let request = mockSuperagent([{
  pattern: 'http://skygear.dev/record/query',
  fixtures: function (match, params, headers, fn) {
    if (params['database_id'] === '_public') {
      return fn({
        'result': [{
          '_id': 'note/6495FFA6-C8BB-4A65-8DA0-5B84DC54D74B',
          '_created_at': '2014-09-27T17:40:00.000Z',
          'print_at': {$type: 'date', $date: '2014-09-27T17:40:00.000Z'},
          'content': 'hi ourd',
          'noteOrder': 1,
          'ref': {$type: 'ref', $id: 'note/note1'},
          'geo': {$type: 'geo', $lat: 10, $lng: 20},
          'tags': []
        }, {
          '_id': 'note/56F12880-3004-4723-B94A-0AC86DF13916',
          'content': 'limouren',
          'noteOrder': 2,
          '_transient': {
            'category': {
              '_created_at': '2015-11-17T07:41:57.461883Z',
              '_id': 'category/transientCategory',
              'name': 'transient test'
            }
          }
        }],
        'info': {
          'count': 24
        }
      });
    }
  }
}, {
  pattern: 'http://skygear.dev/record/save',
  fixtures: function (match, params, headers, fn) {
    let records = params['records'];
    let firstRecord = records[0];
    if (records.length === 1) {
      if (firstRecord._id.indexOf('user/') === 0) {
        return fn({
          'result': [{
            '_type': 'record',
            '_created_at': '2014-09-27T17:40:00.000Z',
            '_ownerID': 'rick.mak@gmail.com',
            '_access': null,
            '_transient': {
              'synced': true,
              'syncDate': {$type: 'date', $date: '2014-09-27T17:40:00.000Z'}
            },
            ...firstRecord
          }]
        });
      } else if (params['database_id'] === '_public' &&
      firstRecord['_id'] === 'note/failed-to-save') {
        return fn({
          'result': [{
            '_id': 'note/failed-to-save',
            '_type': 'error',
            'code': 101,
            'message': 'failed to save record id = note/failed-to-save',
            'type': 'ResourceSaveFailure'
          }]
        });
      } else {
        return fn({
          'result': [{
            '_type': 'record',
            '_id': 'note/b488de75-16f9-48bd-b450-7cb078d645fe',
            '_created_at': '2014-09-27T17:40:00.000Z',
            '_ownerID': 'rick.mak@gmail.com',
            '_access': null,
            '_transient': {
              'synced': true,
              'syncDate': {$type: 'date', $date: '2014-09-27T17:40:00.000Z'}
            }
          }]
        });
      }
    } else {
      if (params['database_id'] === '_public' &&
       firstRecord['_id'] === 'note/failed-to-save') {
        if (params.atomic) {
          return fn({
            'result': [{
              '_type': 'error',
              'code': 409,
              'type': 'AtomicOperationFailure',
              'message':
                'Atomic Operation rolled back due to one or more errors'
            }]
          });
        }

        return fn({
          result: [
            {
              '_id': 'note/failed-to-save',
              '_type': 'error',
              'code': 101,
              'message': 'failed to save record id = note/failed-to-save',
              'type': 'ResourceSaveFailure'
            }, {
              '_type': 'record',
              '_id': 'note/80390764-c4c8-4873-a7d7-9330a214af0d',
              '_created_at': '2014-09-27T17:40:00.000Z',
              '_ownerID': 'rick.mak@gmail.com',
              '_access': null,
              '_transient': {
                'synced': true,
                'syncDate': {$type: 'date', $date: '2014-09-37T17:40:00.000Z'}
              }
            }]
        });
      } else {
        return fn({
          result: [
            {
              '_type': 'record',
              '_id': 'note/b488de75-16f9-48bd-b450-7cb078d645fe',
              '_created_at': '2014-09-27T17:40:00.000Z',
              '_ownerID': 'rick.mak@gmail.com',
              '_access': null,
              '_transient': {
                'synced': true,
                'syncDate': {$type: 'date', $date: '2014-09-27T17:40:00.000Z'}
              }
            }, {
              '_type': 'record',
              '_id': 'note/80390764-c4c8-4873-a7d7-9330a214af0d',
              '_created_at': '2014-09-27T17:40:00.000Z',
              '_ownerID': 'rick.mak@gmail.com',
              '_access': null,
              '_transient': {
                'synced': true,
                'syncDate': {$type: 'date', $date: '2014-09-37T17:40:00.000Z'}
              }
            }]
        });
      }
    }
  }
}, {
  pattern: 'http://skygear.dev/record/delete',
  fixtures: function (match, params, headers, fn) {
    let recordIds = params['ids'];
    if (params['database_id'] === '_public' && recordIds) {
      if (recordIds.length === 0) {
        if (recordIds[0] === 'note/not-found') {
          return fn({
            result: [{
              _id: 'note/not-found',
              _type: 'error',
              code: 103,
              message: 'record not found',
              type: 'ResourceNotFound'
            }]
          });
        } else {
          return fn({
            'result': [{
              '_id': 'note/c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
              '_type': 'record'
            }]
          });
        }
      } else {
        let firstRecordId = recordIds[0];
        if (firstRecordId === 'note/not-found') {
          return fn({
            result: [{
              _id: 'note/not-found',
              _type: 'error',
              code: 103,
              message: 'record not found',
              type: 'ResourceNotFound'
            }, {
              '_id': 'note/c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
              '_type': 'record'
            }]
          });
        } else {
          return fn({
            result: [{
              '_id': 'note/de2c7e9a-7cb1-4b77-a7b3-c1aa68b16577',
              '_type': 'record'
            }, {
              '_id': 'note/c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
              '_type': 'record'
            }]
          });
        }
      }
    }
  }
}]);

describe('Database', function () {

  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.request = request;
  container.configApiKey('correctApiKey');
  let db = new Database('_public', container);
  let Note = Record.extend('note');

  it('Reject invalid database_id', function () {
    expect(function () {
      new Database('_invalid');
    }).to.throw(
      'Invalid database_id'
    );
  });

  it('caches response by default', function () {
    let d = new Database('_public', container);
    expect(d.cacheResponse).to.be.true();
  });

  it('query with Query object', function () {
    let q = new Query(Note);
    q.transientInclude('category');
    return db.query(q).then(function (records) {
      expect(records.length).to.be.equal(2);
      expect(records[0]).to.be.an.instanceof(Note);
      expect(records.overallCount).to.be.equal(24);

      let transientCategory = records[1].$transient.category;
      expect(transientCategory.id).to.equal('category/transientCategory');
      expect(transientCategory.createdAt.getTime())
        .to.equal(new Date('2015-11-17T07:41:57.461883Z').getTime());
      expect(transientCategory.name).to.equal('transient test');
    }, function (error) {
      throw Error();
    });
  });

  it('cacheCallback will not called after remote returned', function (done) {
    /*
    This test case assume the callback will not delay more than 50ms
    1. A mocked cache will return result 50ms after it got query
    2. The test case will finished 100ms after it got executed.
    3. The test case will fail if the cached query is called within 100ms.
    */
    let mockDB = new Database('_public', container);
    let q = new Query(Note);
    let result;
    mockDB._cacheStore = {
      get: function (params) {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            resolve(result);
          }, 50);
        });
      },
      set: function (parmas, body) {
        result = body;
      }
    };
    let callback = function (records, cached) {
      if (cached) {
        done(new Error('Unexpected call of cached query callback'));
      }
    };

    return mockDB.query(q, callback).then(function () {
      setTimeout(function () {
        done();
      }, 100);
    }, function (error) {
      throw Error();
    });

  });

  it('respects container.cacheResponse', function (done) {
    let localContainer = new Container();
    localContainer.autoPubsub = false;
    localContainer.request = request;
    localContainer.configApiKey('correctApiKey');

    let mockDB = new Database('_public', localContainer);

    let q = new Query(Note);

    Promise.resolve().then(function () {
      localContainer.cacheResponse = false;
      mockDB._cacheStore = {};
      mockDB._cacheStore.set = sinon.spy();
      mockDB.query(q).then(function (records) {
        expect(mockDB._cacheStore.set).to.be.callCount(0);
      });
    }).then(function () {
      localContainer.cacheResponse = true;
      mockDB._cacheStore = {};
      mockDB._cacheStore.set = sinon.spy();
      mockDB.query(q).then(function (records) {
        expect(mockDB._cacheStore.set).to.be.callCount(1);
        done();
      });
    });
  });

  it('query with returns of unexpected _transient dict', function () {
    let q = new Query(Note);
    // this test case should work without calls to transientInclude
    // q.transientInclude('category')
    return db.query(q).then(function (records) {
      expect(records.length).to.be.equal(2);
      expect(records[0]).to.be.an.instanceof(Note);
      expect(records.overallCount).to.be.equal(24);

      let transientCategory = records[1].$transient.category;
      expect(transientCategory.id).to.equal('category/transientCategory');
      expect(transientCategory.createdAt.getTime())
        .to.equal(new Date('2015-11-17T07:41:57.461883Z').getTime());
      expect(transientCategory.name).to.equal('transient test');
    }, function (error) {
      throw Error();
    });
  });

  it('reject with error on saving undefined', function () {
    return db.save(undefined).then(function (record) {
      throw Error();
    }, function (error) {
      expect(error).to.equal(
        'Invalid input, unable to save undefined and null');
    });
  });

  it('reject with error on saving records incldue undefined', function () {
    let r = new Note();
    r.null = null;
    return db.save([r, undefined]).then(function (record) {
      throw Error();
    }, function (error) {
      expect(error).to.equal(
        'Invalid input, unable to save undefined and null');
    });
  });

  it('save record to remote', function () {
    let r = new Note();
    r.null = null;
    return db.save(r).then(function (record) {
      expect(record).to.be.an.instanceof(Note);
    }, function (error) {
      throw Error(error);
    });
  });

  it('save fails with reject callback', function () {
    let r = new Note({
      _id: 'note/failed-to-save'
    });
    return db.save(r).then(function (record) {
      throw Error();
    }, function (error) {
      expect(error).eql({
        '_id': 'note/failed-to-save',
        '_type': 'error',
        'code': 101,
        'message': 'failed to save record id = note/failed-to-save',
        'type': 'ResourceSaveFailure'
      });
    });
  });

  it('save multiple records to remote', function () {
    let note1 = new Note();
    let note2 = new Note();

    return db.save([note1, note2])
    .then((result) => {
      let records = result.savedRecords;
      let errors = result.errors;

      expect(records).to.have.length(2);
      expect(records[0]).to.be.an.instanceof(Note);
      expect(records[1]).to.be.an.instanceof(Note);

      expect(errors).to.have.length(2);
      expect(errors[0]).to.be.undefined();
      expect(errors[1]).to.be.undefined();
    }, (error) => {
      throw Error(error);
    });
  });

  it('save multiple records with some failures', function () {
    let note1 = new Note({
      _id: 'note/failed-to-save'
    });
    let note2 = new Note();

    return db.save([note1, note2])
    .then((result) => {
      let records = result.savedRecords;
      let errors = result.errors;

      expect(records).to.have.length(2);
      expect(records[0]).to.be.undefined();
      expect(records[1]).to.be.an.instanceof(Note);

      expect(errors).to.have.length(2);
      expect(errors[0]).to.eql({
        '_id': 'note/failed-to-save',
        '_type': 'error',
        'code': 101,
        'message': 'failed to save record id = note/failed-to-save',
        'type': 'ResourceSaveFailure'
      });
      expect(errors[1]).to.be.undefined();
    }, (error) => {
      throw Error(error);
    });
  });

  it('save atomically multiple records to remote', function () {
    let note1 = new Note();
    let note2 = new Note();

    return db.save([note1, note2], {'atomic': true})
    .then((result) => {
      let records = result.savedRecords;
      let errors = result.errors;

      expect(records).to.have.length(2);
      expect(records[0]).to.be.an.instanceof(Note);
      expect(records[1]).to.be.an.instanceof(Note);

      expect(errors).to.have.length(2);
      expect(errors[0]).to.be.undefined();
      expect(errors[1]).to.be.undefined();
    }, (error) => {
      throw Error(error);
    });
  });

  it('save atomically multiple records with some failures', function () {
    let note1 = new Note({
      _id: 'note/failed-to-save'
    });
    let note2 = new Note();

    return db.save([note1, note2], {'atomic': true})
    .then((result) => {
      let records = result.savedRecords;
      let errors = result.errors;

      expect(records).to.have.length(1);
      expect(records[0]).to.be.undefined();

      expect(errors).to.have.length(1);
      expect(errors[0]).to.eql({
        '_type': 'error',
        'code': 409,
        'message': 'Atomic Operation rolled back due to one or more errors',
        'type': 'AtomicOperationFailure'
      });
    }, (error) => {
      throw Error(error);
    });
  });

  it('save record with meta populated', function () {
    let r = new Note();
    r.update({
      '_created_at': '2014-09-27T17:40:00.000Z'
    });
    expect(r.createdAt.toISOString()).to.equal('2014-09-27T17:40:00.000Z');
    r.update({
      '_created_at': '2014-09-27T17:40:00.000Z'
    });
    return db.save(r).then(function (record) {
      expect(record).to.be.an.instanceof(Note);
    }, function (error) {
      throw Error();
    });
  });

  it('merge transient field after save', function () {
    let r = new Note();
    r.$transient.custom = 'CLIENT DATA';
    r.$transient.synced = false;
    return db.save(r).then(function (record) {
      expect(record).to.be.an.instanceof(Note);
      expect(record.$transient.synced).to.be.true();
      expect(record.$transient.syncDate.toISOString())
        .to.be.equal('2014-09-27T17:40:00.000Z');
      expect(record.$transient.custom).to.be.equal('CLIENT DATA');
    });
  });

  it('replace record field after saving', function () {
    let r = new Note();
    r.content = 'I shalt not exist';
    return db.save(r).then(function (record) {
      expect(record).to.be.an.instanceof(Note);
      expect(record.content).to.be.undefined();
    });
  });

  it('delete record at remote', function () {
    let r = new Note();
    return db.del(r).then(function () {
      return;
    }, function (error) {
      throw Error();
    });
  });

  it('delete record fails will reject', function () {
    let r = new Note({
      _id: 'note/not-found'
    });
    return db.del(r).then(function () {
      throw Error();
    }, function (error) {
      expect(error).eql({
        _id: 'note/not-found',
        _type: 'error',
        code: 103,
        message: 'record not found',
        type: 'ResourceNotFound'
      });
    });
  });

  it('delete record multiple records at remote', function () {
    let note1 = new Note();
    let note2 = new Note();
    return db.delete([note1, note2])
    .then(function (errors) {
      expect(errors).to.have.length(2);
      expect(errors[0]).to.be.undefined();
      expect(errors[1]).to.be.undefined();
    }, function (error) {
      throw Error();
    });
  });

  it('delete accept QueryResult and delete records at remote', function () {
    let note1 = new Note();
    let note2 = new Note();
    let queryResult = QueryResult.createFromResult([note1, note2], {});
    return db.delete(queryResult)
    .then(function (errors) {
      expect(errors).to.have.length(2);
      expect(errors[0]).to.be.undefined();
      expect(errors[1]).to.be.undefined();
    }, function (error) {
      throw Error();
    });
  });

  it('delete record multiple records with some failures', function () {
    let note1 = new Note({
      _id: 'note/not-found'
    });
    let note2 = new Note();
    return db.delete([note1, note2])
    .then(function (errors) {
      expect(errors).to.have.length(2);
      expect(errors[0]).to.eql({
        _id: 'note/not-found',
        _type: 'error',
        code: 103,
        message: 'record not found',
        type: 'ResourceNotFound'
      });
      expect(errors[1]).to.be.undefined();
    }, function (error) {
      throw Error();
    });
  });

});
/*eslint-enable dot-notation, no-new, no-unused-vars, quote-props */
