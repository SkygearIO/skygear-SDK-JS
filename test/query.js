import {expect, assert} from 'chai';
import Query from '../lib/query';
import Record from '../lib/Record';
import Reference from '../lib/Reference';

describe('Query', function () {

  let Note = Record.extend('note');

  it('reject invalid recordType', function () {
    expect(function() {
      new Query({});
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );

    expect(function() {
      new Query('note');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  });

  it('have default limit(50) and offset(0)', function () {
    let q = new Query(Note);
    expect(q.limit).to.be.equal(50);
    expect(q.offset).to.be.equal(0);
  });

  it('store the recordType of record class', function () {
    let q = new Query(Note);
    expect(q.recordType).to.be.equal('note');
  });

  it('default return null predicate', function () {
    let q = new Query(Note);
    expect(q.predicate).to.eql([]);
  });

  it('add equal to predicate', function () {
    let q = new Query(Note);
    q.equalTo('content', 'First one');
    expect(q.predicate).to.deep.include.members(['eq', {
      $type: 'keypath',
      $val: 'content'
    }, 'First one']);
  });

  it('add not equal to predicate', function () {
    let q = new Query(Note);
    q.notEqualTo('content', 'First one');
    expect(q.predicate).to.deep.include.members(['neq', {
      $type: 'keypath',
      $val: 'content'
    }, 'First one']);
  });

  it('add greater than to predicate', function () {
    let q = new Query(Note);
    q.greaterThan('price', 10);
    expect(q.predicate).to.deep.include.members(['gt', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add greater than or equal to predicate', function () {
    let q = new Query(Note);
    q.greaterThanOrEqualTo('price', 10);
    expect(q.predicate).to.deep.include.members(['gte', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add less than to predicate', function () {
    let q = new Query(Note);
    q.lessThan('price', 10);
    expect(q.predicate).to.deep.include.members(['lt', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add less than to predicate', function () {
    let q = new Query(Note);
    q.lessThanOrEqualTo('price', 10);
    expect(q.predicate).to.deep.include.members(['lte', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('have multiple predicate with and', function () {
    let q = new Query(Note);
    q.equalTo('content', 'food');
    q.greaterThan('price', 10);
    expect(q.predicate).to.deep.include.members([
      'and',
      ['gt', {
        $type: 'keypath',
        $val: 'price'
      }, 10],
      ['eq', {
        $type: 'keypath',
        $val: 'content'
      }, 'food']
    ]);
  });

  it('have multiple predicate on same key', function () {
    let q = new Query(Note);
    q.lessThanOrEqualTo('price', 100);
    q.greaterThan('price', 0);
    expect(q.predicate).to.deep.include.members([
      'and',
      ['gt', {
        $type: 'keypath',
        $val: 'price'
      }, 0],
      ['lte', {
        $type: 'keypath',
        $val: 'price'
      }, 100]
    ]);
  });

  it('serialize a reference inside', function() {
    let q = new Query(Note);
    let ref = new Reference('record/id');
    q.equalTo('ref', ref);
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      predicate: [
        'eq',
        {$type: 'keypath', $val: 'ref'},
        {$type: 'ref', $id: 'record/id'}
      ],
      sort: [],
      limit: 50
    });
  });

  it('serialize a simple query payload', function () {
    let q = new Query(Note);
    q.like('content', 'hello');
    q.limit = 10;
    q.offset = 5;
    q.addDescending('noteOrder');
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      limit: 10,
      offset: 5,
      sort: [[{
        $type: 'keypath',
        $val: 'noteOrder'
      }, 'desc']],
      predicate: ['like', {
        $type: 'keypath',
        $val: 'content'
      }, 'hello']
    })
  })

});
