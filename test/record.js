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
/*eslint-disable dot-notation, max-len, new-cap, no-new, no-unused-vars, quote-props, quotes */
import {expect, assert} from 'chai';
import uuid from 'uuid';
import Record from '../lib/record';
import Geolocation from '../lib/geolocation';
import {Sequence} from '../lib/type';
import {AccessLevel} from '../lib/acl';

const v4Spec = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

describe('Record', function () {
  it('reject invalid record type', function () {
    expect(function () {
      new Record('_notvalid');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  });

  it('generate with uuid v4 as id', function () {
    let r = new Record('note');
    let tuple = r.id.split("/");
    expect(v4Spec.test(tuple[1])).to.be.true();
    expect(tuple[0]).to.equal('note');
  });

  it('support subscription', function () {
    let r = new Record('note');
    r['key'] = 'okay';
    expect(r['key']).to.be.equal('okay');
    expect(r.attributeKeys).to.include('key');
  });

  it('attributeKeys filter transient field', function () {
    let r = new Record('note');
    r['_key'] = 'impermanent';
    expect(r['_key']).to.be.equal('impermanent');
    expect(r.attributeKeys).to.not.include('_key');
  });

  it('extend class is subclass of Record', function () {
    let rCls = Record.extend('note');
    let r = new rCls();
    expect(r).to.be.an.instanceof(Record);
    expect(r).to.be.an.instanceof(rCls);
  });

  it('cannot extend with invalid type', function () {
    expect(function () {
      Record.extend('_notvalid');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  });
});

describe('Extended Record', function () {

  let Note = Record.extend('note');

  it('generate with uuid v4 as id', function () {
    let r = new Note();
    let tuple = r.id.split("/");
    expect(v4Spec.test(tuple[1])).to.be.true();
    expect(tuple[0]).to.equal('note');
    expect(r.recordType).to.equal('note');
  });

  it('support subscription', function () {
    let r = new Note();
    r['key'] = 'okay';
    expect(r['key']).to.be.equal('okay');
    expect(r.attributeKeys).to.include('key');
  });

  it('parse meta _created_at and _updated_at correctly', function () {
    let r = new Note({
      '_created_at': '2014-09-27T17:40:00.000Z',
      '_updated_at': '2014-10-27T17:40:00.000Z',
      'print_at': {$type: 'date', $date: '2014-11-27T17:40:00.000Z'},
      'content': 'hi ourd',
      'noteOrder': 1,
      'ref': {$type: "ref", $id: "note/note1"},
      'geo': {$type: "geo", $lat: 10, $lng: 20},
      'tags': []
    });
    expect(r.createdAt.getTime()).to.be.equal(
      new Date('2014-09-27T17:40:00.000Z').getTime());
    expect(r.updatedAt.getTime()).to.be.equal(
      new Date('2014-10-27T17:40:00.000Z').getTime());
    expect(r['print_at'].getTime()).to.be.equal(
      new Date('2014-11-27T17:40:00.000Z').getTime());
  });

  it('attributeKeys filter transient field', function () {
    let r = new Note();
    r['_key'] = 'impermanent';
    expect(r['_key']).to.be.equal('impermanent');
    expect(r.attributeKeys).to.not.include('_key');
  });

  it('serialize to payload', function () {
    let r = new Note({
      _id: 'note/uid',
      _acl: [
        {
          level: AccessLevel.ReadLevel,
          role: '_public'
        },
        {
          level: AccessLevel.WriteLevel,
          role: 'Writer'
        }
      ],
      content: 'hello world'
    });
    expect(r.toJSON()).to.be.eql({
      _id: 'note/uid',
      _acl: [
        {
          level: AccessLevel.ReadLevel,
          role: '_public'
        },
        {
          level: AccessLevel.WriteLevel,
          role: 'Writer'
        }
      ],
      content: 'hello world'
    });
  });

  it('serialize to payload with sequence', function () {
    let note = new Note({
      _id: 'note/uid'
    });
    note.noteID = new Sequence();
    expect(note.toJSON()).to.be.eql({
      _id: 'note/uid',
      _acl: [{
        level: AccessLevel.ReadLevel,
        role: '_public'
      }],
      noteID: {
        $type: 'seq'
      }
    });
  });

  it('deserialize from payload with geolocation', function () {
    let payload = {
      _id: 'note/uid',
      geo: {$type: 'geo', $lat: 10, $lng: 20}
    };
    let r = new Record('note', payload);
    expect(r['geo']).to.be.an.instanceof(Geolocation);
  });

});
/*eslint-enable dot-notation, max-len, new-cap, no-new, no-unused-vars, quote-props, quotes */
