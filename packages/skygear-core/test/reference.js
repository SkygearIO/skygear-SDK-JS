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
import {expect} from 'chai';
import Record from '../lib/record';
import Reference from '../lib/reference';

describe('Reference', function () {
  it('constructs from Record', function () {
    const r = new Record('record', {
      _recordType: 'record',
      _recordID: 'id'
    });
    const ref = new Reference(r);
    expect(ref.recordType).to.equal('record');
    expect(ref.recordID).to.equal('id');
  });

  it('constructs from string', function () {
    const ref = new Reference('record', 'id');
    expect(ref.recordType).to.equal('record');
    expect(ref.recordID).to.equal('id');
  });

  it('constructs from depreacted ID', function () {
    const ref = new Reference('record/id');
    expect(ref.recordType).to.equal('record');
    expect(ref.recordID).to.equal('id');
  });

  it(
    'throws exception when constructing from unsupported parameters',
    function () {
      expect(function () {
        new Reference({});
      }).to.throw('Fail to construct a record reference');

      expect(function () {
        new Reference('note');
      }).to.throw(
        'Fail to parse the deprected ID. ' +
        'Make sure the ID is in the format `type/id'
      );

      expect(function () {
        new Reference('note', { someKey: 'some-value' });
      }).to.throw(
        'Fail to parse the deprected ID. ' +
        'Make sure the ID is in the format `type/id'
      );
    }
  );

  it('serializes to JSON', function () {
    const ref = new Reference('record', 'id');
    expect(ref.toJSON()).to.eql({
      $type: 'ref',
      $id: 'record/id',
      $recordType: 'record',
      $recordID: 'id'
    });
  });

  it('serializes as a JSON field', function () {
    const r = new Record('record', {
      _recordType: 'record',
      _recordID: 'id'
    });
    r.someRef = new Reference(r);

    expect(r.toJSON()).to.eql({
      _id: 'record/id',
      _recordType: 'record',
      _recordID: 'id',
      _access: null,
      someRef: {
        $type: 'ref',
        $id: 'record/id',
        $recordType: 'record',
        $recordID: 'id'
      }
    });
  });
});
/*eslint-enable no-new, no-unused-vars, quote-props */
