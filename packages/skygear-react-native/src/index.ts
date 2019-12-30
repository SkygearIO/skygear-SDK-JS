import AsyncStorage from "@react-native-community/async-storage";
import {
  AuthContainer,
  BaseAPIClient,
  Container,
  ContainerOptions,
  GlobalJSONContainerStorage,
  SSOLoginOptions,
  StorageDriver,
  User,
  _PresignUploadRequest,
  decodeError,
} from "@skygear/core";
import { generateCodeVerifier, computeCodeChallenge } from "./pkce";
import {
  openURL,
  signInWithApple,
  getCredentialStateForUserID,
} from "./nativemodule";
import { extractResultFromURL, getCallbackURLScheme } from "./url";
export * from "@skygear/core";

const globalFetch = fetch;

/**
 * @public
 */
export class ReactNativeAPIClient extends BaseAPIClient {
  fetchFunction = globalFetch;
  requestClass = Request;
}

/**
 * @public
 */
export class ReactNativeAsyncStorageStorageDriver implements StorageDriver {
  get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  }
  set(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  }
  del(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  }
}

async function uploadForm(
  url: string,
  req: _PresignUploadRequest,
  uri: string,
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
  form.append("file", {
    uri,
    name: "filename",
  } as any);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = "json";
    xhr.onload = function() {
      const jsonBody = xhr.response;
      if (jsonBody["result"]) {
        resolve(jsonBody["result"]["asset_name"]);
      } else if (jsonBody["error"]) {
        reject(decodeError(jsonBody["error"]));
      } else {
        reject(decodeError());
      }
    };
    xhr.onerror = function() {
      reject(new TypeError("Network request failed"));
    };
    xhr.ontimeout = function() {
      reject(new TypeError("Network request failed"));
    };
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
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
 * Skygear Asset APIs (for React Native).
 *
 * @public
 */
export class ReactNativeAssetContainer<T extends ReactNativeAPIClient> {
  parent: ReactNativeContainer<T>;

  constructor(parent: ReactNativeContainer<T>) {
    this.parent = parent;
  }

  /**
   * Uploads new asset.
   *
   * @param uri - Asset data URI
   * @param options - Upload options
   *
   * @returns Asset name
   */
  async upload(uri: string, options?: UploadAssetOptions): Promise<string> {
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
    presignRequest.headers = presignRequestHeaders;

    const { url } = await this.parent.apiClient._presignUploadForm();

    const asset_name = await uploadForm(
      url,
      presignRequest,
      uri,
      options && options.onUploadProgress
    );

    return asset_name;
  }
}

/**
 * Skygear Auth APIs (for React Native).
 *
 * @public
 */
export class ReactNativeAuthContainer<
  T extends ReactNativeAPIClient
> extends AuthContainer<T> {
  async loginOAuthProvider(
    providerID: string,
    callbackURL: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    return this._performOAuth(providerID, callbackURL, "login", options);
  }

  async linkOAuthProvider(
    providerID: string,
    callbackURL: string
  ): Promise<User> {
    return this._performOAuth(providerID, callbackURL, "link");
  }

  async loginApple(
    providerID: string,
    callbackURL: string,
    options?: SSOLoginOptions
  ): Promise<User> {
    return this._performSignInWithApple(
      providerID,
      callbackURL,
      "login",
      options
    );
  }

  async linkApple(providerID: string, callbackURL: string): Promise<User> {
    return this._performSignInWithApple(providerID, callbackURL, "link");
  }

  async _performOAuth(
    providerID: string,
    callbackURL: string,
    action: "login" | "link",
    options?: SSOLoginOptions
  ): Promise<User> {
    const callbackURLScheme = getCallbackURLScheme(callbackURL);
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    const authURL = await this.parent.apiClient.oauthAuthorizationURL({
      providerID,
      codeChallenge,
      callbackURL: callbackURL,
      action,
      uxMode: "mobile_app",
      onUserDuplicate: options && options.onUserDuplicate,
    });
    const redirectURL = await openURL(authURL, callbackURLScheme);
    const j = extractResultFromURL(redirectURL);
    if (j.result.error) {
      throw decodeError(j.result.error);
    }
    const authorizationCode = j.result.result;
    const p = this.parent.apiClient.getOAuthResult({
      authorizationCode,
      codeVerifier,
    });
    return this.handleAuthResponse(p);
  }

  async _performSignInWithApple(
    providerID: string,
    callbackURL: string,
    action: "login" | "link",
    options?: SSOLoginOptions
  ): Promise<User> {
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    const authURL = await this.parent.apiClient.oauthAuthorizationURL({
      providerID,
      codeChallenge,
      callbackURL: callbackURL,
      action,
      uxMode: "manual",
      onUserDuplicate: options && options.onUserDuplicate,
    });
    const r1 = await fetch(authURL);
    const j1 = await r1.json();
    const appleURL = j1.result;
    const { code, scope, state } = await signInWithApple(appleURL);
    const authorizationCode = await this.parent.apiClient.oauthHandler({
      providerID,
      code,
      scope,
      state,
    });
    const p = this.parent.apiClient.getOAuthResult({
      authorizationCode,
      codeVerifier,
    });
    return this.handleAuthResponse(p);
  }

  async getCredentialStateForAppleUserID(
    appleUserID: string
  ): Promise<"Authorized" | "NotFound" | "Revoked" | "Transferred"> {
    return getCredentialStateForUserID(appleUserID);
  }
}

/**
 * Skygear APIs container (for React Native).
 *
 * @public
 */
export class ReactNativeContainer<
  T extends ReactNativeAPIClient
> extends Container<T> {
  auth: ReactNativeAuthContainer<T>;
  asset: ReactNativeAssetContainer<T>;

  constructor(options?: ContainerOptions<T>) {
    const o = ({
      ...options,
      apiClient: (options && options.apiClient) || new ReactNativeAPIClient(),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(
          new ReactNativeAsyncStorageStorageDriver()
        ),
    } as any) as ContainerOptions<T>;

    super(o);
    this.asset = new ReactNativeAssetContainer(this);
    this.auth = new ReactNativeAuthContainer(this);
  }
}

/**
 * Default Skygear APIs container.
 *
 * @remarks
 * This is a global shared container, provided for convenience.
 *
 * @public
 */
const defaultContainer: ReactNativeContainer<
  ReactNativeAPIClient
> = new ReactNativeContainer();

export default defaultContainer;
