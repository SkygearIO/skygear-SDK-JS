/* global window:false */
import { expect } from 'chai';
import { NewWindowObserver, WindowMessageObserver } from '../lib/observer';


describe('SSO observer', function () {
  this.timeout(5000);

  it('new window observer when user close window', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    let newWindow = new MockBrowser().getWindow();

    setTimeout(function () {
      newWindow.closed = true;
    }, 1000);

    const observer = new NewWindowObserver();
    try {
      await observer.subscribe(newWindow);
    } catch (error) {
      expect(error.message).eq('User cancel the login flow');
      observer.unsubscribe();
    }
  });


  it('post auth result observer for result message', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let resultToPost = {
      hello: 'would'
    };

    const observer = new WindowMessageObserver();
    setTimeout(() => {
      // post message
      window.postMessage({
        type: 'result',
        result: resultToPost
      }, '*');
      window.postMessage({
        type: 'end'
      }, '*');
    }, 5);
    const result = await observer.subscribe();
    expect(result.result).eq(resultToPost);
  });

  it('post auth result observer for error message', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let errorToPost = {
      error: 'error'
    };

    const observer = new WindowMessageObserver();
    // post message
    setTimeout(() => {
      window.postMessage({
        type: 'error',
        error: errorToPost
      }, '*');
      window.postMessage({
        type: 'end'
      }, '*');
    }, 5);
    const result = await observer.subscribe();
    expect(result.error).eq(errorToPost);
  });

  it('post auth result observer for end message', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    setTimeout(() => {
      // post message
      window.postMessage({
        type: 'end'
      }, '*');
    }, 5);
    const observer = new WindowMessageObserver();
    const result = await observer.subscribe();
    expect(result.type).eq('end');

  });
});
