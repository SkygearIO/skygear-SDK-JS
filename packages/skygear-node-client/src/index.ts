import {
  BaseAPIClient,
  StorageDriver,
  Container,
  GlobalJSONContainerStorage,
  ContainerOptions,
  VERSION,
  _PresignUploadRequest,
} from "@skygear/core";
import { Readable } from "stream";
export * from "@skygear/core";
import { type, release, hostname } from "os";
import nodeFetch, { Request, Headers } from "node-fetch";

/**
 * @public
 */
export class NodeAPIClient extends BaseAPIClient {
  fetchFunction = nodeFetch as any;
  requestClass = Request as any;

  // TODO(session): enough information?
  userAgent = `skygear-node-client/${VERSION} (Skygear; ${type()} ${release()})`;
}

/**
 * @public
 */
export class MemoryStorageDriver implements StorageDriver {
  backingStore: { [key: string]: string };

  constructor() {
    this.backingStore = {};
  }

  async get(key: string): Promise<string | null> {
    const value = this.backingStore[key];
    if (value != null) {
      return value;
    }
    return null;
  }
  async set(key: string, value: string): Promise<void> {
    this.backingStore[key] = value;
  }
  async del(key: string): Promise<void> {
    delete this.backingStore[key];
  }
}

/**
 * Returns name of the device.
 *
 * @remarks
 * On Node.js platform, it returns `hostname` of the platform.
 *
 * @public
 */
export async function getDeviceName(): Promise<string> {
  return hostname();
}

async function uploadData(
  method: string,
  url: string,
  headers: { name: string; value: string }[],
  data: Buffer | Readable
): Promise<number> {
  const fetchHeaders = new Headers();
  for (const header of headers) {
    fetchHeaders.set(header.name, header.value);
  }
  const init = {
    method,
    headers: fetchHeaders,
    mode: "cors",
    body: data,
  };
  const response = await nodeFetch(url, init);
  return response.status;
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
   * Asset size in bytes.
   */
  size?: number;
}

/**
 * Skygear Asset APIs (for Node.js).
 *
 * @public
 */
export class NodeAssetContainer<T extends NodeAPIClient> {
  parent: NodeContainer<T>;

  constructor(parent: NodeContainer<T>) {
    this.parent = parent;
  }

  /**
   * Uploads new asset.
   *
   * @param data - Asset data
   * @param options - Upload options
   *
   * @returns Asset name
   */
  async upload(
    data: Buffer | Readable,
    options?: UploadAssetOptions
  ): Promise<string> {
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
    let hasContentLength = false;
    for (const key of Object.keys(presignRequestHeaders)) {
      const headerName = key.toLowerCase();
      switch (headerName) {
        case "content-length":
          hasContentLength = true;
          break;
        default:
          break;
      }
    }
    if (!hasContentLength) {
      if (data instanceof Buffer) {
        presignRequestHeaders["content-length"] = String(data.length);
      } else if (options != null && typeof options.size === "number") {
        presignRequestHeaders["content-length"] = String(options.size);
      } else {
        throw new Error("must provide `size' when data is Readable");
      }
    }
    presignRequest.headers = presignRequestHeaders;

    const {
      asset_name,
      url,
      method,
      headers,
    } = await this.parent.apiClient._presignUpload(presignRequest);

    const status = await uploadData(method, url, headers, data);

    if (status < 200 || status > 299) {
      throw new Error("Unexpected upload status: " + status);
    }

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
}

/**
 * Skygear APIs container (for Node.js).
 *
 * @public
 */
export class NodeContainer<T extends NodeAPIClient> extends Container<T> {
  asset: NodeAssetContainer<T>;

  constructor(options?: ContainerOptions<T>) {
    const o = {
      ...options,
      apiClient: (options && options.apiClient) || new NodeAPIClient(),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(new MemoryStorageDriver()),
    } as ContainerOptions<T>;

    super(o);
    this.asset = new NodeAssetContainer(this);
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
const defaultContainer: NodeContainer<NodeAPIClient> = new NodeContainer();

export default defaultContainer;
