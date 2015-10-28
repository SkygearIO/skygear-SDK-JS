import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import Geolocation from '../lib/geolocation';

describe('Geolocation', function () {
  it('construct Geolocation', function () {
    let geo = new Geolocation(10, 20);
    expect(geo.latitude).to.equal(10);
    expect(geo.longitude).to.equal(20);
  });

  it('throw error with bad parameters', function () {
    expect(function () {
      let geo = new Geolocation('a', 20);
      expect(geo).to.be.an.instanceof(Geolocation);
    }).to.throw('Latitude is not a number');

    expect(function () {
      let geo = new Geolocation(10, 'b');
      expect(geo).to.be.an.instanceof(Geolocation);
    }).to.throw('Longitude is not a number');
  });

  it('serializes to JSON', function () {
    let geo = new Geolocation(10, 20);
    expect(geo.toJSON()).to.eql({
      $type: 'geo',
      $lat: 10,
      $lng: 20
    });
  });

  it('deserializes from JSON', function () {
    let geo = Geolocation.fromJSON({
      $type: 'geo',
      $lat: 10,
      $lng: 20
    });
    expect(geo.latitude).to.equal(10);
    expect(geo.longitude).to.equal(20);
  });

});
