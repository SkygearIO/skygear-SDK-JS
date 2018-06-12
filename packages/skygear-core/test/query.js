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
/*eslint-disable camelcase, no-new */
import {expect, assert} from 'chai'; //eslint-disable-line no-unused-vars
import Query from '../lib/query';
import Record from '../lib/record';
import Reference from '../lib/reference';
import Geolocation from '../lib/geolocation';
import {Relation, Mutual} from '../lib/relation';

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

  it('add like to predicate', function () {
    let q = new Query(Note);
    q.like('name', 'funny');
    expect(q.predicate).to.deep.include.members([
      'like',
      {
        $type: 'keypath',
        $val: 'name'
      },
      'funny'
    ]);
  });

  it('add case insensitive like to predicate', function () {
    let q = new Query(Note);
    q.caseInsensitiveLike('name', 'funny');
    expect(q.predicate).to.deep.include.members([
      'ilike',
      {
        $type: 'keypath',
        $val: 'name'
      },
      'funny'
    ]);
  });

  it('add not like to predicate', function () {
    let q = new Query(Note);
    q.notLike('name', 'funny');
    expect(q.predicate).to.deep.include.members([
      'not',
      [
        'like',
        {
          $type: 'keypath',
          $val: 'name'
        },
        'funny'
      ]
    ]);
  });

  it('add case insensitive not like to predicate', function () {
    let q = new Query(Note);
    q.caseInsensitiveNotLike('name', 'funny');
    expect(q.predicate).to.deep.include.members([
      'not',
      [
        'ilike',
        {
          $type: 'keypath',
          $val: 'name'
        },
        'funny'
      ]
    ]);
  });

  it('add contains to predicate', function () {
    let q = new Query(Note);
    q.contains('category', ['a', 'b']);
    expect(q.predicate).to.deep.include.members(['in', {
      $type: 'keypath',
      $val: 'category'
    }, ['a', 'b']]);
  });

  it('add containsValue to predicate', function () {
    let q = new Query(Note);
    q.containsValue('category', 'a');
    expect(q.predicate).to.deep.include.members(['in',
      'a',
      {
        $type: 'keypath',
        $val: 'category'
      }
    ]);
  });

  it('add not contains to predicate', function () {
    let q = new Query(Note);
    q.notContains('category', ['a', 'b']);
    expect(q.predicate).to.deep.include.members([
      'not',
      [
        'in',
        {$type: 'keypath', $val: 'category'},
        ['a', 'b']
      ]
    ]);
  });

  it('add not contains value to predicate', function () {
    let q = new Query(Note);
    q.notContainsValue('category', 'a');
    expect(q.predicate).to.deep.include.members([
      'not',
      [
        'in',
        'a',
        {$type: 'keypath', $val: 'category'}
      ]
    ]);
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

  it('serialize a query with pagination', function () {
    let q = new Query(Note);
    q.like('content', 'hello');
    q.limit = 10;
    q.page = 2;
    q.addDescending('noteOrder');
    expect(q.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 10,
      page: 2,
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

  it('serialize havingRelation', function () {
    let q = new Query(Note);
    let Friend = Relation.extend('friend', Mutual);
    q.havingRelation('_owner', Friend);
    expect(q.toJSON().predicate).to.eql([
      'func',
      'userRelation',
      {
        $type: 'keypath',
        $val: '_owner'
      },
      {
        $type: 'relation',
        $name: '_friend',
        $direction: 'mutual'
      }
    ]);
  });

  it('serialize notHavingRelation', function () {
    let q = new Query(Note);
    let Friend = Relation.extend('friend', Mutual);
    q.notHavingRelation('_owner', Friend);
    expect(q.toJSON().predicate).to.eql([
      'not',
      [
        'func',
        'userRelation',
        {$type: 'keypath', $val: '_owner'},
        {$type: 'relation', $name: '_friend', $direction: 'mutual'}
      ]
    ]);
  });

  it('serialize a simple and query', function () {
    let con1 = new Query(Note);
    con1.greaterThan('count', 100);
    let con2 = new Query(Note);
    con2.lessThan('count', 10);
    let query = Query.and(con1, con2);
    expect(query.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'and',
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

  it('serialize a nested and/or query', function () {
    let con1 = new Query(Note);
    con1.greaterThan('count', 100);
    let con2 = new Query(Note);
    con2.lessThan('count', 10);
    let orQuery = Query.or(con1, con2);
    let con3 = new Query(Note);
    con3.equalTo('count', 0);
    let query = Query.and(orQuery, con3);
    expect(query.toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'and',
        [
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
        ['eq', {
          $type: 'keypath',
          $val: 'count'
        }, 0]
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

  it('serialize not query', function () {
    let q1 = new Query(Note);
    q1.equalTo('name', 'Hello');

    expect(Query.not(q1).toJSON()).to.eql({
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'not',
        [
          'eq', {
            $type: 'keypath',
            $val: 'name'
          }, 'Hello'
        ]
      ],
      count: false
    });
  });

  it('deserialize a simple query', function () {

    let json1 = {
      record_type: 'note',
      include: {},
      limit: 30,
      sort: [],
      predicate: [
        'gt', {
          $type: 'keypath',
          $val: 'price'
        }, 20
      ],
      count: true
    };

    expect(Query.fromJSON(json1).toJSON()).to.eql(json1);

    let json2 = {
      record_type: 'note',
      include: {},
      limit: 35,
      sort: [],
      predicate: [
        'and',
        [
          'gt', {
            $type: 'keypath',
            $val: 'price'
          }, 20
        ],
        [
          'lt', {
            $type: 'keypath',
            $val: 'price'
          }, 120
        ]
      ],
      count: true
    };

    expect(Query.fromJSON(json2).toJSON()).to.eql(json2);
  });

  it('deserialize a query with page', function () {
    let json1 = {
      record_type: 'note',
      include: {},
      limit: 30,
      page: 2,
      sort: [],
      predicate: [
        'gt', {
          $type: 'keypath',
          $val: 'price'
        }, 20
      ],
      count: true
    };

    expect(Query.fromJSON(json1).toJSON()).to.eql(json1);
  });

  it('deserialize an or query', function () {
    let json = {
      count: false,
      include: {},
      limit: 50,
      predicate: [
        'or',
        [
          'eq', {
            $type: 'keypath',
            $val: 'starred'
          }, true
        ],
        [
          'gt', {
            $type: 'keypath',
            $val: 'rate'
          }, 4
        ]
      ],
      record_type: 'note',
      sort: []
    };

    expect(Query.fromJSON(json).toJSON()).to.eql(json);
  });

  it('deserialize an or query with two not query', function () {
    let q1 = new Query(Note);
    q1.equalTo('name', 'Hello');
    let q2 = new Query(Note);
    q2.equalTo('name', 'World');
    let finalJSON = Query.or(Query.not(q1), Query.not(q2)).toJSON();
    expect(finalJSON.predicate).to.eql(
      [
        'or',
        [
          'not',
          [
            'eq', {
              $type: 'keypath',
              $val: 'name'
            }, 'Hello'
          ]
        ],
        [
          'not',
          [
            'eq', {
              $type: 'keypath',
              $val: 'name'
            }, 'World'
          ]
        ]
      ]
    );
    expect(Query.fromJSON(finalJSON).toJSON()).to.eql(finalJSON);
  });

  it('deserialize a complicated query', function () {
    let json = {
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
    };

    expect(Query.fromJSON(json).toJSON()).to.eql(json);
  });

  it('deserialize a not query', function () {
    let json = {
      record_type: 'note',
      include: {},
      limit: 50,
      sort: [],
      predicate: [
        'not',
        [
          'eq', {
            $type: 'keypath',
            $val: 'name'
          }, 'Hello'
        ]
      ],
      count: false
    };

    expect(Query.fromJSON(json).toJSON()).to.eql(json);
  });

});
/*eslint-enable camelcase, no-new */
