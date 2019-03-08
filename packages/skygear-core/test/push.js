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
import _ from 'lodash';
import {assert, expect} from 'chai';
import Container from '../lib/container';

import mockSuperagent from './mock/superagent';

describe('Container device registration', function () {
  let container = new Container();
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

  it(
    'should save device id successfully',
    async function () {
      await container.push._setDeviceID(null);
      const deviceID = await container.push.registerDevice(
        'device-token',
        'android'
      );
      assert.equal(deviceID, 'device-id');
      assert.equal(container.push.deviceID, 'device-id');
    }
  );

  it('should send app bundle name', async function () {
    await container.push._setDeviceID(null);
    const deviceID = await container.push.registerDevice(
      'device-token', 'android', 'bundle-name');
    assert.equal(deviceID, 'topic-device-id');
    assert.equal(container.push.deviceID, 'topic-device-id');
  });

  it('should attach existing device id', async function () {
    await container.push._setDeviceID('existing-device-id');
    const deviceID = await container.push.registerDevice(
      'device-token',
      'ios'
    );
    assert.equal(deviceID, 'existing-device-id');
    assert.equal(container.push.deviceID, 'existing-device-id');
  });

  it('should retry with null deviceID on first call fails', async function () {
    await container.push._setDeviceID('non-exist');
    const deviceID = await container.push.registerDevice('device-token', 'ios');
    assert.equal(deviceID, 'device-id');
    assert.equal(container.push.deviceID, 'device-id');
  });

  it('should be able to set null deviceID', async function () {
    await container.push._setDeviceID(null);
    assert.equal(container.push.deviceID, null);
  });
});

describe('Container device unregistration', function () {
  let container = new Container();
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

  it('should success with correct device id', async function () {
    await container.push._setDeviceID('device_1');
    await container.push.unregisterDevice();
  });

  it('should regard as success with non-exist device id', async function () {
    await container.push._setDeviceID('non-exist');
    await container.push.unregisterDevice();
  });

  it('should fail when no device id', async function () {
    try {
      await container.push._setDeviceID(null);
      await container.push.unregisterDevice();
      assert.fail('should fail');
    } catch (err) {
      // do nothing
    }
  });
});

describe('Container Push User', function () {
  let container = new Container();
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/push/user',
    fixtures: function (match, params, headers, fn) {
      if (params.topic !== 'the-topic') {
        return fn({
          'error': {
            'name': 'UnexpectedError',
            'code': 10000,
            'message': 'topic is not correct'
          }
        }, 500);
      }
      assert.equal(_.get(params, 'notification.apns.aps.sound'), 'chime');
      assert.isArray(params.user_ids);

      return fn({
        'result': _.map(params.user_ids, function (user) {
          assert.isString(user);
          return {
            '_id': user
          };
        })
      });
    }
  }]);
  container.configApiKey('correctApiKey');

  it('should send push to user', async function () {
    const result = await container.push.sendToUser(
      ['user-id1', 'user-id2'],
      {
        apns: {
          aps: {
            sound: 'chime'
          }
        }
      },
      'the-topic'
    );
    assert.deepEqual(result, [
      {
        '_id': 'user-id1'
      },
      {
        '_id': 'user-id2'
      }
    ]);
  });

  it('should send push to user with string ID', async function () {
    const result = await container.push.sendToUser(
      'user-id',
      {
        apns: {
          aps: {
            sound: 'chime'
          }
        }
      },
      'the-topic'
    );
    assert.deepEqual(result, [
      {
        '_id': 'user-id'
      }
    ]);
  });

  it('should send push to user with object', async function () {
    const result = await container.push.sendToUser(
      [
        {
          id: 'user-id1'
        },
        {
          id: 'user-id2'
        }
      ],
      {
        apns: {
          aps: {
            sound: 'chime'
          }
        }
      },
      'the-topic'
    );
    assert.deepEqual(result, [
      {
        '_id': 'user-id1'
      },
      {
        '_id': 'user-id2'
      }
    ]);
  });

  it('should handle error', async function () {
    try {
      await container.push.sendToUser(
        ['user-id'],
        {
          apns: {
            aps: {
              sound: 'chime'
            }
          }
        },
        'wrong-topic'
      );
      assert.fail('should fail');
    } catch (error) {
      assert.equal(error.name, 'UnexpectedError');
    }
  });
});

describe('Container Push Device', function () {
  let container = new Container();
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/push/device',
    fixtures: function (match, params, headers, fn) {
      if (params.topic !== 'the-topic') {
        return fn({
          'error': {
            'name': 'UnexpectedError',
            'code': 10000,
            'message': 'topic is not correct'
          }
        }, 500);
      }
      assert.equal(_.get(params, 'notification.apns.aps.sound'), 'chime');
      assert.isArray(params.device_ids);

      return fn({
        'result': _.map(params.device_ids, function (device) {
          assert.isString(device);
          return {
            '_id': device
          };
        })
      });
    }
  }]);
  container.configApiKey('correctApiKey');

  it('should send push to device', async function () {
    const result = await container.push.sendToDevice(
      ['device-id1', 'device-id2'],
      {
        apns: {
          aps: {
            sound: 'chime'
          }
        }
      },
      'the-topic'
    );
    assert.deepEqual(result, [
      {
        '_id': 'device-id1'
      },
      {
        '_id': 'device-id2'
      }
    ]);
  });

  it('should send push to device with string ID', async function () {
    const result = await container.push.sendToDevice(
      'device-id',
      {
        apns: {
          aps: {
            sound: 'chime'
          }
        }
      },
      'the-topic'
    );
    assert.deepEqual(result, [
      {
        '_id': 'device-id'
      }
    ]);
  });

  it('should send push to device with object', async function () {
    const result = await container.push.sendToDevice(
      [
        {
          id: 'device-id1'
        },
        {
          id: 'device-id2'
        }
      ],
      {
        apns: {
          aps: {
            sound: 'chime'
          }
        }
      },
      'the-topic'
    );
    assert.deepEqual(result, [
      {
        '_id': 'device-id1'
      },
      {
        '_id': 'device-id2'
      }
    ]);
  });

  it('should handle error', async function () {
    try {
      const result = await container.push.sendToDevice(
        ['device-id'],
        {
          apns: {
            aps: {
              sound: 'chime'
            }
          }
        },
        'wrong-topic'
      );
      assert.fail('should fail');
    } catch (error) {
      assert.equal(error.name, 'UnexpectedError');
    }
  });
});

/*eslint-enable dot-notation, no-unused-vars, quote-props */
