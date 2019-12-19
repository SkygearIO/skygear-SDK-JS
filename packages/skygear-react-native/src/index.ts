import AsyncStorage from "@react-native-community/async-storage";
import {
  BaseAPIClient,
  StorageDriver,
  Container,
  AuthContainer,
  GlobalJSONContainerStorage,
  ContainerOptions,
  _PresignUploadRequest,
  decodeError,
  SSOLoginOptions,
} from "@skygear/core";
import { generateCodeVerifier, computeCodeChallenge } from "./pkce";
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
  /**
   * @internal
   */
  _codeVerifier?: string;

  async getLoginOAuthProviderURL(
    providerID: string,
    callbackURL: string,
    options?: SSOLoginOptions
  ): Promise<string> {
    return this._getOAuthProviderURL(providerID, callbackURL, "login", options);
  }

  async getLinkOAuthProviderURL(
    providerID: string,
    callbackURL: string,
    options?: SSOLoginOptions
  ): Promise<string> {
    return this._getOAuthProviderURL(providerID, callbackURL, "link", options);
  }

  async _getOAuthProviderURL(
    providerID: string,
    callbackURL: string,
    action: "login" | "link",
    options?: SSOLoginOptions
  ): Promise<string> {
    const codeVerifier = await generateCodeVerifier();
    const codeChallenge = await computeCodeChallenge(codeVerifier);
    this._codeVerifier = codeVerifier;
    const url = await this.parent.apiClient.oauthAuthorizationURL({
      providerID,
      codeChallenge,
      callbackURL: callbackURL,
      action,
      uxMode: "mobile_app",
      onUserDuplicate: options && options.onUserDuplicate,
    });
    return url;
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
