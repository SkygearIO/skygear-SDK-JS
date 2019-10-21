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
  _PresignUploadRequest,
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

function uploadBlob(
  method: string,
  url: string,
  headers: { name: string; value: string }[],
  blob: Blob,
  onUploadProgress?: (e: ProgressEvent) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      const status = xhr.status;
      resolve(status);
    };
    xhr.onerror = function() {
      reject(new TypeError("Network request failed"));
    };
    xhr.ontimeout = function() {
      reject(new TypeError("Network request failed"));
    };
    xhr.open(method, url, true);
    for (const header of headers) {
      // content-length is considered unsafe by the browser.
      // We cannot set it.
      if (header.name.toLowerCase() === "content-length") {
        continue;
      }
      xhr.setRequestHeader(header.name, header.value);
    }
    if (xhr.upload != null) {
      xhr.upload.onprogress = function(e: ProgressEvent) {
        if (onUploadProgress != null) {
          onUploadProgress(e);
        }
      };
    }
    xhr.send(blob);
  });
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
    const f = async () => {
      const rawResponse = await this._oauthProviderPopupFlow(
        providerID,
        "login",
        options
      );
      const response: AuthResponse = decodeAuthResponse(rawResponse);
      return response;
    };
    return this.handleAuthResponse(f());
  }

  async linkOAuthProviderWithPopup(providerID: string): Promise<User> {
    const f = async () => {
      const rawResponse = await this._oauthProviderPopupFlow(
        providerID,
        "link"
      );
      const response: AuthResponse = decodeAuthResponse(rawResponse);
      return response;
    };
    return this.handleAuthResponse(f());
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
    const f = async () => {
      const rawResponse = await this._getRedirectResult("login");
      if (!rawResponse) {
        return null;
      }
      const response: AuthResponse = decodeAuthResponse(rawResponse);
      return response;
    };
    return this.handleMaybeAuthResponse(f());
  }

  async getLinkRedirectResult(): Promise<User | null> {
    const f = async () => {
      const rawResponse = await this._getRedirectResult("link");
      if (!rawResponse) {
        return null;
      }
      const response: AuthResponse = decodeAuthResponse(rawResponse);
      return response;
    };
    return this.handleMaybeAuthResponse(f());
  }
}

/**
 * @public
 */
export interface UploadAssetOptions {
  exactName?: string;
  prefix?: string;
  access?: "public" | "private";
  headers?: {
    [name: string]: string;
  };
  onUploadProgress?: (e: ProgressEvent) => void;
}

/**
 * @public
 */
export class WebAssetContainer<T extends WebAPIClient> {
  parent: WebContainer<T>;

  constructor(parent: WebContainer<T>) {
    this.parent = parent;
  }

  async upload(blob: Blob, options?: UploadAssetOptions): Promise<string> {
    // Prepare presignRequest
    const presignRequest: _PresignUploadRequest = {};
    if (options != null) {
      if (options.exactName != null) {
        presignRequest.exact_name = options.exactName;
      }
      presignRequest.prefix = options.prefix;
      presignRequest.access = options.access;
      if (options.headers != null) {
        presignRequest.headers = { ...options.headers };
      }
    }

    // Prepare presignRequest.headers
    const presignRequestHeaders = presignRequest.headers || {};
    let hasContentLength = false;
    let hasContentType = false;
    for (const key of Object.keys(presignRequestHeaders)) {
      const headerName = key.toLowerCase();
      switch (headerName) {
        case "content-length":
          hasContentLength = true;
          break;
        case "content-type":
          hasContentType = true;
          break;
        default:
          break;
      }
    }
    if (!hasContentLength) {
      presignRequestHeaders["content-length"] = String(blob.size);
    }
    if (!hasContentType && blob.type !== "") {
      presignRequestHeaders["content-type"] = String(blob.type);
    }
    presignRequest.headers = presignRequestHeaders;

    const {
      asset_name,
      url,
      method,
      headers,
    } = await this.parent.apiClient._presignUpload(presignRequest);

    const status = await uploadBlob(
      method,
      url,
      headers,
      blob,
      options && options.onUploadProgress
    );

    if (status < 200 || status > 299) {
      throw new Error("Unexpected upload status: " + status);
    }

    return asset_name;
  }
}

/**
 * @public
 */
export class WebContainer<T extends WebAPIClient> extends Container<T> {
  auth: WebAuthContainer<T>;
  asset: WebAssetContainer<T>;

  constructor(options?: ContainerOptions<T>) {
    const o = ({
      ...options,
      apiClient: (options && options.apiClient) || new WebAPIClient(),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(localStorageStorageDriver),
    } as any) as ContainerOptions<T>;

    super(o);
    this.auth = new WebAuthContainer(this);
    this.asset = new WebAssetContainer(this);
  }
}
