import {
  BaseAPIClient,
  StorageDriver,
  Container,
  GlobalJSONContainerStorage,
  ContainerOptions,
} from "@skygear/core";
export * from "@skygear/core";

const nodeFetch = require("node-fetch");

/**
 * @public
 */
export class NodeAPIClient extends BaseAPIClient {
  fetchFunction = nodeFetch;
  requestClass = nodeFetch.Request;
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
 * @public
 */
export class NodeContainer<T extends NodeAPIClient> extends Container<T> {
  constructor(options?: ContainerOptions<T>) {
    const o = ({
      ...options,
      apiClient:
        (options && options.apiClient) ||
        new NodeAPIClient({
          apiKey: "",
          endpoint: "",
          accessToken: null,
        }),
      storage:
        (options && options.storage) ||
        new GlobalJSONContainerStorage(new MemoryStorageDriver()),
    } as any) as ContainerOptions<T>;

    super(o);
  }
}

/**
 * @public
 */
export const defaultContainer: NodeContainer<
  NodeAPIClient
> = new NodeContainer();
