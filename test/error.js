/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/*eslint-disable camelcase */
import {expect} from 'chai';
import {ErrorCodes, SkygearError} from '../lib/error';

describe('SkygearError', function () {
  it('constructor with all parameters', function () {
    const err = new SkygearError(
      'a bad request',
      ErrorCodes.BadRequest,
      {content: 'bad'}
    );
    expect(err).to.be.an.instanceof(SkygearError);
    expect(err.toString()).eql('SkygearError: a bad request');
    expect(err.code).eql(ErrorCodes.BadRequest);
    expect(err.message).eql('a bad request');
    expect(err.info).eql({content: 'bad'});
  });

  it('constructor with message', function () {
    const err = new SkygearError('unknown error');
    expect(err.toString()).eql('SkygearError: unknown error');
    expect(err.code).eql(ErrorCodes.UnexpectedError);
    expect(err.message).eql('unknown error');
    expect(err.info).eql(null);
  });

  it('toJSON', function () {
    const err = new SkygearError(
      'a bad request',
      ErrorCodes.BadRequest,
      {content: 'bad'}
    );
    expect(err.toJSON()).eql({
      code: 107,
      name: 'BadRequest',
      message: 'a bad request',
      info: {content: 'bad'}
    });
  });

  it('fromJSON', function () {
    const err = SkygearError.fromJSON({
      code: 107,
      name: 'BadRequest',
      message: 'a bad request',
      info: {content: 'bad'}
    });
    expect(err.toString()).eql('SkygearError: a bad request');
    expect(err.code).eql(ErrorCodes.BadRequest);
    expect(err.message).eql('a bad request');
    expect(err.info).eql({content: 'bad'});
  });
});
/*eslint-enable camelcase */

