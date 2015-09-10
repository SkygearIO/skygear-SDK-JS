import {expect, assert} from 'chai';
import Query from '../lib/query';
import Record from '../lib/Record';

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

  it('add equal to predicate', function () {
    let q = new Query(Note);
    q.equalTo('content', 'First one');
    expect(q.predicate).to.deep.include.members([['eq', 'content', 'First one']]);
  });

  it('add not equal to predicate', function () {
    let q = new Query(Note);
    q.notEqualTo('content', 'First one');
    expect(q.predicate).to.deep.include.members([['neq', 'content', 'First one']]);
  });

  it('add greater than to predicate', function () {
    let q = new Query(Note);
    q.greaterThan('price', 10);
    expect(q.predicate).to.deep.include.members([['gt', 'price', 10]]);
  });

  it('add greater than or equal to predicate', function () {
    let q = new Query(Note);
    q.greaterThanOrEqualTo('price', 10);
    expect(q.predicate).to.deep.include.members([['gte', 'price', 10]]);
  });

  it('add less than to predicate', function () {
    let q = new Query(Note);
    q.lessThan('price', 10);
    expect(q.predicate).to.deep.include.members([['lt', 'price', 10]]);
  });

  it('add less than to predicate', function () {
    let q = new Query(Note);
    q.lessThanOrEqualTo('price', 10);
    expect(q.predicate).to.deep.include.members([['lte', 'price', 10]]);
  });

  it('have multiple predicate', function () {
    let q = new Query(Note);
    q.equalTo('content', 'food');
    q.greaterThan('price', 10);
    expect(q.predicate).to.deep.include.members([
      ['gt', 'price', 10],
      ['eq', 'content', 'food']
    ]);
  });

  it('have multiple predicate on same key', function () {
    let q = new Query(Note);
    q.lessThanOrEqualTo('price', 100);
    q.greaterThan('price', 0);
    expect(q.predicate).to.deep.include.members([
      ['gt', 'price', 0],
      ['lte', 'price', 100]
    ]);
  });

});
