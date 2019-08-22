import AsyncStorage from "@react-native-community/async-storage";
import {
  BaseAPIClient,
  StorageDriver,
  Container,
  ContainerStorage,
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
export const defaultContainer: Container<ReactNativeAPIClient> = new Container(
  "default",
  new ReactNativeAPIClient({
    apiKey: "",
    endpoint: "",
    accessToken: null,
  }),
  new ContainerStorage(new ReactNativeAsyncStorageStorageDriver())
);
