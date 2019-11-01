import AsyncStorage from "@react-native-community/async-storage";
import {
  BaseAPIClient,
  StorageDriver,
  Container,
  GlobalJSONContainerStorage,
  ContainerOptions,
  _PresignUploadRequest,
  decodeError,
} from "@skygear/core";
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
export class ReactNativeAssetContainer<T extends ReactNativeAPIClient> {
  parent: ReactNativeContainer<T>;

  constructor(parent: ReactNativeContainer<T>) {
    this.parent = parent;
  }

  async upload(uri: string, options?: UploadAssetOptions): Promise<string> {
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
 * @public
 */
export class ReactNativeContainer<
  T extends ReactNativeAPIClient
> extends Container<T> {
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
  }
}

/**
 * @public
 */
const defaultContainer: ReactNativeContainer<
  ReactNativeAPIClient
> = new ReactNativeContainer();

export default defaultContainer;
