import AsyncStorage from "@react-native-community/async-storage";
import {
  BaseAPIClient,
  StorageDriver,
  Container,
  GlobalJSONContainerStorage,
  ContainerOptions,
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

/**
 * @public
 */
export class ReactNativeContainer<
  T extends ReactNativeAPIClient
> extends Container<T> {
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
  }
}

/**
 * @public
 */
const defaultContainer: ReactNativeContainer<
  ReactNativeAPIClient
> = new ReactNativeContainer();

export default defaultContainer;
