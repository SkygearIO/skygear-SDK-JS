import {expect} from 'chai';
import sinon from 'sinon';
import Cache from '../lib/cache';

describe('Cache', function () {

  let cache;
  let store;

  beforeEach(function () {
    cache = new Cache('prefix');
    store = {};
    store.getItem = sinon.spy();
    store.setItem = sinon.spy();
    cache.store = store;
  });

  it('save value with prefix', function () {
    cache.set('hash', 'value');
    expect(store.setItem).to.be.calledWithMatch('prefix:hash', 'value');
  });

  it('get value with prefix', function () {
    cache.get('hash');
    expect(store.getItem).to.be.calledWithMatch('prefix:hash');
  });

  it('cache keys is unique', function () {
    cache.set('hash', 'dump');
    cache.set('hash', 'realvalue');
    expect(store.setItem).to.be.calledWithMatch('prefix:hash', 'dump');
    expect(store.setItem).to.be.calledWithMatch('prefix:hash', 'realvalue');
    expect(cache.keys).to.be.eql(['prefix:hash']);
  });

});
