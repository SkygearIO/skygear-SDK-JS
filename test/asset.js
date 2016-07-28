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
/*eslint-enable max-len, no-new */
