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
/*eslint-disable camelcase, dot-notation, max-len, new-cap, no-new, no-unused-vars, quote-props, quotes */
import {expect} from 'chai';
import Record, {isRecord} from '../lib/record';
import Role from '../lib/role';
import Reference from '../lib/reference';
import Asset from '../lib/asset';
import Geolocation from '../lib/geolocation';
import {Sequence, UnknownValue} from '../lib/type';
import {AccessLevel} from '../lib/acl';
import record from '../../skygear-sso/node_modules/skygear-core/dist/record';

const v4Spec = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

describe('Record', function () {
  it('reject invalid record type', function () {
    expect(function () {
      new Record('_notvalid');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  });

  it('accepts providing record type and record ID', function () {
    const r = new Record('note', {
      _recordType: 'note',
      _recordID: 'some-note-id'
    });

    expect(r.recordType).to.equal('note');
    expect(r.recordID).to.equal('some-note-id');
  });

  it('accepts only providing record ID', function () {
    const r = new Record('note', {
      _recordID: 'some-note-id'
    });

    expect(r.recordType).to.equal('note');
    expect(r.recordID).to.equal('some-note-id');
  });

  it('still accepts deprecated record ID', function () {
    const r = new Record('note', {
      _id: 'note/some-note-id'
    });

    expect(r.recordType).to.equal('note');
    expect(r.recordID).to.equal('some-note-id');
  });

  it('ignores deprecated record ID when the one in format exists', function () {
    const r = new Record('note', {
      _recordID: 'some-note-id',
      _id: 'note/some-old-note-id'
    });

    expect(r.recordType).to.equal('note');
    expect(r.recordID).to.equal('some-note-id');
  });

  it('handle falsy attrs', function () {
    let r = new Record('user', null);
    expect(r.recordType).to.equal('user');
    expect(v4Spec.test(r.recordID)).to.be.true();

    r = new Record('user', undefined);
    expect(r.recordType).to.equal('user');
    expect(v4Spec.test(r.recordID)).to.be.true();

    r = new Record('user', false);
    expect(r.recordType).to.equal('user');
    expect(v4Spec.test(r.recordID)).to.be.true();
  });

  it('generate with uuid v4 as id', function () {
    let r = new Record('note');
    expect(r.recordType).to.equal('note');
    expect(v4Spec.test(r.recordID)).to.be.true();
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

  it('isRecord returns true for extended Record', function () {
    let rCls = Record.extend('note');
    let r = new rCls();
    expect(isRecord(r)).to.be.true();
  });

  it('constructor attrs with different type objects should be retained',
    function () {
      const picture = new Asset({
        name: 'asset-name',
        url: 'http://server-will-ignore.me/'
      });
      const location = new Geolocation(10, 20);
      let r = new Record('note', {
        _recordType: 'note',
        _recordID: 'uid',
        attachment: picture,
        geo: location
      });
      expect(r['attachment']).to.be.an.instanceof(Asset);
      expect(r['geo']).to.be.an.instanceof(Geolocation);
      expect(r.toJSON()).eql({
        _access: null,
        _id: 'note/uid',
        _recordType: 'note',
        _recordID: 'uid',
        attachment: {
          $type: 'asset',
          $name: 'asset-name',
          $url: 'http://server-will-ignore.me/'
        },
        geo: {
          $type: 'geo',
          $lat: 10,
          $lng: 20
        }
      });
    }
  );
});

describe('Extended Record', function () {

  let Note = Record.extend('note');
  let Memo = Record.extend('memo');
  let Writer = Role.define('Writer');
  let Editor = Role.define('Editor');

  it('generate with uuid v4 as id', function () {
    let r = new Note();
    expect(r.recordType).to.equal('note');
    expect(v4Spec.test(r.recordID)).to.be.true();
  });

  it('accept explicit _recordID', function () {
    let r = new Note({
      _recordType: 'note',
      _recordID: '1'
    });
    expect(r.recordType).to.equal('note');
    expect(r.recordID).to.equal('1');
  });

  it('reject explicit _recordType with different type', function () {
    expect(function () {
      let r = new Note({
        _recordType: 'box',
        _recordID: '2'
      });
    }).to.throw(
      '_recordType box in attributes does not match ' +
      'the constructor recordType note'
    );
  });

  it('accept same object type in constructor', function () {
    let r0 = new Note({
      _recordType: 'note',
      _recordID: '1'
    });
    let r = new Note(r0);
    expect(r.recordType).to.equal('note');
    expect(r.recordID).to.equal('1');
  });

  it('reject different object type in constructor', function () {
    let e = new Memo({
      _recordType: 'memo',
      _recordID: '1'
    });
    expect(function () {
      let r = new Note(e);
    }).to.throw(
      '_recordType memo in attributes does not match ' +
      'the constructor recordType note'
    );
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
      'ref': {
        $type: "ref",
        $recordType: "note",
        $recordID: "note1"
      },
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
      _recordType: 'note',
      _recordID: 'uid',
      _ownerID: '9998fa1c-0f7e-430a-bdf3-1a2b429e27e5',
      _created_at: '2014-09-27T17:40:00.000Z',
      _updated_at: '2014-10-27T17:40:00.000Z',
      _created_by: '9998fa1c-0f7e-430a-bdf3-1a2b429e27e5',
      _updated_by: '9998fa1c-0f7e-430a-bdf3-1a2b429e27e5',
      _access: [
        { level: AccessLevel.ReadOnlyLevel, public: true },
        { level: AccessLevel.ReadWriteLevel, role: 'Writer' }
      ],
      content: 'hello world',
      _transient: {
        'content': 'hello world'
      }
    });
    expect(r.toJSON()).to.be.eql({
      _id: 'note/uid',
      _recordType: 'note',
      _recordID: 'uid',
      _ownerID: '9998fa1c-0f7e-430a-bdf3-1a2b429e27e5',
      _created_at: '2014-09-27T17:40:00.000Z',
      _updated_at: '2014-10-27T17:40:00.000Z',
      _created_by: '9998fa1c-0f7e-430a-bdf3-1a2b429e27e5',
      _updated_by: '9998fa1c-0f7e-430a-bdf3-1a2b429e27e5',
      _access: [
        { level: AccessLevel.ReadOnlyLevel, public: true },
        { level: AccessLevel.ReadWriteLevel, role: 'Writer' }
      ],
      content: 'hello world',
      _transient: {
        'content': 'hello world'
      }
    });
    expect(r.toTruncatedJSON()).to.be.eql({
      _id: 'note/uid',
      _recordType: 'note',
      _recordID: 'uid',
      _access: [
        { level: AccessLevel.ReadOnlyLevel, public: true },
        { level: AccessLevel.ReadWriteLevel, role: 'Writer' }
      ],
      content: 'hello world'
    });
  });

  it('serialize to payload with date', function () {
    const note = new Note({
      _recordType: 'note',
      _recordID: 'uid'
    });

    note.reminderTime = new Date(Date.UTC(2016, 5, 3, 12, 0, 0));

    expect(note.toJSON()).to.be.eql({
      _id: 'note/uid',
      _recordType: 'note',
      _recordID: 'uid',
      _access: null,
      reminderTime: {
        $type: "date",
        $date: "2016-06-03T12:00:00.000Z"
      }
    });
  });

  it('serialize with undefined value', function () {
    const note = new Note({
      _recordType: 'note',
      _recordID: 'uid',
      content: undefined
    });

    expect(() => note.toJSON())
      .to.throw('Unsupported undefined value of record key: content');
  });

  it('deserialize from payload with date', function () {
    const note = new Note({
      _recordType: 'note',
      _recordID: 'uid',
      reminderTime: {
        $type: "date",
        $date: "2016-06-03T12:00:00.000Z"
      }
    });

    const reminderTime = note.reminderTime;
    expect(reminderTime).to.be.an.instanceof(Date);
    expect(reminderTime).to.eql(new Date(Date.UTC(2016, 5, 3, 12, 0, 0)));
  });

  it('serialize reference correctly', function () {
    let n1 = new Note({
      _recordType: 'note',
      _recordID: 'note-1',
      _access: [{ level: AccessLevel.ReadOnlyLevel, public: true }],
      content: 'hello world'
    });
    let n2 = new Note({
      _recordType: 'note',
      _recordID: 'note-2',
      _access: [{ level: AccessLevel.ReadOnlyLevel, public: true }],
      content: 'foo bar'
    });

    n2.replyTo = new Reference(n1);

    expect(n2.toJSON()).to.be.eql({
      _id: 'note/note-2',
      _recordType: 'note',
      _recordID: 'note-2',
      _access: [{ level: AccessLevel.ReadOnlyLevel, public: true }],
      replyTo: {
        "$id": "note/note-1",
        "$recordType": "note",
        "$recordID": "note-1",
        "$type": "ref"
      },
      content: 'foo bar'
    });
  });

  it('serialize to payload with sequence', function () {
    let note = new Note({
      _recordType: 'note',
      _recordID: 'uid'
    });
    note.noteID = new Sequence();
    expect(note.toJSON()).to.be.eql({
      _id: 'note/uid',
      _recordType: 'note',
      _recordID: 'uid',
      _access: null,
      noteID: {
        $type: 'seq'
      }
    });
  });

  it('serialize to payload with unknown value', function () {
    let note = new Note({
      _recordType: 'note',
      _recordID: 'uid'
    });
    note.noteID = new UnknownValue('money');
    expect(note.toJSON()).to.be.eql({
      _id: 'note/uid',
      _recordType: 'note',
      _recordID: 'uid',
      _access: null,
      noteID: {
        $type: 'unknown',
        '$underlying_type': 'money'
      }
    });
  });

  it('deserialize attrs and extend record', function () {
    let payload = {
      _recordType: 'note',
      _recordID: 'uid'
    };
    let r = Record.fromJSON(payload);
    expect(r.recordType).to.be.equal('note');
    expect(r.recordID).to.be.equal('uid');
  });

  it('deserialize from payload with geolocation', function () {
    let payload = {
      _recordType: 'note',
      _recordID: 'uid',
      geo: {$type: 'geo', $lat: 10, $lng: 20}
    };
    let r = new Record('note', payload);
    expect(r['geo']).to.be.an.instanceof(Geolocation);
  });

  it('deserialize from payload with reference', function () {
    let payload = {
      _recordType: 'note',
      _recordID: 'note-2',
      replyTo: {
        "$type": "ref",
        "$recordType": "note",
        "$recordID": "note-1"
      }
    };
    let r = new Record('note', payload);
    expect(r['replyTo']).to.be.an.instanceof(Reference);
  });

  it('deserialize from payload with unknown value', function () {
    let payload = {
      _recordType: 'note',
      _recordID: 'note-2',
      money: {"$type": "unknown", "$underlying_type": "money"}
    };
    let r = new Record('note', payload);
    expect(r['money']).to.be.an.instanceof(UnknownValue);
    expect(r['money'].underlyingType).to.equal('money');
  });

  it('acl', function () {
    let note = new Note({
      _recordType: 'note',
      _recordID: 'uid',
      _access: [
        { level: AccessLevel.ReadOnlyLevel, public: true },
        { level: AccessLevel.ReadWriteLevel, role: 'Writer' }
      ],
      content: 'hello world'
    });

    expect(note.access.toJSON()).to.be.eql([
      { level: AccessLevel.ReadOnlyLevel, public: true },
      { level: AccessLevel.ReadWriteLevel, role: 'Writer' }
    ]);

    note.setReadOnlyForRole(Writer);
    expect(note.access.toJSON()).to.be.eql([
      { level: AccessLevel.ReadOnlyLevel, public: true },
      { level: AccessLevel.ReadOnlyLevel, role: 'Writer' }
    ]);

    note.setPublicNoAccess();
    expect(note.access.toJSON()).to.be.eql([
      { level: AccessLevel.ReadOnlyLevel, role: 'Writer' }
    ]);

    note.setReadWriteAccessForRole(Editor);
    expect(note.access.toJSON()).to.be.eql([
      { level: AccessLevel.ReadOnlyLevel, role: 'Writer' },
      { level: AccessLevel.ReadWriteLevel, role: 'Editor' }
    ]);

    note.setNoAccessForRole(Writer);
    expect(note.access.toJSON()).to.be.eql([
      { level: AccessLevel.ReadWriteLevel, role: 'Editor' }
    ]);
  });

  it('set acl on new record', function () {
    let note = new Note();
    note.setPublicNoAccess();
    expect(note.access.toJSON()).to.be.eql([]);
  });
});
/*eslint-enable camelcase, dot-notation, max-len, new-cap, no-new, no-unused-vars, quote-props, quotes */
