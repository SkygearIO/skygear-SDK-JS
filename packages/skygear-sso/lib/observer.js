/* global window:false */
import { errorResponseFromMessage } from './util';

export class NewWindowObserver {
  constructor() {
    this.timer = null;
  }

  subscribe(newWindow) {
    this.unsubscribe();
    this.newWindow = newWindow;
    return new Promise((resolve, reject) => {
      this.timer = window.setInterval(() => {
        if (this.newWindow.closed) {
          reject(errorResponseFromMessage('User cancel the login flow'));
        }
      }, 3000);
    });
  }

  unsubscribe() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export class PostAuthResultObserver {
  constructor() {
    this.onMessageReceived = null;
    this.result = null;
  }

  subscribe() {
    this.unsubscribe();
    this._clearResult();
    return new Promise((resolve, reject) => {
      this.onMessageReceived = this._onMessageReceived
        .bind(this, resolve, reject);
      window.addEventListener('message', this.onMessageReceived);
    });
  }

  unsubscribe() {
    if (this.onMessageReceived) {
      window.removeEventListener('message', this.onMessageReceived);
      this.onMessageReceived = null;
    }
  }

  _clearResult() {
    this.result = null;
  }

  _onMessageReceived(resolve, reject, message) {
    if (message.data.type === 'result') {
      this.result = message.data.result;
    } else if (message.data.type === 'end') {
      // end with error
      if (message.data.error) {
        reject(message.data.error);
        return;
      }

      // fail to recived sso result
      if (!this.result) {
        reject(errorResponseFromMessage(`Fail to retrieve result.
 Please check the callback_url params in function and
 authorized callback urls list in portal.`));
        return;
      }

      // successfully get the sso result
      if (this.result.error) {
        // error sso result
        reject(this.result);
      } else {
        // normal sso result
        resolve(this.result);
      }
    }
  }
}
