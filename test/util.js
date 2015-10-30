import {expect, assert} from 'chai';
import Geolocation from '../lib/geolocation';
import {toJSON, fromJSON} from '../lib/util';

describe('util', function() {

  it('toJSON Date', function() {
    const d = new Date(1411839600000);
    expect(toJSON(d)).to.eql({
      $type: 'date',
      $date: '2014-09-27T17:40:00.000Z'
    });
  });

  it('toJSON geo', function() {
    const geo = new Geolocation(10, 20);
    expect(toJSON(geo)).to.eql({
      $type: 'geo',
      $lat: 10,
      $lng: 20
    });
  });

  it('fromJSON Date', function() {
    const d = fromJSON({
      $type: 'date',
      $date: '2014-09-27T17:40:00.000Z'
    });
    expect(d).to.be.an.instanceof(Date);
    expect(d.toISOString());
  });

  it('fromJSON geo', function() {
    const geo = fromJSON({
      $type: 'geo',
      $lat: 10,
      $lng: 20
    });
    expect(geo).to.be.an.instanceof(Geolocation);
    expect(geo.latitude).to.equal(10);
    expect(geo.longitude).to.equal(20);
  });

});
