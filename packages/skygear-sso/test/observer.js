/* global window:false */
import { expect } from 'chai';
import { NewWindowObserver, PostAuthResultObserver } from '../lib/observer';


describe('SSO observer', function () {
  it('new window observer when user close window', function (done) {
    this.timeout(4000);
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    let newWindow = new MockBrowser().getWindow();

    setTimeout(function () {
      newWindow.closed = true;
    }, 1000);

    const observer = new NewWindowObserver();
    observer.subscribe(newWindow).catch(function (error) {
      const err = error.error;
      expect(err.message).eq('User cancel the login flow');
      observer.unsubscribe();
      done();
    });
  });


  it('post auth result observer', function (done) {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let resultToPost = {
      hello: 'would'
    };

    const observer = new PostAuthResultObserver();
    observer.subscribe().then(function (result) {
      expect(result).eq(resultToPost);
      done();
    });

    // post message
    window.postMessage({
      type: 'result',
      result: resultToPost
    }, '*');
    window.postMessage({
      type: 'end'
    }, '*');
  });

  it('post auth result observer for error result', function (done) {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let errorToPost = {
      error: 'error'
    };

    const observer = new PostAuthResultObserver();
    observer.subscribe().catch(function (error) {
      expect(error).eq(errorToPost);
      done();
    });

    // post message
    window.postMessage({
      type: 'result',
      result: errorToPost
    }, '*');
    window.postMessage({
      type: 'end'
    }, '*');
  });
});
