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
/*eslint-disable dot-notation, no-unused-vars, quote-props */
import {assert, expect} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container device registration', function () {
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/device/register',
    fixtures: function (match, params, headers, fn) {
      if (params.id && params.id === 'non-exist') {
        return fn({
          'error': {
            'name': 'ResourceNotFound',
            'code': 110,
            'message': 'device not found'
          }
        }, 400);
      } else if (params.id) {
        return fn({
          'result': {
            'id': params.id
          }
        });
      } else if (params.topic) {
        return fn({
          'result': {
            'id': 'topic-device-id'
          }
        });
      } else {
        return fn({
          'result': {
            'id': 'device-id'
          }
        });
      }
    }
  }]);
  container.configApiKey('correctApiKey');

  it('should save device id successfully', function () {
    return container.push._setDeviceID(null).then(function () {
      return container.push.registerDevice('device-token', 'android');
    })
    .then(function (deviceID) {
      assert.equal(deviceID, 'device-id');
      assert.equal(container.push.deviceID, 'device-id');
    }, function () {
      throw 'failed to save device id';
    });
  });

  it('should send app bundle name', function () {
    return container.push._setDeviceID(null).then(function () {
      return container.push.registerDevice(
        'device-token', 'android', 'bundle-name');
    })
    .then(function (deviceID) {
      assert.equal(deviceID, 'topic-device-id');
      assert.equal(container.push.deviceID, 'topic-device-id');
    }, function () {
      throw 'failed to send app bundle name';
    });
  });

  it('should attach existing device id', function () {
    return container.push._setDeviceID('existing-device-id').then(function () {
      return container.push.registerDevice('ddevice-token', 'ios');
    }).then(function (deviceID) {
      assert.equal(deviceID, 'existing-device-id');
      assert.equal(container.push.deviceID, 'existing-device-id');
    });
  });

  it('should retry with null deviceID on first call fails', function () {
    return container.push._setDeviceID('non-exist').then(function () {
      return container.push.registerDevice('ddevice-token', 'ios');
    }).then(function (deviceID) {
      assert.equal(deviceID, 'device-id');
      assert.equal(container.push.deviceID, 'device-id');
    });
  });

  it('should be able to set null deviceID', function () {
    return container.push._setDeviceID(null).then(function () {
      assert.equal(container.push.deviceID, null);
    });
  });
});

describe('Container device unregistration', function () {
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.configApiKey('correctApiKey');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/device/unregister',
    fixtures: function (match, params, headers, fn) {
      if (params.id && params.id === 'non-exist') {
        return fn({
          'error': {
            'name': 'ResourceNotFound',
            'code': 110,
            'message': 'device not found'
          }
        }, 400);
      } else if (params.id) {
        return fn({
          'result': {
            'id': params.id
          }
        });
      } else {
        return fn({
          'error': {
            'name': 'InvalidArgument',
            'code': 108,
            'message': 'Missing device id',
            'info': {
              'arguments': [
                'id'
              ]
            }
          }
        });
      }
    }
  }]);

  it('should success with correct device id', function (done) {
    return container.push._setDeviceID('device_1')
    .then(function () {
      return container.push.unregisterDevice();
    })
    .then(function () {
      done();
    }, function () {
      throw new Error('Should not fail with correct device id');
    });
  });

  it('should regard as success with non-exist device id', function (done) {
    return container.push._setDeviceID('non-exist')
    .then(function () {
      return container.push.unregisterDevice();
    })
    .then(function () {
      done();
    }, function () {
      throw new Error('Should not fail with non-exist device id');
    });
  });

  it('should fail when no device id', function (done) {
    return container.push._setDeviceID(null)
    .then(function () {
      return container.push.unregisterDevice();
    })
    .then(function () {
      throw new Error('Should not success without device id');
    }, function () {
      done();
    });
  });
});
/*eslint-enable dot-notation, no-unused-vars, quote-props */
