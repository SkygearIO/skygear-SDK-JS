/* global window:false */
import { assert, expect } from 'chai';
import { injectToContainer } from '../lib/index';
import Container from '../../skygear-core/lib/container';
import mockSuperagent from '../../skygear-core/test/mock/superagent';


describe('SSO OAuth', function () {
  this.timeout(7000);

  // setup container
  let container = new Container();
  container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/_auth/sso/provider/login_auth_url',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: 'http://auth_url_of_provider'
      });
    }
  }, {
    pattern: 'http://skygear.dev/_auth/sso/provider/link_auth_url',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: 'http://auth_url_of_provider'
      });
    }
  }, {
    pattern: 'http://skygear.dev/_auth/sso/provider/login',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          user_id: 'user-id-1', // eslint-disable-line camelcase
          login_ids: { // eslint-disable-line camelcase
            username: 'user1',
            email: 'user1@skygear.dev'
          },
          metadata: {}
        }
      });
    }
  }, {
    pattern: 'http://skygear.dev/_auth/sso/provider/link',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: 'OK'
      });
    }
  }, {
    pattern: 'http://skygear.dev/_auth/sso/provider/unlink',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: 'OK'
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
    expect(user.loginIDs.email).to.eql('user1@skygear.dev');
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
          login_ids: { // eslint-disable-line camelcase
            username: 'user1',
            email: 'user1@skygear.dev'
          },
          metadata: {}
        }
      };
      window.postMessage({
        type: 'result',
        result
      }, '*');
      window.postMessage({
        type: 'end'
      }, '*');
    }, 50);

    const user = await container.auth.loginOAuthProviderWithPopup(
      'provider',
      {}
    );
    expect(user).not.be.null();
    expect(user.loginIDs.email).to.eql('user1@skygear.dev');
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
      window.postMessage({
        type: 'result',
        result
      }, '*');
      window.postMessage({
        type: 'end'
      }, '*');
    }, 50);

    const result = await container.auth.linkOAuthProviderWithPopup(
      'provider',
      {}
    );
    expect(result).not.be.null();
    expect(result.result).to.eql('OK');
  });
});
