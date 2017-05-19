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
/*eslint-disable no-unused-vars, quote-props */
import {expect, assert} from 'chai';
import Geolocation from '../packages/skygear-core/lib/geolocation';
import {Sequence, UnknownValue} from '../packages/skygear-core/lib/type';
import {toJSON, fromJSON} from '../packages/skygear-core/lib/util';

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

  it('toJSON unknown value', function () {
    const unknownValue = new UnknownValue('money');
    expect(toJSON(unknownValue)).to.eql({
      $type: 'unknown',
      $underlying_type: 'money' //eslint-disable-line camelcase
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

  it('fromJSON unknown value', function () {
    const unknownValue = fromJSON({
      $type: 'unknown',
      $underlying_type: 'money' //eslint-disable-line camelcase
    });
    expect(unknownValue).to.be.an.instanceof(UnknownValue);
    expect(unknownValue.underlyingType).to.equal('money');
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
