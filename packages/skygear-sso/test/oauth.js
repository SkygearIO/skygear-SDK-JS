/* global window:false */
import { expect } from 'chai';
import { injectToContainer } from '../lib/index';
import Container from '../../skygear-core/lib/container';
import mockSuperagent from '../../skygear-core/test/mock/superagent';


describe('SSO OAuth', function () {
  // setup container
  let container = new Container();
  container.pubsub.autoPubsub = false;
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
              _id: 'user/user-id-1', // eslint-disable-line camelcase
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

  it('can login with access token', function (done) {
    container.auth.loginOAuthProviderWithAccessToken('provider', 'accessToken')
      .then(function (user) {
        expect(user).not.be.null();
        expect(user.email).to.eql('user1@skygear.dev');
        done();
      });
  });

  it('can link with access token', function (done) {
    container.auth.linkOAuthProviderWithAccessToken('provider', 'accessToken')
      .then(function (response) {
        expect(response).not.be.null();
        expect(response.result).to.eql('OK');
        done();
      });
  });

  it('can unlink oauth', function (done) {
    container.auth.unlinkOAuthProvider('provider')
      .then(function (response) {
        expect(response).not.be.null();
        expect(response.result).to.eql('OK');
        done();
      });
  });

  it('can login oauth with popup', function (done) {
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
            _id: 'user/user-id-1', // eslint-disable-line camelcase
            _access: null, // eslint-disable-line camelcase
            username: 'user1',
            email: 'user1@skygear.dev'
          }
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

    container.auth.loginOAuthProviderWithPopup('provider', {})
      .then(function (user) {
        expect(user).not.be.null();
        expect(user.email).to.eql('user1@skygear.dev');
        done();
      });
  });

  it('user close window when login oauth with popup', function (done) {
    this.timeout(4000);

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

    container.auth.loginOAuthProviderWithPopup('provider', {})
      .then(done).catch(function (error) {
        const err = error.error;
        expect(err).not.be.null();
        expect(err.message).eq('User cancel the login flow');
        done();
      });
  });

  it('can link oauth with popup', function (done) {
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

    container.auth.linkOAuthProviderWithPopup('provider', {})
      .then(function (result) {
        expect(result).not.be.null();
        expect(result.result).to.eql('OK');
        done();
      }).catch(function (error) {
        done(error);
      });
  });
});
