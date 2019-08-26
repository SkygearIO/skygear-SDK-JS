import {
  AuthContainer,
  AuthResponse,
  Container,
  SSOLoginOptions,
  User,
  decodeError,
  decodeAuthResponse,
  ContainerOptions,
  GlobalJSONContainerStorage,
} from "@skygear/core";
import { WebAPIClient } from "./client";
import { localStorageStorageDriver } from "./storage";
import { NewWindowObserver, WindowMessageObserver } from "./observer";

function decodeMessage(message: any) {
  if (!message) {
    throw new Error("unknown message");
  }
  switch (message.type) {
    case "error":
      throw new Error(message.error);
    case "result": {
      const result = message.result;
      if (result.error) {
        throw decodeError(result.error);
      }
      return result.result;
    }
    case "end":
      throw new Error("Fail to retrive result");
    default:
      throw new Error("unknown message type: " + message.type);
  }
}

/**
 * @public
 */
export class WebAuthContainer<T extends WebAPIClient> extends AuthContainer<T> {
  private oauthWindowObserver: NewWindowObserver | null;
  private oauthResultObserver: WindowMessageObserver | null;

  constructor(parent: WebContainer<T>) {
    super(parent);
    this.oauthWindowObserver = null;
    this.oauthResultObserver = null;
  }

  private async _oauthProviderPopupFlow(
    providerID: string,
    action: "login" | "link",
    options?: SSOLoginOptions
  ): Promise<any> {
    const newWindow = window.open("", "_blank", "height=700,width=500");
    if (!newWindow) {
      throw new Error("could not open new window");
    }

    if (this.oauthWindowObserver == null) {
      this.oauthWindowObserver = new NewWindowObserver();
    }
    if (this.oauthResultObserver == null) {
      this.oauthResultObserver = new WindowMessageObserver(
        this.parent.apiClient.endpoint
      );
    }

    try {
      const url = await this.parent.apiClient.oauthAuthorizationURL(
        providerID,
        {
          action,
          uxMode: "web_popup",
          mergeRealm: options && options.mergeRealm,
          onUserDuplicate: options && options.onUserDuplicate,
        }
      );
      newWindow.location.href = url;
      const message = await Promise.race([
        this.oauthWindowObserver.subscribe(newWindow),
        this.oauthResultObserver.subscribe(),
      ]);
      return decodeMessage(message);
    } finally {
      newWindow.close();
      if (this.oauthWindowObserver) {
        this.oauthWindowObserver.unsubscribe();
      }
      if (this.oauthResultObserver) {
        this.oauthResultObserver.unsubscribe();
      }
    }
  }

  async loginOAuthProviderWithPopup(
    providerID: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    const rawResponse = await this._oauthProviderPopupFlow(
      providerID,
      "login",
      options
    );
    const response: AuthResponse = decodeAuthResponse(rawResponse);
    this.persistResponse(response);
    return response.user;
  }

  async linkOAuthProviderWithPopup(providerID: string): Promise<void> {
    await this._oauthProviderPopupFlow(providerID, "link");
  }

  async loginOAuthProviderWithRedirect(
    providerID: string,
    callbackURL: string,
    options?: SSOLoginOptions
  ): Promise<void> {
    const url = await this.parent.apiClient.oauthAuthorizationURL(providerID, {
      callbackURL,
      action: "login",
      uxMode: "web_redirect",
      mergeRealm: options && options.mergeRealm,
      onUserDuplicate: options && options.onUserDuplicate,
    });
    await this.parent.storage.setOAuthRedirectAction(this.parent.name, "login");
    window.location.href = url;
  }

  async linkOAuthProviderWithRedirect(
    providerID: string,
    callbackURL: string
  ): Promise<void> {
    const url = await this.parent.apiClient.oauthAuthorizationURL(providerID, {
      callbackURL,
      action: "link",
      uxMode: "web_redirect",
    });
    await this.parent.storage.setOAuthRedirectAction(this.parent.name, "link");
    window.location.href = url;
  }

  private async _getRedirectResult(action: "login" | "link"): Promise<any> {
    if (this.oauthResultObserver == null) {
      this.oauthResultObserver = new WindowMessageObserver(
        this.parent.apiClient.endpoint
      );
    }

    let iframe: HTMLIFrameElement | undefined;
    try {
      const lastAction = await this.parent.storage.getOAuthRedirectAction(
        this.parent.name
      );
      if (lastAction !== action) {
        return undefined;
      }

      await this.parent.storage.delOAuthRedirectAction(this.parent.name);
      const messagePromise = this.oauthResultObserver.subscribe();

      iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = this.parent.apiClient.endpoint + "/_auth/sso/iframe_handler";
      document.body.appendChild(iframe);

      const message = await messagePromise;
      return decodeMessage(message);
    } finally {
      if (iframe) {
        this.oauthResultObserver.unsubscribe();
        document.body.removeChild(iframe);
      }
    }
  }

  async getLoginRedirectResult(): Promise<User | null> {
    const rawResponse = await this._getRedirectResult("login");
    if (!rawResponse) {
      return null;
    }
    const response: AuthResponse = decodeAuthResponse(rawResponse);
    this.persistResponse(response);
    return response.user;
  }

  async getLinkRedirectResult(): Promise<true | null> {
    const rawResponse = await this._getRedirectResult("link");
    if (!rawResponse) {
      return null;
    }
    return true;
  }
}

/**
 * @public
 */
export class WebContainer<T extends WebAPIClient> extends Container<T> {
  auth: WebAuthContainer<T>;

  constructor(options?: ContainerOptions<T>) {
    const o = ({
      ...options,
      apiClient:
        (options && options.apiClient) ||
        new WebAPIClient({
          apiKey: "",
          endpoint: "",
          accessToken: null,
        }),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(localStorageStorageDriver),
    } as any) as ContainerOptions<T>;

    super(o);
    this.auth = new WebAuthContainer(this);
  }
}
