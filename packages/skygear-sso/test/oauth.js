/* global window:false */
import { assert, expect } from 'chai';
import { injectToContainer } from '../lib/index';
import Container from '../../skygear-core/lib/container';
import mockSuperagent from '../../skygear-core/test/mock/superagent';


describe('SSO OAuth', function () {
  this.timeout(7000);

  function newMessageEvent(data, origin) {
    return new window.MessageEvent('message', {
      data,
      origin
    });
  }

  // setup container
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.configEndPoint('http://skygear.dev');
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/sso/provider/login_auth_url',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          auth_url: 'http://auth_url_of_provider' // eslint-disable-line camelcase
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/sso/provider/link_auth_url',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          auth_url: 'http://auth_url_of_provider' // eslint-disable-line camelcase
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/sso/provider/login',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          result: {
            user_id: 'user-id-1', // eslint-disable-line camelcase
            profile: {
              _type: 'record', // eslint-disable-line camelcase
              _recordType: 'user', // eslint-disable-line camelcase
              _recordID: 'user-id-1', // eslint-disable-line camelcase
              _access: null, // eslint-disable-line camelcase
              username: 'user1',
              email: 'user1@skygear.dev'
            }
          }
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/sso/provider/link',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          result: 'OK'
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/sso/provider/unlink',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          result: 'OK'
        }
      });
    }
  }]);
  container.configApiKey('correctApiKey');
  injectToContainer(container);

  it('can login with access token', async function () {
    const user = await container.auth.loginOAuthProviderWithAccessToken(
      'provider',
      'accessToken'
    );
    expect(user).not.be.null();
    expect(user.email).to.eql('user1@skygear.dev');
  });

  it('can link with access token', async function () {
    const response = await container.auth.linkOAuthProviderWithAccessToken(
      'provider',
      'accessToken'
    );
    expect(response).not.be.null();
    expect(response.result).to.eql('OK');
  });

  it('can unlink oauth', async function () {
    const response = await container.auth.unlinkOAuthProvider('provider');
    expect(response).not.be.null();
    expect(response.result).to.eql('OK');
  });

  it('can login oauth with popup', async function (done) {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();
    global.window.open = function () {
      let newWindow = new MockBrowser().getWindow();
      return newWindow;
    };

    // mock message post from opened window
    setTimeout(function () {
      let result = {
        result: {
          user_id: 'user-id-1', // eslint-disable-line camelcase
          profile: {
            _type: 'record', // eslint-disable-line camelcase
            _recordType: 'user', // eslint-disable-line camelcase
            _recordID: 'user-id-1', // eslint-disable-line camelcase
            _access: null, // eslint-disable-line camelcase
            username: 'user1',
            email: 'user1@skygear.dev'
          }
        }
      };
      window.dispatchEvent(newMessageEvent({
        type: 'result',
        result
      }, 'http://skygear.dev'));
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygear.dev'));
    }, 50);

    const user = await container.auth.loginOAuthProviderWithPopup(
      'provider',
      {}
    );
    expect(user).not.be.null();
    expect(user.email).to.eql('user1@skygear.dev');
    done();
  });

  it('user close window when login oauth with popup', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();
    // mock window will be closed by user
    global.window.open = function () {
      let newWindow = new MockBrowser().getWindow();
      setTimeout(function () {
        newWindow.closed = true;
      }, 1000);
      return newWindow;
    };

    try {
      await container.auth.loginOAuthProviderWithPopup('provider', {});
      assert.fail('should fail');
    } catch (error) {
      expect(error).not.be.null();
      expect(error.message).eq('User cancel the login flow');
    }
  });

  it('can link oauth with popup', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();
    global.window.open = function () {
      let newWindow = new MockBrowser().getWindow();
      return newWindow;
    };

    // mock message post from opened window
    setTimeout(function () {
      let result = {
        result: 'OK'
      };
      window.dispatchEvent(newMessageEvent({
        type: 'result',
        result
      }, 'http://skygear.dev'));
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygear.dev'));
    }, 50);

    const result = await container.auth.linkOAuthProviderWithPopup(
      'provider',
      {}
    );
    expect(result).not.be.null();
    expect(result.result).to.eql('OK');
  });

  it('should not intercept link oauth by message from different origin',
  async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();
    global.window.open = function () {
      let newWindow = new MockBrowser().getWindow();
      return newWindow;
    };

    // mock message post from opened window
    setTimeout(function () {
      let result = {
        result: 'OK'
      };
      // message from different origin
      window.dispatchEvent(newMessageEvent({
        type: 'error',
        error: { error: 'error' }
      }, 'http://example.com'));

      // sso message
      window.dispatchEvent(newMessageEvent({
        type: 'result',
        result
      }, 'http://skygear.dev'));
      // sso message
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygear.dev'));
    }, 50);

    const result = await container.auth.linkOAuthProviderWithPopup(
      'provider',
      {}
    );
    expect(result).not.be.null();
    expect(result.result).to.eql('OK');
  });
});
