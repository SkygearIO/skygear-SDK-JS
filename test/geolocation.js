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
      new Geolocation('a', 20); //eslint-disable-line no-new
    }).to.throw('Latitude is not a number');

    expect(function () {
      new Geolocation(10, 'b'); //eslint-disable-line no-new
    }).to.throw('Longitude is not a number');
  });

  it('throw error with out-of-range parameters', function () {
    expect(function () {
      new Geolocation(10, -190); //eslint-disable-line no-new
    }).to.throw('Longitude is not in expected range (-180, 180)');

    expect(function () {
      new Geolocation(100, 20); //eslint-disable-line no-new
    }).to.throw('Latitude is not in expected range (-90, 90)');
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
