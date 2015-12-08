/*eslint-disable no-unused-vars, quote-props */
import {expect, assert} from 'chai';
import Geolocation from '../lib/geolocation';
import {Sequence} from '../lib/type';
import {toJSON, fromJSON} from '../lib/util';

describe('util', function () {

  it('toJSON Sequence', function () {
    const seq = new Sequence();
    expect(toJSON(seq)).to.eql({
      $type: 'seq'
    });
  });

  it('toJSON Date', function () {
    const d = new Date(1411839600000);
    expect(toJSON(d)).to.eql({
      $type: 'date',
      $date: '2014-09-27T17:40:00.000Z'
    });
  });

  it('toJSON geo', function () {
    const geo = new Geolocation(10, 20);
    expect(toJSON(geo)).to.eql({
      $type: 'geo',
      $lat: 10,
      $lng: 20
    });
  });

  it('fromJSON Date', function () {
    const d = fromJSON({
      $type: 'date',
      $date: '2014-09-27T17:40:00.000Z'
    });
    expect(d).to.be.an.instanceof(Date);
    expect(d.toISOString());
  });

  it('fromJSON geo', function () {
    const geo = fromJSON({
      $type: 'geo',
      $lat: 10,
      $lng: 20
    });
    expect(geo).to.be.an.instanceof(Geolocation);
    expect(geo.latitude).to.equal(10);
    expect(geo.longitude).to.equal(20);
  });

  it('toJSON array with mixed objects', function () {
    const array = [
      null,
      { 'name': 'handsome' },
      ['1', '2'],
      new Date(1411839600000)
    ];
    expect(toJSON(array)).to.eql([
      null,
      { 'name': 'handsome' },
      ['1', '2'],
      {
        $type: 'date',
        $date: '2014-09-27T17:40:00.000Z'
      }
    ]);
  });

});
/*eslint-enable no-unused-vars, quote-props */
