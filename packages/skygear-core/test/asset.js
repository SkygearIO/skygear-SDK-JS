/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*eslint-disable max-len, no-new, camelcase */
import {expect} from 'chai';
import sinon from 'sinon';
import Asset from '../lib/asset';
import {CloudSigner, FSSigner, S3Signer} from '../lib/cloud/asset';
import mockSuperagent from './mock/superagent';

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
      url: 'http://server-will-ignore.me/'
    });
    expect(asset.toJSON()).to.eql({
      $type: 'asset',
      $name: 'asset-name',
      $url: 'http://server-will-ignore.me/'
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

  it('serializes and deserializes is mirror', function () {
    let resp = {
      $type: 'asset',
      $name: 'asset-name',
      $url: 'http://skygear.dev/files/asset-name?expiredAt=1446034750\u0026signature=signature'
    };
    let asset = Asset.fromJSON(resp);
    expect(asset.toJSON()).eql(resp);
  });
});

describe('Asset Signer', function () {
  describe('File System Signer', function () {
    const options = {
      assetStoreURLExpireDuration: 900,
      assetStoreSecret: 'asset_secret',
      assetStoreURLPrefix: 'http://skygear.dev/files'
    };

    it('creates with settings', function () {
      const signer = new FSSigner(options);
      expect(signer.assetStoreURLExpireDuration).to.equal(900);
      expect(signer.assetStoreSecret).to.equal('asset_secret');
      expect(signer.assetStoreURLPrefix).to.equal('http://skygear.dev/files');
    });

    it('signs url', function () {
      const clock = sinon.useFakeTimers(1481095934000);
      const signer = new FSSigner(options);
      const signed = signer.sign('index.html');
      return signed.then((value)=> {
        clock.restore();
        expect(value).to.equal('http://skygear.dev/files/index.html'
        + '?expiredAt=1481096834'
        + '&signature=R5kMq2neUkCGBjQD6zSv99PajRvI0EqMesuRHQS4hA');
      });
    });
  });

  describe('S3 Signer', function () {
    const options = {
      assetStoreS3AccessKey: 'mock_s3_access_key',
      assetStoreS3SecretKey: 'mock_s3_secret_key',
      assetStoreS3URLPrefix: null,
      assetStoreS3Region: 'mock-s3-region',
      assetStoreS3Bucket: 'mock-s3-bucket',
      assetStoreURLExpireDuration: 900
    };

    it('creates with settings', function () {
      const signer = new S3Signer(options);
      expect(signer.assetStoreS3AccessKey)
        .to.equal('mock_s3_access_key');
      expect(signer.assetStoreS3SecretKey)
        .to.equal('mock_s3_secret_key');
      expect(signer.assetStoreS3URLPrefix).to.equal(null);
      expect(signer.assetStoreS3Region).to.equal('mock-s3-region');
      expect(signer.assetStoreS3Bucket).to.equal('mock-s3-bucket');
      expect(signer.assetStoreURLExpireDuration).to.equal(900);
    });

    it('signs url', function () {
      const signer = new S3Signer(options);
      const clock = sinon.useFakeTimers(1481095934000);
      const signed = signer.sign('an evil name with spaces');
      return signed.then((value)=> {
        clock.restore();
        expect(value).to.equal('http://s3-mock-s3-region.amazonaws.com/'
          + 'mock-s3-bucket/an%20evil%20name%20with%20spaces'
          + '?Expires=1481149934'
          + '&AWSAccessKeyId=mock_s3_access_key'
          + '&Signature=5%2FVXqVwWFllMifaVWugTuMNR5FI%3D');
      });
    });

    it('respects url prefix protocol', function () {
      const cases = [
        'https://your-domain.com/static/',
        'https://your-domain.com/static'
      ];
      const expected = 'https://your-domain.com/static/'
        + 'an%20evil%20name%20with%20spaces'
        + '?Expires=1481149934'
        + '&AWSAccessKeyId=mock_s3_access_key'
        + '&Signature=5%2FVXqVwWFllMifaVWugTuMNR5FI%3D';

      let p = Promise.resolve();
      for (let i = 0; i < cases.length; ++i) {
        const c = cases[i];
        p = p.then(() => {
          const newOptions = Object.assign({}, options, {
            assetStoreS3URLPrefix: c
          });
          const signer = new S3Signer(newOptions);
          const clock = sinon.useFakeTimers(1481095934000);
          const signed = signer.sign('an evil name with spaces');
          return signed.then((value) => {
            clock.restore();
            expect(value).to.equal(expected);
          });
        });
      }
      return p;
    });
  });

  describe('Cloud Signer', function () {
    const options = {
      appName: 'skygear-test',
      assetStoreURLExpireDuration: '900',
      cloudAssetToken: 'mock-cloud-asset-token',
      cloudAssetHost: 'http://mock-cloud-asset.dev',
      cloudAssetPublicPrefix: 'http://mock-cloud-asset.dev/public',
      cloudAssetPrivatePrefix: 'http://mock-cloud-asset.dev/private'
    };

    it('creates with settings', function () {
      const signer = new CloudSigner(options);
      expect(signer.appName).to.equal('skygear-test');
      expect(signer.assetStoreURLExpireDuration).to.equal('900');
      expect(signer.cloudAssetToken).to.equal('mock-cloud-asset-token');
      expect(signer.cloudAssetHost).to.equal('http://mock-cloud-asset.dev');
      expect(signer.prefix).to.equal('http://mock-cloud-asset.dev/private');

      const signer2 = new CloudSigner({
        ...options,
        cloudAssetStorePublic: 'true'
      });
      expect(signer2.appName).to.equal('skygear-test');
      expect(signer2.assetStoreURLExpireDuration).to.equal('900');
      expect(signer2.cloudAssetToken).to.equal('mock-cloud-asset-token');
      expect(signer2.cloudAssetHost).to.equal('http://mock-cloud-asset.dev');
      expect(signer2.prefix).to.equal('http://mock-cloud-asset.dev/public');
    });

    it('refresh signer token', function () {
      const signer = new CloudSigner(options);
      signer.request = mockSuperagent([{
        pattern: 'http://mock-cloud-asset.dev/token/skygear-test',
        fixtures: function (match, params, headers, fn) {
          return fn({
            value: 'mock-token-value',
            expired_at: new Date(1481095934000).toISOString(),
            extra: 'mock-token-extra'
          });
        }
      }]);
      return signer.refreshSignerToken()
        .then(()=> {
          expect(signer.signerSecret).to.equal('mock-token-value');
          expect(signer.expiredAt.getTime()).to.equal(1481095934000);
          expect(signer.extra).to.equal('mock-token-extra');
        });
    });

    it('signs url', function () {
      const signer = new CloudSigner(options);
      const clock = sinon.useFakeTimers(1481095934000);
      sinon.stub(signer, 'refreshSignerToken', function () {
        signer.signerSecret = 'mock-token-value';
        signer.expiredAt = 1481095944000;
        signer.extra = 'mock-token-extra';
        return Promise.resolve();
      });

      const signed = signer.sign('index.html');
      return signed.then((value)=> {
        clock.restore();
        expect(value).to.equal('http://mock-cloud-asset.dev/'
          + 'private/skygear-test/index.html'
          + '?expired_at=1481096834'
          + '&signature=peQtnmSFdoQWtFAk3cwLkM3lUspBkIhl5SPlR5hjFm4%3D'
          + '.mock-token-extra'
        );
      });
    });
  });
});
/*eslint-enable max-len, no-new, camelcase */
