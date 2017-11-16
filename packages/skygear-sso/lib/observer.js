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

export class WindowMessageObserver {
  constructor() {
    this.onMessageReceived = null;
  }

  subscribe() {
    this.unsubscribe();
    return new Promise((resolve) => {
      this.onMessageReceived = (message) => {
        resolve(message.data);
        this.unsubscribe();
      };
      window.addEventListener('message', this.onMessageReceived);
    });
  }

  unsubscribe() {
    if (this.onMessageReceived) {
      window.removeEventListener('message', this.onMessageReceived);
      this.onMessageReceived = null;
    }
  }
}
