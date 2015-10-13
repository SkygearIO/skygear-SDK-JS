import {expect, assert} from 'chai';
import Record from '../lib/record';
import Reference from '../lib/reference';

describe('Reference', function() {
  let record = new Record('record', {_id: 'record/id'});
  let ref = new Reference(record);

  it('constructs from Record', function() {
    expect(ref.ID).to.equal('record/id');
  });

  it('constructs from string', function() {
    ref = new Reference('record/id');
    expect(ref.ID).to.equal('record/id');
  });

  it('throws exception if object.ID is empty', function() {
    let obj = {};
    expect(function() {
      new Reference(obj);
    }).to.throw('Empty record id');

    obj._id = '';
    expect(function() {
      new Reference(obj);
    }).to.throw('Empty record id');
  });

  it('serializes to JSON', function() {
    expect(ref.toJSON()).to.eql({
      '$type': 'ref',
      '$id': 'record/id'
    });
  });

  it('serializes as a JSON field', function() {
    record.key = ref;
    expect(record.toJSON()).to.eql({
      '_id': 'record/id',
      'key': {
        '$type': 'ref',
        '$id': 'record/id'
      }
    });
  });
});
