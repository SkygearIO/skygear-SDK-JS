/* global window:false */
import { expect } from 'chai';
import { injectToContainer } from '../lib/index';
import Container from '../../skygear-core/lib/container';
import mockSuperagent from '../../skygear-core/test/mock/superagent';


describe('SSO OAuth', function () {
  // setup container
  let container = new Container();
  container.pubsub.autoPubsub = false;
  container.request = container.request = mockSuperagent([{
    pattern: 'http://skygear.dev/sso/provider/login_auth_url',
    fixtures: function (match, params, headers, fn) {
      return fn({
        result: {
          auth_url: 'http://auth_url_of_provider' // eslint-disable-line camelcase
        }
      });
    }
  }]);
  container.configApiKey('correctApiKey');
  injectToContainer(container);

  // setup mock window
  let MockBrowser = require('mock-browser').mocks.MockBrowser;
  global.window = new MockBrowser().getWindow();

  it('can login oauth with popup', function (done) {
    // setup window open
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
});
