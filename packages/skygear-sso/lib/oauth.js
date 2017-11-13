/* global window:false document:false */
/* eslint camelcase: 0 */
import cookies from 'js-cookie';
import { atob } from 'Base64';
import { NewWindowObserver, WindowMessageObserver } from './observer';
import { errorResponseFromMessage } from './util';
/**
 * Calling plugin to retrieve auth url and open in popup
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithPopup
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithPopup('google').then(...);
 */
export function loginOAuthProviderWithPopup(provider, options) {
  var newWindow = window.open('', '_blank', 'height=700,width=500');
  this._oauthWindowObserver = this._oauthWindowObserver ||
    new NewWindowObserver();
  this._oauthResultObserver = this._oauthResultObserver ||
    new WindowMessageObserver();

  const promise = this.container.lambda(`sso/${provider}/login_auth_url`, {
    ux_mode: 'web_popup',
    callback_url: window.location.href,
    ...options || {}
  }).then((data) => {
    newWindow.location.href = data.auth_url;
    return Promise.race([
      this._oauthWindowObserver.subscribe(newWindow),
      this._oauthResultObserver.subscribe()
    ]);
  }).then((result) => {
    return _ssoResultMessageResolve(result);
  }).then((result) => {
    return this.container.auth._authResolve(result);
  });

  // the pattern is going to achieve finally in Promise
  return promise.catch(() => undefined).then(() => {
    newWindow.close();
    this._oauthWindowObserver.unsubscribe();
    this._oauthResultObserver.unsubscribe();
    return promise;
  });
}

/**
 * Calling plugin to retrieve and redirect to auth url
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithRedirect
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithRedirect('google').then(...);
 */
export function loginOAuthProviderWithRedirect(provider, options) {
  return this.container.lambda(`sso/${provider}/login_auth_url`, {
    ux_mode: 'web_redirect',
    callback_url: window.location.href,
    ...options || {}
  })
  .then((data) => {
    const store = this.container.store;
    window.location.href = data.auth_url;
    return store.setItem('skygear-oauth-is-login', true);
  });
}

/**
 * return user from redirect based login flow
 * if login success, promise resolve with logged in user.
 * if login fail, promise fail with error.
 * if no redirect flow was called, promise resolve with empty result.
 *
 * @injectTo {AuthContainer} as getLoginRedirectResult
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.getLoginRedirectResult().then(...);
 */
export function getLoginRedirectResult() {
  this._oauthResultObserver = this._oauthResultObserver ||
    new WindowMessageObserver();

  let oauthIframe;
  const promise = this.container.store.getItem('skygear-oauth-is-login')
    .then((isRedirectFlowCalled) => {
      if (!isRedirectFlowCalled) {
        return Promise.resolve();
      }
      if (isRedirectFlowCalled) {
        let subscribeOauthResult = this._oauthResultObserver.subscribe();
        let resetRedirectActionStore = this.container.store
          .removeItem('skygear-oauth-is-login');

        // add the iframe and wait for the receive message
        oauthIframe = document.createElement('iframe');
        oauthIframe.style.display = 'none';
        oauthIframe.src = this.container.url + 'sso/iframe_handler';
        document.body.appendChild(oauthIframe);

        return Promise.all([subscribeOauthResult, resetRedirectActionStore]);
      }
    }).then((result) => {
      if (!result) {
        // no previous redirect operation
        return Promise.resolve();
      }
      let oauthResult = result[0];
      return _ssoResultMessageResolve(oauthResult);
    }).then((result) => {
      if (!result) {
        // no previous redirect operation
        return Promise.resolve();
      }
      return this.container.auth._authResolve(result);
    });

  // the pattern is going to achieve finally in Promise
  return promise.catch(() => undefined).then(() => {
    this._oauthResultObserver.unsubscribe();
    if (oauthIframe) {
      document.body.removeChild(oauthIframe);
    }
    return promise;
  });
}

/**
 * Auth flow handler script
 *
 * @injectTo {AuthContainer} as authHandler
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.oauthHandler().then(...);
 */
export function oauthHandler() {
  return this.container.lambda('sso/config')
  .then((data) => {
    let authorizedUrls = data.authorized_urls;
    if (window.opener) {
      // popup
      _postSSOResultMessageToWindow(window.opener, authorizedUrls);
      return Promise.resolve();
    } else {
      return Promise.reject(errorResponseFromMessage('Fail to find opener'));
    }
  });
}


/**
 * Iframe handler script. When getLoginRedirectResult is called, sdk will
 * inject an iframe in the document with plugin iframe handler endpoint
 * the endpoint will call this handler. Handler will get the sso result from
 * browser session and post the result back to parnet
 *
 * @injectTo {AuthContainer} as iframeHandler
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.iframeHandler().then(...);
 */
export function iframeHandler() {
  return this.container.lambda('sso/config')
  .then((data) => {
    let authorizedUrls = data.authorized_urls;
    _postSSOResultMessageToWindow(window.parent, authorizedUrls);
    return Promise.resolve();
  });
}


/**
 * Posting sso result to given window (opener or parent)
 * There are 3 type messages
 * { "type": "result", "result": { ...result object } }
 * { "type": "error", "error": { ...error object } }
 * { "type": "end" }
 * `error` and `end` will send to all target origin *
 * and `result` will send to the given callback URL only
 *
 * when the observer successfully get the message, it will remove the message
 * listener, if user provide an incorrect callback url. The observer will still
 * be able to get the `end` message here
 *
 * @private
 *
 */
function _postSSOResultMessageToWindow(window, authorizedUrls) {
  let resultStr = cookies.get('sso_data');
  cookies.remove('sso_data');
  let data = resultStr && JSON.parse(atob(resultStr));
  let callbackURL = data && data.callback_url;
  let result = data && data.result;
  var error = null;
  if (!result) {
    error = 'Fail to retrieve result';
  } else if (!callbackURL) {
    error = 'Fail to retrieve callbackURL';
  } else if (!_validateCallbackUrl(callbackURL, authorizedUrls)) {
    error = `Unauthorized domain: ${callbackURL}`;
  }

  if (error) {
    window.postMessage({
      type: 'error',
      error
    }, '*');
  } else {
    window.postMessage({
      type: 'result',
      result
    }, callbackURL);
  }
  window.postMessage({
    type: 'end'
  }, '*');
}

function _ssoResultMessageResolve(message) {
  switch (message.type) {
  case 'error':
    return Promise.reject(message.error);
  case 'result':
    const result = message.result;
    // server error
    if (result.error) {
      return Promise.reject(result);
    }
    return Promise.resolve(result);
  case 'end':
    return Promise.reject(errorResponseFromMessage(`Fail to retrieve result.
Please check the callback_url params in function and
authorized callback urls list in portal.`));
  default:
    return Promise.reject(errorResponseFromMessage('Unkown message type'));
  }
}

function _validateCallbackUrl(url, authorizedUrls) {
  if (!url) {
    return false;
  }

  // if no authorized urls are set, all domain is allowed
  if (authorizedUrls.length === 0) {
    return true;
  }

  for (let u of authorizedUrls) {
    let regex = new RegExp(`^${u}`, 'i');
    if (url && url.match(regex)) {
      return true;
    }
  }

  return false;
}
