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
import {expect} from 'chai';
import {toJSON, fromJSON} from '../lib/util';

describe('util', function () {

  it('toJSON Date', function () {
    const d = new Date(1411839600000);
    expect(toJSON(d)).to.eql('2014-09-27T17:40:00.000Z');
  });

  it('fromJSON Date', function () {
    // Won't handle Date string
    const d = fromJSON('2014-09-27T17:40:00.000Z');
    expect(d).to.eql('2014-09-27T17:40:00.000Z');
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
      '2014-09-27T17:40:00.000Z'
    ]);
  });

  it('toJSON array like object', function () {
    const object = {
      1: 'handsome',
      length: 5
    };
    expect(toJSON(object)).to.eql({
      1: 'handsome',
      length: 5
    });
  });

  it('toJSON undefined', function () {
    expect(() => toJSON(undefined))
      .to.throw('toJSON does not support undefined value');
  });

});
/*eslint-enable no-unused-vars, quote-props */
