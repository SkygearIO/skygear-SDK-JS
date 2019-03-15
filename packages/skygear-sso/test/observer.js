/* global window:false */
import { expect } from 'chai';
import { NewWindowObserver, WindowMessageObserver } from '../lib/observer';


describe('SSO observer', function () {
  this.timeout(5000);

  function newMessageEvent(data, origin) {
    return new window.MessageEvent('message', {
      data,
      origin
    });
  }

  it('new window observer when user close window', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    let newWindow = new MockBrowser().getWindow();

    setTimeout(function () {
      newWindow.closed = true;
    }, 100);

    const observer = new NewWindowObserver();
    try {
      await observer.subscribe(newWindow);
    } catch (error) {
      const err = error.error;
      expect(err.message).eq('User cancel the login flow');
      observer.unsubscribe();
    }
  });

  it('post auth result observer for result message', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();

    let resultToPost = {
      hello: 'world'
    };

    const observer = new WindowMessageObserver('http://skygeario.com');
    setTimeout(() => {
      // post message
      window.dispatchEvent(newMessageEvent({
        type: 'result',
        result: resultToPost
      }, 'http://skygeario.com'));
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygeario.com'));
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

    const observer = new WindowMessageObserver('http://skygeario.com');
    // post message
    setTimeout(() => {
      window.dispatchEvent(newMessageEvent({
        type: 'error',
        error: errorToPost
      }, 'http://skygeario.com'));
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygeario.com'));
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
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygeario.com'), '*');
    }, 5);
    const observer = new WindowMessageObserver('http://skygeario.com');
    const result = await observer.subscribe();
    expect(result.type).eq('end');
  });

  it('should ingore message from other origin', async function () {
    // setup mock window
    let MockBrowser = require('mock-browser').mocks.MockBrowser;
    global.window = new MockBrowser().getWindow();
    let resultToPost = {
      hello: 'world'
    };
    const observer = new WindowMessageObserver('http://skygeario.com');
    setTimeout(() => {
      // message from different origin
      window.dispatchEvent(newMessageEvent({
        type: 'error',
        error: { error: 'error' }
      }, 'http://example.com'));

      // sso message
      window.dispatchEvent(newMessageEvent({
        type: 'result',
        result: resultToPost
      }, 'http://skygeario.com'));

      // message from different origin
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://example.com'));
      // message from different origin
      window.dispatchEvent(newMessageEvent({}, 'http://example.com'));

      // sso message
      window.dispatchEvent(newMessageEvent({
        type: 'end'
      }, 'http://skygeario.com'));
    }, 5);

    // get the message correctly
    const result = await observer.subscribe();
    expect(result.result).eq(resultToPost);
  });
});
