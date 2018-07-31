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
/*eslint-disable camelcase, dot-notation, no-new, quote-props */
import {expect, assert} from 'chai';
import sinon from 'sinon';
import {Database, PublicDatabase} from '../lib/database';
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
        result: [{
          _recordType: 'note',
          _recordID: '6495FFA6-C8BB-4A65-8DA0-5B84DC54D74B',
          _created_at: '2014-09-27T17:40:00.000Z',
          print_at: {$type: 'date', $date: '2014-09-27T17:40:00.000Z'},
          content: 'hi ourd',
          noteOrder: 1,
          ref: {
            $type: 'ref',
            $recordType: 'note',
            $recordID: 'note1'
          },
          geo: {$type: 'geo', $lat: 10, $lng: 20},
          tags: []
        }, {
          _recordType: 'note',
          _recordID: '56F12880-3004-4723-B94A-0AC86DF13916',
          content: 'limouren',
          noteOrder: 2,
          _transient: {
            category: {
              _created_at: '2015-11-17T07:41:57.461883Z',
              _recordType: 'category',
              _recordID: 'transientCategory',
              name: 'transient test'
            }
          }
        }],
        info: {
          count: 24
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
          result: [{
            _type: 'record',
            _created_at: '2014-09-27T17:40:00.000Z',
            _ownerID: 'rick.mak@gmail.com',
            _access: null,
            _transient: {
              synced: true,
              syncDate: {$type: 'date', $date: '2014-09-27T17:40:00.000Z'}
            },
            ...firstRecord
          }]
        });
      } else if (params['database_id'] === '_public' &&
      firstRecord['_id'] === 'note/failed-to-save') {
        return fn({
          result: [{
            _recordType: 'note',
            _recordID: 'failed-to-save',
            _type: 'error',
            code: 101,
            message: 'failed to save record id = note/failed-to-save',
            type: 'ResourceSaveFailure'
          }]
        });
      } else {
        return fn({
          result: [{
            _type: 'record',
            _recordType: 'note',
            _recordID: 'b488de75-16f9-48bd-b450-7cb078d645fe',
            _created_at: '2014-09-27T17:40:00.000Z',
            _ownerID: 'rick.mak@gmail.com',
            _access: null,
            _transient: {
              synced: true,
              syncDate: {$type: 'date', $date: '2014-09-27T17:40:00.000Z'}
            }
          }]
        });
      }
    } else {
      if (params['database_id'] === '_public' &&
       firstRecord['_id'] === 'note/failed-to-save') {
        if (params.atomic) {
          return fn({
            result: [{
              _type: 'error',
              code: 409,
              type: 'AtomicOperationFailure',
              message:
                'Atomic Operation rolled back due to one or more errors'
            }]
          });
        }

        return fn({
          result: [
            {
              _recordType: 'note',
              _recordID: 'failed-to-save',
              _type: 'error',
              code: 101,
              message: 'failed to save record id = note/failed-to-save',
              type: 'ResourceSaveFailure'
            }, {
              _type: 'record',
              _recordType: 'note',
              _recordID: '80390764-c4c8-4873-a7d7-9330a214af0d',
              _created_at: '2014-09-27T17:40:00.000Z',
              _ownerID: 'rick.mak@gmail.com',
              _access: null,
              _transient: {
                synced: true,
                syncDate: {$type: 'date', $date: '2014-09-37T17:40:00.000Z'}
              }
            }]
        });
      } else {
        return fn({
          result: [
            {
              _type: 'record',
              _recordType: 'note',
              _recordID: 'b488de75-16f9-48bd-b450-7cb078d645fe',
              _created_at: '2014-09-27T17:40:00.000Z',
              _ownerID: 'rick.mak@gmail.com',
              _access: null,
              _transient: {
                synced: true,
                syncDate: {$type: 'date', $date: '2014-09-27T17:40:00.000Z'}
              }
            }, {
              _type: 'record',
              _recordType: 'note',
              _recordID: '80390764-c4c8-4873-a7d7-9330a214af0d',
              _created_at: '2014-09-27T17:40:00.000Z',
              _ownerID: 'rick.mak@gmail.com',
              _access: null,
              _transient: {
                synced: true,
                syncDate: {$type: 'date', $date: '2014-09-37T17:40:00.000Z'}
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
              _recordType: 'note',
              _recordID: 'not-found',
              _type: 'error',
              code: 103,
              message: 'record not found',
              type: 'ResourceNotFound'
            }]
          });
        } else {
          return fn({
            result: [{
              _recordType: 'note',
              _recordID: 'c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
              _type: 'record'
            }]
          });
        }
      } else {
        let firstRecordId = recordIds[0];
        if (firstRecordId === 'note/not-found') {
          return fn({
            result: [{
              _recordType: 'note',
              _recordID: 'not-found',
              _type: 'error',
              code: 103,
              message: 'record not found',
              type: 'ResourceNotFound'
            }, {
              _recordType: 'note',
              _recordID: 'c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
              _type: 'record'
            }]
          });
        } else {
          return fn({
            result: [{
              _recordType: 'note',
              _recordID: 'de2c7e9a-7cb1-4b77-a7b3-c1aa68b16577',
              _type: 'record'
            }, {
              _recordType: 'note',
              _recordID: 'c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
              _type: 'record'
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
  let db = new PublicDatabase('_public', container);
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

  it('query with Query object', async function () {
    let q = new Query(Note);
    q.transientInclude('category');
    const records = await db.query(q);
    expect(records.length).to.be.equal(2);
    expect(records[0]).to.be.an.instanceof(Note);
    expect(records.overallCount).to.be.equal(24);

    let transientCategory = records[1].$transient.category;
    expect(transientCategory.recordType).to.equal('category');
    expect(transientCategory.recordID).to.equal('transientCategory');
    expect(transientCategory.createdAt.getTime())
      .to.equal(new Date('2015-11-17T07:41:57.461883Z').getTime());
    expect(transientCategory.name).to.equal('transient test');
  });

  it('cacheCallback will not called after remote returned', async function () {
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
      get: function () {
        return new Promise(function (resolve) {
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
        throw new Error('Unexpected call of cached query callback');
      }
    };

    await mockDB.query(q, callback);
    await new Promise((resolve) => {
      setTimeout(function () {
        resolve();
      }, 100);
    });
  });

  it('respects container.cacheResponse=true', async function () {
    let localContainer = new Container();
    localContainer.autoPubsub = false;
    localContainer.request = request;
    localContainer.configApiKey('correctApiKey');

    let mockDB = new Database('_public', localContainer);

    let q = new Query(Note);

    mockDB.cacheResponse = true;
    mockDB._cacheStore = {};
    mockDB._cacheStore.set = sinon.spy();
    await mockDB.query(q);
    expect(mockDB._cacheStore.set).to.be.callCount(1);
  });

  it('respects container.cacheResponse=false', async function () {
    let localContainer = new Container();
    localContainer.autoPubsub = false;
    localContainer.request = request;
    localContainer.configApiKey('correctApiKey');

    let mockDB = new Database('_public', localContainer);

    let q = new Query(Note);

    mockDB.cacheResponse = false;
    mockDB._cacheStore = {};
    mockDB._cacheStore.set = sinon.spy();
    await mockDB.query(q);
    expect(mockDB._cacheStore.set).to.be.callCount(0);
  });

  it('query with returns of unexpected _transient dict', async function () {
    let q = new Query(Note);
    // this test case should work without calls to transientInclude
    // q.transientInclude('category')
    const records = await db.query(q);
    expect(records.length).to.be.equal(2);
    expect(records[0]).to.be.an.instanceof(Note);
    expect(records.overallCount).to.be.equal(24);

    let transientCategory = records[1].$transient.category;
    expect(transientCategory.recordType).to.equal('category');
    expect(transientCategory.recordID).to.equal('transientCategory');
    expect(transientCategory.createdAt.getTime())
      .to.equal(new Date('2015-11-17T07:41:57.461883Z').getTime());
    expect(transientCategory.name).to.equal('transient test');
  });

  it('reject with error on saving undefined', async function () {
    try {
      await db.save(undefined);
      assert.fail('should fail');
    } catch (error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.equal(
        'Invalid input, unable to save undefined and null');
    }
  });

  it(
    'reject with error on saving records incldue undefined',
    async function () {
      let r = new Note();
      r.null = null;
      try {
        await db.save([r, undefined]);
        assert.fail('should fail');
      } catch (error) {
        expect(error).to.be.an.instanceof(Error);
        expect(error.message).to.equal(
          'Invalid input, unable to save undefined and null');
      }
    }
  );

  it('save record to remote', async function () {
    let r = new Note();
    r.null = null;
    const record = await db.save(r);
    expect(record).to.be.an.instanceof(Note);
  });

  it('save fails with reject callback', async function () {
    let r = new Note({
      _recordType: 'note',
      _recordID: 'failed-to-save'
    });
    try {
      await db.save(r);
    } catch (error) {
      expect(error).eql({
        _recordType: 'note',
        _recordID: 'failed-to-save',
        _type: 'error',
        code: 101,
        message: 'failed to save record id = note/failed-to-save',
        type: 'ResourceSaveFailure'
      });
    }
  });

  it('save multiple records to remote', async function () {
    let note1 = new Note();
    let note2 = new Note();

    const result = await db.save([note1, note2]);
    let records = result.savedRecords;
    let errors = result.errors;

    expect(records).to.have.length(2);
    expect(records[0]).to.be.an.instanceof(Note);
    expect(records[1]).to.be.an.instanceof(Note);

    expect(errors).to.have.length(2);
    expect(errors[0]).to.be.undefined();
    expect(errors[1]).to.be.undefined();
  });

  it('save multiple records with some failures', async function () {
    let note1 = new Note({
      _recordType: 'note',
      _recordID: 'failed-to-save'
    });
    let note2 = new Note();

    const result = await db.save([note1, note2]);
    let records = result.savedRecords;
    let errors = result.errors;

    expect(records).to.have.length(2);
    expect(records[0]).to.be.undefined();
    expect(records[1]).to.be.an.instanceof(Note);

    expect(errors).to.have.length(2);
    expect(errors[0]).to.eql({
      _recordType: 'note',
      _recordID: 'failed-to-save',
      _type: 'error',
      code: 101,
      message: 'failed to save record id = note/failed-to-save',
      type: 'ResourceSaveFailure'
    });
    expect(errors[1]).to.be.undefined();
  });

  it('save atomically multiple records to remote', async function () {
    let note1 = new Note();
    let note2 = new Note();

    const result = await db.save([note1, note2], {atomic: true});
    let records = result.savedRecords;
    let errors = result.errors;

    expect(records).to.have.length(2);
    expect(records[0]).to.be.an.instanceof(Note);
    expect(records[1]).to.be.an.instanceof(Note);

    expect(errors).to.have.length(2);
    expect(errors[0]).to.be.undefined();
    expect(errors[1]).to.be.undefined();
  });

  it('save atomically multiple records with some failures', async function () {
    let note1 = new Note({
      _recordType: 'note',
      _recordID: 'failed-to-save'
    });
    let note2 = new Note();

    const result = await db.save([note1, note2], {atomic: true});
    let records = result.savedRecords;
    let errors = result.errors;

    expect(records).to.have.length(1);
    expect(records[0]).to.be.undefined();

    expect(errors).to.have.length(1);
    expect(errors[0]).to.eql({
      _type: 'error',
      code: 409,
      message: 'Atomic Operation rolled back due to one or more errors',
      type: 'AtomicOperationFailure'
    });
  });

  it('save record with meta populated', async function () {
    let r = new Note();
    r.update({
      _created_at: '2014-09-27T17:40:00.000Z'
    });
    expect(r.createdAt.toISOString()).to.equal('2014-09-27T17:40:00.000Z');
    r.update({
      _created_at: '2014-09-27T17:40:00.000Z'
    });
    const record = await db.save(r);
    expect(record).to.be.an.instanceof(Note);
  });

  it('merge transient field after save', async function () {
    let r = new Note();
    r.$transient.custom = 'CLIENT DATA';
    r.$transient.synced = false;
    const record = await db.save(r);
    expect(record).to.be.an.instanceof(Note);
    expect(record.$transient.synced).to.be.true();
    expect(record.$transient.syncDate.toISOString())
      .to.be.equal('2014-09-27T17:40:00.000Z');
    expect(record.$transient.custom).to.be.equal('CLIENT DATA');
  });

  it('replace record field after saving', async function () {
    let r = new Note();
    r.content = 'I shalt not exist';
    const record = await db.save(r);
    expect(record).to.be.an.instanceof(Note);
    expect(record.content).to.be.undefined();
  });

  it('delete record at remote', async function () {
    let r = new Note();
    await db.del(r);
  });

  it('delete record fails will reject', async function () {
    let r = new Note({
      _recordType: 'note',
      _recordID: 'not-found'
    });
    try {
      await db.del(r);
      assert.fail('should fail');
    } catch (error) {
      expect(error).eql({
        _recordType: 'note',
        _recordID: 'not-found',
        _type: 'error',
        code: 103,
        message: 'record not found',
        type: 'ResourceNotFound'
      });
    }
  });

  it('delete record multiple records at remote', async function () {
    let note1 = new Note();
    let note2 = new Note();
    const result = await db.delete([note1, note2]);
    expect(result).to.have.length(2);
    expect(result[0]).to.be.undefined();
    expect(result[1]).to.be.undefined();
  });

  it(
    'delete accept QueryResult and delete records at remote',
    async function () {
      let note1 = new Note();
      let note2 = new Note();
      let queryResult = QueryResult.createFromResult([note1, note2], {});
      const result = await db.delete(queryResult);
      expect(result).to.have.length(2);
      expect(result[0]).to.be.undefined();
      expect(result[1]).to.be.undefined();
    }
  );

  it('delete record multiple records with some failures', async function () {
    let note1 = new Note({
      _recordType: 'note',
      _recordID: 'not-found'
    });
    let note2 = new Note();
    const result = await db.delete([note1, note2]);
    expect(result).to.have.length(2);
    expect(result[0]).to.eql({
      _recordType: 'note',
      _recordID: 'not-found',
      _type: 'error',
      code: 103,
      message: 'record not found',
      type: 'ResourceNotFound'
    });
    expect(result[1]).to.be.undefined();
  });

  it('allows to delete records in multiple types', async function () {
    const r1 = new Record('note', 'some-note-1');
    const r2 = new Record('comment', 'some-comment-1');
    const result = await db.delete([r1, r2]);
    expect(result).to.have.length(2);
    expect(result[0]).to.be.undefined();
    expect(result[1]).to.be.undefined();
  });

});
/*eslint-enable camelcase, dot-notation, no-new, quote-props */
