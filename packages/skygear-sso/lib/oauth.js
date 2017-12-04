/* global window:false document:false */
/* eslint camelcase: 0 */
import cookies from 'js-cookie';
import { atob } from 'Base64';
import { NewWindowObserver, WindowMessageObserver } from './observer';
import { errorResponseFromMessage } from './util';

/**
 * Login oauth provider with popup window
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithPopup
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @param  {String} options.callbackURL - target url for the popup window to
 *                                        post the result message
 * @param  {Array.<String>} options.scope - oauth scopes params
 * @param  {Object} options.options - add extra query params to provider auth
 *                                    url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithPopup('google').then(...);
 */
export function loginOAuthProviderWithPopup(provider, options) {
  const auth = this.container.auth;
  return _oauthFlowWithPopup.bind(this)(
    provider, options, 'login', auth._authResolve.bind(auth)
  );
}

/**
 * Login oauth provider with redirect
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithRedirect
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @param  {String} options.callbackURL - target url for the popup window to
 *                                        post the result message
 * @param  {Array.<String>} options.scope - oauth scopes params
 * @param  {Object} options.options - add extra query params to provider auth
 *                                    url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithRedirect('google').then(...);
 */
export function loginOAuthProviderWithRedirect(provider, options) {
  return _oauthFlowWithRedirect.bind(this)(provider, options, 'login');
}

/**
 * Link oauth provider with popup window
 *
 * @injectTo {AuthContainer} as linkOAuthProviderWithPopup
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @param  {String} options.callbackURL - target url for the popup window to
 *                                        post the result message
 * @param  {Array.<String>} options.scope - oauth scopes params
 * @param  {Object} options.options - add extra query params to provider auth
 *                                    url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.linkOAuthProviderWithPopup('google').then(...);
 */
export function linkOAuthProviderWithPopup(provider, options) {
  return _oauthFlowWithPopup.bind(this)(
    provider, options, 'link', Promise.resolve.bind(Promise)
  );
}

/**
 * Link oauth provider with redirect
 *
 * @injectTo {AuthContainer} as linkOAuthProviderWithRedirect
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @param  {String} options.callbackURL - target url for the popup window to
 *                                        post the result message
 * @param  {Array.<String>} options.scope - oauth scopes params
 * @param  {Object} options.options - add extra query params to provider auth
 *                                    url
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.linkOAuthProviderWithRedirect('google').then(...);
 */
export function linkOAuthProviderWithRedirect(provider, options) {
  return _oauthFlowWithRedirect.bind(this)(provider, options, 'link');
}

/**
 * Get redirect login result, return user from redirect based login flow
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
  const auth = this.container.auth;
  return _getRedirectResult.bind(this)('login', auth._authResolve.bind(auth));
}

/**
 * Get redirect link result, return user from redirect based login flow
 * if link success, promise resolve with result { result: 'OK' }.
 * if link fail, promise fail with error.
 * if no redirect flow was called, promise resolve with empty result.
 *
 * @injectTo {AuthContainer} as getLinkRedirectResult
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.getLinkRedirectResult().then(...);
 */
export function getLinkRedirectResult() {
  return _getRedirectResult.bind(this)('link', Promise.resolve.bind(Promise));
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
    let authorizedURLs = data.authorized_urls;
    if (window.opener) {
      // popup
      _postSSOResultMessageToWindow(window.opener, authorizedURLs);
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
    let authorizedURLs = data.authorized_urls;
    _postSSOResultMessageToWindow(window.parent, authorizedURLs);
    return Promise.resolve();
  });
}

/**
 * Login oauth provider with access token
 *
 * @injectTo {AuthContainer} as loginOAuthProviderWithAccessToken
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {String} accessToken - provider app access token
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.loginOAuthProviderWithAccessToken(provider, accessToken).then(...);
 */
export function loginOAuthProviderWithAccessToken(provider, accessToken) {
  return this.container.lambda(_getAuthWithAccessTokenURL(provider, 'login'), {
    access_token: accessToken
  }).then((result) => {
    return this.container.auth._authResolve(result);
  });
}

/**
 * Link oauth provider with access token
 *
 * @injectTo {AuthContainer} as linkOAuthProviderWithAccessToken
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {String} accessToken - provider app access token
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.linkOAuthProviderWithAccessToken(provider, accessToken).then(...);
 */
export function linkOAuthProviderWithAccessToken(provider, accessToken) {
  return this.container.lambda(_getAuthWithAccessTokenURL(provider, 'link'), {
    access_token: accessToken
  });
}

/**
 * Unlink oauth provider
 *
 * @injectTo {AuthContainer} as unlinkOAuthProvider
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.unlinkOAuthProvider(provider).then(...);
 */
export function unlinkOAuthProvider(provider) {
  return this.container.lambda(`sso/${provider}/unlink`);
}

/**
 * Get current user's provider profiles, can use for determine user logged in
 * provider
 *
 * @injectTo {AuthContainer} as getOAuthProviderProfiles
 * @return {Promise} promise
 *
 * @example
 * skygear.auth.getOAuthProviderProfiles().then(...);
 */
export function getOAuthProviderProfiles() {
  return this.container.lambda('sso/provider_profiles');
}

/**
 * @private
 *
 * Start oauth flow with popup window
 *
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @param  {String} action - login or link
 * @param  {Function} resolvePromise - function that return promise which will
 *                                     be called when oauth flow resolve
 * @return {Promise} promise
 */
function _oauthFlowWithPopup(provider, options, action, resolvePromise) {
  var newWindow = window.open('', '_blank', 'height=700,width=500');
  this._oauthWindowObserver = this._oauthWindowObserver ||
    new NewWindowObserver();
  this._oauthResultObserver = this._oauthResultObserver ||
    new WindowMessageObserver();

  const params = _genAuthURLParams('web_popup', options);
  const promise = this.container.lambda(_getAuthURL(provider, action), params)
  .then((data) => {
    newWindow.location.href = data.auth_url;
    return Promise.race([
      this._oauthWindowObserver.subscribe(newWindow),
      this._oauthResultObserver.subscribe()
    ]);
  }).then((result) => {
    return _ssoResultMessageResolve(result);
  }).then((result) => {
    return resolvePromise(result);
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
 * @private
 *
 * Start oauth flow with redirect
 *
 * @param  {String} provider - name of provider, e.g. google, facebook
 * @param  {Object} options - options for generating auth_url
 * @param  {String} action - login or link
 * @return {Promise} promise
 *
 */
function _oauthFlowWithRedirect(provider, options, action) {
  const params = _genAuthURLParams('web_redirect', options);
  return this.container.lambda(_getAuthURL(provider, action), params)
  .then((data) => {
    const store = this.container.store;
    window.location.href = data.auth_url; //eslint-disable-line
    return store.setItem('skygear-oauth-redirect-action', action);
  });
}


/**
 *
 * @private
 *
 * Get redirect login result, return user from redirect based login flow
 * if login success, promise resolve with logged in user.
 * if login fail, promise fail with error.
 * if no redirect flow was called, promise resolve with empty result.
 *
 * @injectTo {AuthContainer} as getLoginRedirectResult
 * @param  {String}   action - login or link
 * @param  {Function} resolvePromise - function that return promise which will
 *                                     be called when oauth flow resolve
 * @return {Promise} promise
 *
 */
function _getRedirectResult(action, resolvePromise) {
  this._oauthResultObserver = this._oauthResultObserver ||
    new WindowMessageObserver();

  let oauthIframe;
  const promise = this.container.store.getItem('skygear-oauth-redirect-action')
    .then((lastRedirectAction) => {
      if (lastRedirectAction !== action) {
        return Promise.resolve();
      }
      let subscribeOauthResult = this._oauthResultObserver.subscribe();
      let resetRedirectActionStore = this.container.store
        .removeItem('skygear-oauth-redirect-action');

      // add the iframe and wait for the receive message
      oauthIframe = document.createElement('iframe');
      oauthIframe.style.display = 'none';
      oauthIframe.src = this.container.url + 'sso/iframe_handler';
      document.body.appendChild(oauthIframe);

      return Promise.all([subscribeOauthResult, resetRedirectActionStore]);
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
      return resolvePromise(result);
    });

  // the pattern is going to achieve finally in Promise
  return promise.catch(() => undefined).then(() => {
    if (oauthIframe) {
      this._oauthResultObserver.unsubscribe();
      document.body.removeChild(oauthIframe);
    }
    return promise;
  });
}

function _getAuthURL(provider, action) {
  return {
    login: `sso/${provider}/login_auth_url`,
    link: `sso/${provider}/link_auth_url`
  }[action];
}

function _getAuthWithAccessTokenURL(provider, action) {
  return {
    login: `sso/${provider}/login`,
    link: `sso/${provider}/link`
  }[action];
}

function _genAuthURLParams(uxMode, options) {
  const params = {
    ux_mode: uxMode,
    callback_url: window.location.href
  };

  if (options) {
    if (options.callbackURL) {
      params.callback_url = options.callbackURL;
    }
    if (options.scope) {
      params.scope = options.scope;
    }
    if (options.options) {
      params.options = options.options;
    }
  }
  return params;
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
function _postSSOResultMessageToWindow(window, authorizedURLs) {
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
  } else if (!_validateCallbackURL(callbackURL, authorizedURLs)) {
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

function _validateCallbackURL(url, authorizedURLs) {
  if (!url) {
    return false;
  }

  // if no authorized urls are set, all domain is allowed
  if (authorizedURLs.length === 0) {
    return true;
  }

  for (let u of authorizedURLs) {
    let regex = new RegExp(`^${u}`, 'i');
    if (url && url.match(regex)) {
      return true;
    }
  }

  return false;
}
