export const ErrNewWindowClosed = {};

export class NewWindowObserver {
  token: ReturnType<typeof window.setInterval> | null;

  constructor() {
    this.token = null;
  }

  subscribe(newWindow: Window): Promise<void> {
    this.unsubscribe();
    return new Promise((_, reject) => {
      this.token = window.setInterval(() => {
        if (newWindow.closed) {
          reject(ErrNewWindowClosed);
        }
      }, 1000);
    });
  }

  unsubscribe() {
    if (this.token) {
      window.clearInterval(this.token);
      this.token = null;
    }
  }
}

export class WindowMessageObserver {
  origin: string;
  onMessage: ((event: MessageEvent) => void) | null;

  constructor(origin: string) {
    this.origin = origin.replace(/\/$/, "");
    this.onMessage = null;
  }

  subscribe() {
    this.unsubscribe();
    return new Promise(resolve => {
      this.onMessage = (event: MessageEvent) => {
        if (this.origin === event.origin) {
          resolve(event.data);
          this.unsubscribe();
        }
      };
      window.addEventListener("message", this.onMessage);
    });
  }

  unsubscribe() {
    if (this.onMessage) {
      window.removeEventListener("message", this.onMessage);
      this.onMessage = null;
    }
  }
}
