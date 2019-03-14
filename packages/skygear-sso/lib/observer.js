/* global window:false */
import { errorResponseFromMessage } from './util';

export class NewWindowObserver {
  constructor() {
    this.timer = null;
  }

  async subscribe(newWindow) {
    this.unsubscribe();
    this.newWindow = newWindow;
    return new Promise((resolve, reject) => {
      this.timer = window.setInterval(() => {
        if (this.newWindow.closed) {
          reject(errorResponseFromMessage('User cancel the login flow'));
        }
      }, 1000);
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
  constructor(origin) {
    this.onMessageReceived = null;
    if (!origin) {
      throw new Error('Origin is required for message observer');
    }
    this.origin = origin.replace(/\/$/, '');
  }

  async subscribe() {
    this.unsubscribe();
    return new Promise((resolve) => {
      this.onMessageReceived = (message) => {
        if (this.origin === message.origin) {
          resolve(message.data);
          this.unsubscribe();
        }
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
