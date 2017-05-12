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
/*eslint-disable no-new, no-unused-vars, quote-props */
import {expect, assert} from 'chai';
import Record from '../packages/skygear-core/lib/record';
import Reference from '../packages/skygear-core/lib/reference';
import {AccessLevel} from '../packages/skygear-core/lib/acl';

describe('Reference', function () {
  let record = new Record('record', {_id: 'record/id'});
  let ref = new Reference(record);

  it('constructs from Record', function () {
    expect(ref.id).to.equal('record/id');
  });

  it('constructs from string', function () {
    ref = new Reference('record/id');
    expect(ref.id).to.equal('record/id');
  });

  it('throws exception if object.id is empty', function () {
    let obj = {};
    expect(function () {
      new Reference(obj);
    }).to.throw('Empty record id');

    obj._id = '';
    expect(function () {
      new Reference(obj);
    }).to.throw('Empty record id');
  });

  it('serializes to JSON', function () {
    expect(ref.toJSON()).to.eql({
      '$type': 'ref',
      '$id': 'record/id'
    });
  });

  it('serializes as a JSON field', function () {
    record.key = ref;
    expect(record.toJSON()).to.eql({
      '_id': 'record/id',
      '_access': null,
      'key': {
        '$type': 'ref',
        '$id': 'record/id'
      }
    });
  });
});
/*eslint-enable no-new, no-unused-vars, quote-props */
