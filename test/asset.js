/*eslint-disable max-len, no-new */
import {expect} from 'chai';
import Asset from '../lib/asset';

describe('Asset', function () {

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

  it('deserializes from JSON', function () {
    let asset = Asset.fromJSON({
      $type: 'asset',
      $name: 'asset-name',
      $url: 'http://skygear.dev/files/asset-name?expiredAt=1446034750\u0026signature=signature'
    });
    expect(asset.name).to.equal('asset-name');
    expect(asset.url).to.equal('http://skygear.dev/files/asset-name?expiredAt=1446034750&signature=signature');
  });

});
/*eslint-enable max-len, no-new */
