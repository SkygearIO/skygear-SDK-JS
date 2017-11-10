/* global window:false document:false */
/* eslint camelcase: 0 */
import cookies from 'js-cookie';
import { atob } from 'Base64';
import { NewWindowObserver, PostAuthResultObserver } from './observer';
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
    new PostAuthResultObserver();

  const onLoginCompleted = () => {
    newWindow.close();
    this._oauthWindowObserver.unsubscribe();
    this._oauthResultObserver.unsubscribe();
  };

  return this.container.lambda(`sso/${provider}/login_auth_url`, {
    ux_mode: 'web_popup',
    callback_url: window.location.href,
    ...options || {}
  })
  .then((data) => {
    newWindow.location.href = data.auth_url;
    return Promise.race([
      this._oauthWindowObserver.subscribe(newWindow),
      this._oauthResultObserver.subscribe()
    ]);
  }).then((result) => {
    onLoginCompleted();
    return this.container.auth._authResolve(result);
  }, (error) => {
    onLoginCompleted();
    return Promise.reject(error);
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
    new PostAuthResultObserver();

  const addOAuthIframe = () => {
    this._oauthIfame = document.createElement('iframe');
    this._oauthIfame.style.display = 'none';
    this._oauthIfame.src = this.container.url + 'sso/iframe_handler';
    document.body.appendChild(this._oauthIfame);
  };

  const removeOAuthIframe = () => {
    if (this._oauthIfame) {
      document.body.removeChild(this._oauthIfame);
      this._oauthIfame = null;
    }
  };

  const onLoginCompleted = () => {
    removeOAuthIframe();
    this._oauthResultObserver.unsubscribe();
  };

  return this.container.store.getItem('skygear-oauth-is-login')
    .then((isRedirectFlowCalled) => {
      if (!isRedirectFlowCalled) {
        return Promise.resolve();
      }
      if (isRedirectFlowCalled) {
        let subscribeOauthResult = this._oauthResultObserver.subscribe();
        let resetRedirectActionStore = this.container.store
          .removeItem('skygear-oauth-is-login');
        addOAuthIframe();
        return Promise.all([subscribeOauthResult, resetRedirectActionStore]);
      }
    }).then((result) => {
      onLoginCompleted();
      if (!result) {
        // no previous redirect operation
        return Promise.resolve();
      }
      let oauthResult = result[0];
      return this.container.auth._authResolve(oauthResult);
    }, (error) => {
      onLoginCompleted();
      return Promise.reject(error);
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
      _postSSOResultToWindow(window.opener, authorizedUrls);
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
    _postSSOResultToWindow(window.parent, authorizedUrls);
    return Promise.resolve();
  });
}

function _postSSOResultToWindow(window, authorizedUrls) {
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
  } else {
    window.postMessage({
      type: 'result',
      result
    }, callbackURL);
  }
  window.postMessage({
    type: 'end',
    error
  }, '*');
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
