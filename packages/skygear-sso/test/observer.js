/* global window:false */
import { expect } from 'chai';
import { NewWindowObserver, WindowMessageObserver } from '../lib/observer';


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


  it('post auth result observer for result message', function (done) {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let resultToPost = {
      hello: 'would'
    };

    const observer = new WindowMessageObserver();
    observer.subscribe().then(function (result) {
      expect(result.result).eq(resultToPost);
      done();
    }).catch(done);

    // post message
    window.postMessage({
      type: 'result',
      result: resultToPost
    }, '*');
    window.postMessage({
      type: 'end'
    }, '*');
  });

  it('post auth result observer for error message', function (done) {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let errorToPost = {
      error: 'error'
    };

    const observer = new WindowMessageObserver();
    observer.subscribe().then(function (result) {
      expect(result.error).eq(errorToPost);
      done();
    }).catch(done);

    // post message
    window.postMessage({
      type: 'error',
      error: errorToPost
    }, '*');
    window.postMessage({
      type: 'end'
    }, '*');
  });

  it('post auth result observer for end message', function (done) {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    const observer = new WindowMessageObserver();
    observer.subscribe().then(function (result) {
      expect(result.type).eq('end');
      done();
    }).catch(done);

    // post message
    window.postMessage({
      type: 'end'
    }, '*');
  });
});
