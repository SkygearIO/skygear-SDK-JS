/*eslint-disable camelcase, no-new */
import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import Query from '../lib/query';
import Record from '../lib/record';
import Reference from '../lib/reference';
import Geolocation from '../lib/geolocation';

describe('Query', function () {

  let Note = Record.extend('note');

  it('reject invalid recordType', function () {
    expect(function () {
      new Query({});
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );

    expect(function () {
      new Query('note');
    }).to.throw(
      'RecordType is not valid. Please start with alphanumeric string.'
    );
  });

  it('have default limit(50) and offset(0)', function () {
    let q = new Query(Note);
    expect(q.limit).to.be.equal(50);
    expect(q.offset).to.be.equal(0);
  });

  it('store the recordType of record class', function () {
    let q = new Query(Note);
    expect(q.recordType).to.be.equal('note');
  });

  it('default return null predicate', function () {
    let q = new Query(Note);
    expect(q.predicate).to.eql([]);
  });

  it('add equal to predicate', function () {
    let q = new Query(Note);
    q.equalTo('content', 'First one');
    expect(q.predicate).to.deep.include.members(['eq', {
      $type: 'keypath',
      $val: 'content'
    }, 'First one']);
  });

  it('add not equal to predicate', function () {
    let q = new Query(Note);
    q.notEqualTo('content', 'First one');
    expect(q.predicate).to.deep.include.members(['neq', {
      $type: 'keypath',
      $val: 'content'
    }, 'First one']);
  });

  it('add greater than to predicate', function () {
    let q = new Query(Note);
    q.greaterThan('price', 10);
    expect(q.predicate).to.deep.include.members(['gt', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add greater than or equal to predicate', function () {
    let q = new Query(Note);
    q.greaterThanOrEqualTo('price', 10);
    expect(q.predicate).to.deep.include.members(['gte', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add less than to predicate', function () {
    let q = new Query(Note);
    q.lessThan('price', 10);
    expect(q.predicate).to.deep.include.members(['lt', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add less than or equal to to predicate', function () {
    let q = new Query(Note);
    q.lessThanOrEqualTo('price', 10);
    expect(q.predicate).to.deep.include.members(['lte', {
      $type: 'keypath',
      $val: 'price'
    }, 10]);
  });

  it('add less than distance to to predicate', function () {
    let q = new Query(Note);
    q.distanceLessThan('geo', new Geolocation(10, 20), 200);
    expect(q.predicate).to.deep.include.members(['lt', [
      'func',
      'distance',
      {$type: 'keypath', $val: 'geo'},

      {$type: 'geo', $lng: 20, $lat: 10}
    ], 200]);
  });

  it('add greater than distance to to predicate', function () {
    let q = new Query(Note);
    q.distanceGreaterThan('geo', new Geolocation(10, 20), 200);
    expect(q.predicate).to.deep.include.members(['gt', [
      'func',
      'distance',
      {$type: 'keypath', $val: 'geo'},
      {$type: 'geo', $lng: 20, $lat: 10}
    ], 200]);
  });

  it('add contains to predicate', function () {
    let q = new Query(Note);
    q.contains('category', ['a', 'b']);
    expect(q.predicate).to.deep.include.members(['in', {
      $type: 'keypath',
      $val: 'category'
    }, ['a', 'b']]);
  });

  it('sort by ascending distance', function () {
    let q = new Query(Note);
    q.addAscendingByDistance('geo', new Geolocation(10, 20));
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      sort: [
        [
          [
            'func',
            'distance',
            {$type: 'keypath', $val: 'geo'},
            {$type: 'geo', $lng: 20, $lat: 10}
          ],
          'asc'
        ]
      ],
      limit: 50,
      count: false
    });
  });

  it('sort by descending distance', function () {
    let q = new Query(Note);
    q.addDescendingByDistance('geo', new Geolocation(10, 20));
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      sort: [
        [
          [
            'func',
            'distance',
            {$type: 'keypath', $val: 'geo'},
            {$type: 'geo', $lng: 20, $lat: 10}
          ],
          'desc'
        ]
      ],
      limit: 50,
      count: false
    });
  });

  it('add transient include', function () {
    let q = new Query(Note);
    q.transientInclude('category', 'cat');
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {cat: {$type: 'keypath', $val: 'category'}},
      limit: 50,
      sort: [],
      count: false
    });
  });

  it('add transient include distance', function () {
    let q = new Query(Note);
    q.transientIncludeDistance('location', 'my_distance',
        new Geolocation(10, 20));
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {
        my_distance:
        [
          'func',
          'distance',
          {$type: 'keypath', $val: 'location'},
          {$type: 'geo', $lng: 20, $lat: 10}
        ]
      },
      limit: 50,
      sort: [],
      count: false
    });
  });

  it('get count', function () {
    let q = new Query(Note);
    q.overallCount = true;
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      count: true
    });
  });

  it('have multiple predicate with and', function () {
    let q = new Query(Note);
    q.equalTo('content', 'food');
    q.greaterThan('price', 10);
    expect(q.predicate).to.deep.include.members([
      'and',
      ['gt', {
        $type: 'keypath',
        $val: 'price'
      }, 10],
      ['eq', {
        $type: 'keypath',
        $val: 'content'
      }, 'food']
    ]);
  });

  it('have multiple predicate on same key', function () {
    let q = new Query(Note);
    q.lessThanOrEqualTo('price', 100);
    q.greaterThan('price', 0);
    expect(q.predicate).to.deep.include.members([
      'and',
      ['gt', {
        $type: 'keypath',
        $val: 'price'
      }, 0],
      ['lte', {
        $type: 'keypath',
        $val: 'price'
      }, 100]
    ]);
  });

  it('serialize a reference inside', function () {
    let q = new Query(Note);
    let ref = new Reference('record/id');
    q.equalTo('ref', ref);
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      predicate: [
        'eq',
        {$type: 'keypath', $val: 'ref'},
        {$type: 'ref', $id: 'record/id'}
      ],
      sort: [],
      limit: 50,
      count: false
    });
  });

  it('serialize a simple query payload', function () {
    let q = new Query(Note);
    q.like('content', 'hello');
    q.limit = 10;
    q.offset = 5;
    q.addDescending('noteOrder');
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 10,
      offset: 5,
      sort: [[{
        $type: 'keypath',
        $val: 'noteOrder'
      }, 'desc']],
      predicate: ['like', {
        $type: 'keypath',
        $val: 'content'
      }, 'hello'],
      count: false
    });
  });

  it('serialize like', function () {
    let q = new Query(Note);
    q.caseInsensitiveLike('content', 'hello');
    expect(q.toJSON().predicate).to.eql([
      'ilike',
      {
        $type: 'keypath',
        $val: 'content'
      },
      'hello']);
  });

  it('serialize a simple or query', function () {
    let con1 = new Query(Note);
    con1.greaterThan('count', 100);
    let con2 = new Query(Note);
    con2.lessThan('count', 10);
    let query = Query.or(con1, con2);
    expect(query.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'or',
        ['gt', {
          $type: 'keypath',
          $val: 'count'
        }, 100],
        ['lt', {
          $type: 'keypath',
          $val: 'count'
        }, 10]
      ],
      count: false
    });
  });

  it('serialize a nested or/and query', function () {
    let con1 = new Query(Note);
    con1.equalTo('count', 0);
    let con2 = new Query(Note);
    con2.lessThan('count', 100);
    con2.greaterThan('count', 10);
    let query = Query.or(con1, con2);
    expect(query.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'or',
        ['eq', {
          $type: 'keypath',
          $val: 'count'
        }, 0],
        [
          'and',
          ['lt', {
            $type: 'keypath',
            $val: 'count'
          }, 100],
          ['gt', {
            $type: 'keypath',
            $val: 'count'
          }, 10
          ]
        ]
      ],
      count: false
    });
  });

  it('serialize a nested or/and query with first-level and', function () {
    let con1 = new Query(Note);
    con1.equalTo('count', 0);
    let con2 = new Query(Note);
    con2.lessThan('count', 100);
    con2.greaterThan('count', 10);
    let query = Query.or(con1, con2);
    query.equalTo('name', 'hi');
    expect(query.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'and',
        ['eq', {
          $type: 'keypath',
          $val: 'name'
        }, 'hi'],
        [
          'or',
          ['eq', {
            $type: 'keypath',
            $val: 'count'
          }, 0],
          [
            'and',
            ['lt', {
              $type: 'keypath',
              $val: 'count'
            }, 100],
            ['gt', {
              $type: 'keypath',
              $val: 'count'
            }, 10
            ]
          ]
        ]
      ],
      count: false
    });
  });

});
/*eslint-enable camelcase, no-new */
