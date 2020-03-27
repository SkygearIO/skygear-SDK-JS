import {
  AuthContainer,
  AuthResponse,
  Container,
  SSOLoginOptions,
  User,
  decodeError,
  ContainerOptions,
  GlobalJSONContainerStorage,
  _PresignUploadRequest,
  OIDCContainer,
  AuthorizeOptions,
} from "@skygear/core";
import { WebAPIClient } from "./client";
import { localStorageStorageDriver } from "./storage";
import { NewWindowObserver, WindowMessageObserver } from "./observer";
import { generateCodeVerifier, computeCodeChallenge } from "./pkce";

function decodeMessage(message: any): string {
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

function uploadForm(
  url: string,
  req: _PresignUploadRequest,
  blob: Blob,
  onUploadProgress?: (e: ProgressEvent) => void
): Promise<string> {
  const form = new FormData();
  if (req.prefix != null) {
    form.append("prefix", req.prefix);
  }
  if (req.access != null) {
    form.append("access", req.access);
  }
  if (req.headers != null) {
    for (const name of Object.keys(req.headers)) {
      const value = req.headers[name];
      form.append(name, value);
    }
  }
  form.append("file", blob, "filename");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function() {
      const jsonStr = xhr.responseText;
      try {
        const jsonBody = JSON.parse(jsonStr);
        if (jsonBody["result"]) {
          resolve(jsonBody["result"]["asset_name"]);
        } else if (jsonBody["error"]) {
          reject(decodeError(jsonBody["error"]));
        } else {
          reject(decodeError());
        }
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = function() {
      reject(new TypeError("Network request failed"));
    };
    xhr.ontimeout = function() {
      reject(new TypeError("Network request failed"));
    };
    xhr.open("POST", url, true);
    if (xhr.upload != null) {
      xhr.upload.onprogress = function(e: ProgressEvent) {
        if (onUploadProgress != null) {
          onUploadProgress(e);
        }
      };
    }
    xhr.send(form);
  });
}

/**
 * Skygear OIDC APIs (for web platforms).
 *
 * @public
 */
export class WebOIDCContainer<T extends WebAPIClient> extends OIDCContainer<T> {
  clientID: string;
  isThirdParty: boolean;

  constructor(parent: WebContainer<T>, auth: WebAuthContainer<T>) {
    super(parent, auth);
    this.clientID = "";
    this.isThirdParty = false;
  }

  async _setupCodeVerifier() {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    return {
      verifier: codeVerifier,
      challenge: codeChallenge,
    };
  }

  /**
   * Start authorization by opening authorize page
   *
   * @param options - authorize options
   */
  async startAuthorization(options: AuthorizeOptions): Promise<void> {
    const authorizeEndpoint = await this.authorizeEndpoint(options);
    window.location.href = authorizeEndpoint;
  }

  /**
   * Finish authorization
   *
   * exchangeToken read window.location.
   * It checks if error is present and rejects with OAuthError.
   * Otherwise assume code is present, make a token request.
   */
  async finishAuthorization(): Promise<{ user: User; state?: string }> {
    return this._finishAuthorization(window.location.href);
  }
}

/**
 * Skygear Auth APIs (for web platforms).
 *
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

  private async _getAuthResultFromAuthorizationCode(
    authorizationCode: string
  ): Promise<AuthResponse> {
    const codeVerifier = await this.parent.storage.getOAuthCodeVerifier(
      this.parent.name
    );
    if (codeVerifier == null) {
      throw new Error("expected code verifier to exist");
    }
    const authRepsonse = await this.parent.apiClient.getOAuthResult({
      authorizationCode,
      codeVerifier,
    });
    await this.parent.storage.delOAuthCodeVerifier(this.parent.name);
    return authRepsonse;
  }

  private async _oauthProviderPopupFlow(
    providerID: string,
    action: "login" | "link",
    options?: SSOLoginOptions
  ): Promise<string> {
    const newWindow = window.open("", "_blank", "height=700,width=500");
    if (!newWindow) {
      throw new Error("could not open new window");
    }

    if (this.oauthWindowObserver == null) {
      this.oauthWindowObserver = new NewWindowObserver();
    }
    if (this.oauthResultObserver == null) {
      this.oauthResultObserver = new WindowMessageObserver(
        this.parent.apiClient.authEndpoint
      );
    }

    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await computeCodeChallenge(codeVerifier);
      await this.parent.storage.setOAuthCodeVerifier(
        this.parent.name,
        codeVerifier
      );
      const url = await this.parent.apiClient.oauthAuthorizationURL({
        providerID,
        codeChallenge,
        action,
        uxMode: "web_popup",
        onUserDuplicate: options && options.onUserDuplicate,
      });
      newWindow.location.href = url;
      const message = await Promise.race([
        this.oauthWindowObserver.subscribe(newWindow),
        this.oauthResultObserver.subscribe(),
      ]);
      return decodeMessage(message);
    } finally {
      newWindow.close();
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.oauthWindowObserver) {
        this.oauthWindowObserver.unsubscribe();
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (this.oauthResultObserver) {
        this.oauthResultObserver.unsubscribe();
      }
    }
  }

  /**
   * Login user with OAuth SSO provider using popup window.
   *
   * @param providerID - SSO provider ID
   * @param options - SSO login options
   */
  async loginOAuthProviderWithPopup(
    providerID: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    const f = async () => {
      const authorizationCode = await this._oauthProviderPopupFlow(
        providerID,
        "login",
        options
      );
      return this._getAuthResultFromAuthorizationCode(authorizationCode);
    };
    return this.handleAuthResponse(f());
  }

  /**
   * Links user with OAuth SSO provider using popup window.
   *
   * @param providerID - SSO provider ID
   */
  async linkOAuthProviderWithPopup(providerID: string): Promise<User> {
    const f = async () => {
      const authorizationCode = await this._oauthProviderPopupFlow(
        providerID,
        "link"
      );
      return this._getAuthResultFromAuthorizationCode(authorizationCode);
    };
    return this.handleAuthResponse(f());
  }

  /**
   * Login user with OAuth SSO provider by redirecting user.
   *
   * @param providerID - SSO provider ID
   * @param callbackURL - URL to return when authentication completed
   * @param options - SSO login options
   */
  async loginOAuthProviderWithRedirect(
    providerID: string,
    callbackURL: string,
    options?: SSOLoginOptions
  ): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    await this.parent.storage.setOAuthCodeVerifier(
      this.parent.name,
      codeVerifier
    );
    const url = await this.parent.apiClient.oauthAuthorizationURL({
      providerID,
      codeChallenge,
      callbackURL,
      action: "login",
      uxMode: "web_redirect",
      onUserDuplicate: options && options.onUserDuplicate,
    });
    await this.parent.storage.setOAuthRedirectAction(this.parent.name, "login");
    window.location.href = url;
  }

  /**
   * Links user with OAuth SSO provider by redirecting user.
   *
   * @param providerID - SSO provider ID
   * @param callbackURL - URL to return when authentication completed
   */
  async linkOAuthProviderWithRedirect(
    providerID: string,
    callbackURL: string
  ): Promise<void> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    await this.parent.storage.setOAuthCodeVerifier(
      this.parent.name,
      codeVerifier
    );
    const url = await this.parent.apiClient.oauthAuthorizationURL({
      providerID,
      codeChallenge,
      callbackURL,
      action: "link",
      uxMode: "web_redirect",
    });
    await this.parent.storage.setOAuthRedirectAction(this.parent.name, "link");
    window.location.href = url;
  }

  private async _getRedirectResult(
    action: "login" | "link"
  ): Promise<string | null> {
    const lastAction = await this.parent.storage.getOAuthRedirectAction(
      this.parent.name
    );
    if (lastAction !== action) {
      return null;
    }

    await this.parent.storage.delOAuthRedirectAction(this.parent.name);

    const searchParams = new URLSearchParams(window.location.search.slice(1));
    const result = searchParams.get("x-skygear-result");
    if (result == null) {
      return null;
    }
    const jsonStr = atob(result);
    const j = JSON.parse(jsonStr);
    if (j.result.error) {
      throw decodeError(j.result.error);
    }
    return j.result.result;
  }

  /**
   * Gets SSO login result.
   *
   * @remarks
   * This function should be called by the page at `callbackURL`,
   * after calling {@link WebAuthContainer.loginOAuthProviderWithRedirect}.
   */
  async getLoginRedirectResult(): Promise<User | null> {
    const f = async () => {
      const authorizationCode = await this._getRedirectResult("login");
      if (!authorizationCode) {
        return null;
      }
      return this._getAuthResultFromAuthorizationCode(authorizationCode);
    };
    return this.handleMaybeAuthResponse(f());
  }

  /**
   * Gets SSO link result.
   *
   * @remarks
   * This function should be called by the page at `callbackURL`,
   * after calling {@link WebAuthContainer.linkOAuthProviderWithRedirect}.
   */
  async getLinkRedirectResult(): Promise<User | null> {
    const f = async () => {
      const authorizationCode = await this._getRedirectResult("link");
      if (!authorizationCode) {
        return null;
      }
      return this._getAuthResultFromAuthorizationCode(authorizationCode);
    };
    return this.handleMaybeAuthResponse(f());
  }
}

/**
 * @public
 */
export interface UploadAssetOptions {
  /**
   * The asset name prefix.
   */
  prefix?: string;
  /**
   * The access control type of asset.
   */
  access?: "public" | "private";
  /**
   * Additional HTTP headers to be returned with the asset.
   */
  headers?: {
    [name: string]: string;
  };
  /**
   * Callback for reporting upload progress.
   */
  onUploadProgress?: (e: ProgressEvent) => void;
}

/**
 * Skygear Asset APIs (for web platforms).
 *
 * @public
 */
export class WebAssetContainer<T extends WebAPIClient> {
  parent: WebContainer<T>;

  constructor(parent: WebContainer<T>) {
    this.parent = parent;
  }

  /**
   * Uploads new asset.
   *
   * @param blob - Asset data
   * @param options - Upload options
   *
   * @returns Asset name
   */
  async upload(blob: Blob, options?: UploadAssetOptions): Promise<string> {
    // Prepare presignRequest
    const presignRequest: _PresignUploadRequest = {};
    if (options != null) {
      presignRequest.prefix = options.prefix;
      presignRequest.access = options.access;
      if (options.headers != null) {
        presignRequest.headers = { ...options.headers };
      }
    }

    // Prepare presignRequest.headers
    const presignRequestHeaders = presignRequest.headers || {};
    let hasContentType = false;
    for (const key of Object.keys(presignRequestHeaders)) {
      const headerName = key.toLowerCase();
      switch (headerName) {
        case "content-type":
          hasContentType = true;
          break;
        default:
          break;
      }
    }
    if (!hasContentType && blob.type !== "") {
      presignRequestHeaders["content-type"] = String(blob.type);
    }
    presignRequest.headers = presignRequestHeaders;

    const { url } = await this.parent.apiClient._presignUploadForm();

    const asset_name = await uploadForm(
      url,
      presignRequest,
      blob,
      options && options.onUploadProgress
    );

    return asset_name;
  }
}

/**
 * @public
 */
export interface ConfigureOptions {
  /**
   * The OAuth client ID.
   */
  clientID: string;
  /**
   * The app endpoint.
   */
  appEndpoint: string;
  /**
   * The Skygear Auth endpoint. If it is omitted, it is derived by pre-pending `accounts.` to the domain of the app endpoint.
   */
  authEndpoint?: string;
  /**
   * The Skygear asset endpoint. If it is omitted, it is derived by pre-pending `assets.` to the domain of the app endpoint.
   */
  assetEndpoint?: string;
  /**
   * isThirdPartyApp indicate if the application a third party app.
   * A third party app means the app doesn't share common-domain with Skygear Auth thus the session cookie cannot be shared.
   * If not specified, default to false. So by default the application is considered first party.
   */
  isThirdPartyApp?: boolean;
}

/**
 * Skygear APIs container (for web platforms).
 *
 * @public
 */
export class WebContainer<T extends WebAPIClient> extends Container<T> {
  auth: WebAuthContainer<T>;
  asset: WebAssetContainer<T>;
  authui: WebOIDCContainer<T>;

  constructor(options?: ContainerOptions<T>) {
    const o = {
      ...options,
      apiClient: (options && options.apiClient) || new WebAPIClient(),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(localStorageStorageDriver),
    } as ContainerOptions<T>;

    super(o);
    this.auth = new WebAuthContainer(this);
    this.asset = new WebAssetContainer(this);
    this.authui = new WebOIDCContainer(this, this.auth);
  }

  /**
   * Configure this container with connection information.
   *
   * @param options - Skygear connection information
   */
  async configure(options: ConfigureOptions) {
    await this._configure({
      apiKey: options.clientID,
      endpoint: options.appEndpoint,
      authEndpoint: options.authEndpoint,
      assetEndpoint: options.assetEndpoint,
    });
    this.authui.clientID = options.clientID;
    this.authui.isThirdParty = !!options.isThirdPartyApp;
  }
}
