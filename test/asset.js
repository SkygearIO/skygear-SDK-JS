import {expect} from 'chai';
import Asset from '../lib/asset';

describe('Asset', function() {

  it('should throw error with bad parameters', function () {
    expect(function () {
        new Asset();
    }).to.throw('Name should not be empty');

    expect(function () {
        new Asset({name: 'asset-name'});
    }).to.throw('Either file or url should present');
  });

  it('serializes to JSON', function () {
    let asset = new Asset({
      name: 'asset-name',
      url: 'http://you-shalt-not-see.me/'
    });
    expect(asset.toJSON()).to.eql({
      $type: 'asset',
      $name: 'asset-name'
    });
  });

});
