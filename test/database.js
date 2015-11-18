/*eslint-disable dot-notation, no-new, no-unused-vars, quote-props, quotes */
import {expect, assert} from 'chai';
import Database from '../lib/database';
import Record from '../lib/record';
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
          'ref': {$type: "ref", $id: "note/note1"},
          'geo': {$type: "geo", $lat: 10, $lng: 20},
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
    if (params['database_id'] === '_public') {
      return fn({
        'result': [{
          '_type': 'record',
          '_id': 'note/b488de75-16f9-48bd-b450-7cb078d645fe',
          '_created_at': '2014-09-27T17:40:00.000Z',
          '_ownerID': 'rick.mak@gmail.com',
          '_access': null
        }]
      });
    }
  }
}, {
  pattern: 'http://skygear.dev/record/delete',
  fixtures: function (match, params, headers, fn) {
    if (params['database_id'] === '_public' && params['ids']) {
      return fn({
        'result': [{
          '_id': 'note/c9b3b7d3-07ea-4b62-ac6a-50e1f0fb0a3d',
          '_type': 'record'
        }]
      });
    }
  }
}]);

describe('Database', function () {

  let container = new Container();
  container.autoPubsub = false;
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

  it.skip('query with returns of unexpected _transient dict', function () {
    let q = new Query(Note);
    // this test case should work without calls to transientInclude
    // q.transientInclude('category')
    return db.query(q).then(function (records) {
      expect(records.length).to.be.equal(2);
      expect(records[0]).to.be.an.instanceof(Note);
      expect(records.overallCount).to.be.equal(24);
    }, function (error) {
      throw Error();
    });
  });

  it('save record to remote', function () {
    let r = new Note();
    return db.save(r).then(function (record) {
      expect(record).to.be.an.instanceof(Note);
    }, function (error) {
      throw Error();
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

  it('delete record at remote', function () {
    let r = new Note();
    return db.del(r).then(function () {
      return;
    }, function (error) {
      throw Error();
    });
  });

});
/*eslint-enable dot-notation, no-new, no-unused-vars, quote-props, quotes */
