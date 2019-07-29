import { StorageDriver } from "@skygear/core";

const globalLocalStorage = localStorage;

/**
 * @public
 */
export const localStorageStorageDriver: StorageDriver = {
  async get(key: string): Promise<string | null> {
    return globalLocalStorage.getItem(key);
  },
  async set(key: string, value: string): Promise<void> {
    return globalLocalStorage.setItem(key, value);
  },
  async del(key: string): Promise<void> {
    return globalLocalStorage.removeItem(key);
  },
};
