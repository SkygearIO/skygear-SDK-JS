import {expect, assert} from 'chai';
import uuid from 'uuid';
import Record from '../lib/record';

const v4Spec = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

describe('Record', function () {
  it('reject invalid record type', function () {
    expect(function() {
      new Record('_notvalid');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  });

  it('generate with uuid v4 as id', function () {
    let r = new Record('note');
    let tuple = r.ID.split("/");
    expect(v4Spec.test(tuple[1])).to.be.true;
    expect(tuple[0]).to.equal('note');
  });

  it('support subscription', function () {
    let r = new Record('note');
    r['key'] = 'okay';
    expect(r['key']).to.be.equal('okay');
    expect(r.attributeKeys).to.include('key');
  });

  it('attributeKeys filter transient field', function () {
    let r = new Record('note');
    r['_key'] = 'impermanent';
    expect(r['_key']).to.be.equal('impermanent');
    expect(r.attributeKeys).to.not.include('_key');
  });

  it('extend class is subclass of Record', function () {
    let rCls = Record.extend('note');
    let r = new rCls();
    expect(r).to.be.an.instanceof(Record);
    expect(r).to.be.an.instanceof(rCls);
  })

  it('cannot extend with invalid type', function() {
    expect(function() {
      Record.extend('_notvalid');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  })
});

describe('Extended Record', function () {

  let Note = Record.extend('note');

  it('generate with uuid v4 as id', function () {
    let r = new Note();
    let tuple = r.ID.split("/");
    expect(v4Spec.test(tuple[1])).to.be.true;
    expect(tuple[0]).to.equal('note');
    expect(r.recordType).to.equal('note');
  });

  it('support subscription', function () {
    let r = new Note();
    r['key'] = 'okay';
    expect(r['key']).to.be.equal('okay');
    expect(r.attributeKeys).to.include('key');
  });

  it('attributeKeys filter transient field', function () {
    let r = new Note();
    r['_key'] = 'impermanent';
    expect(r['_key']).to.be.equal('impermanent');
    expect(r.attributeKeys).to.not.include('_key');
  });

});
