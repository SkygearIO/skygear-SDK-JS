import { ContainerStorage, StorageDriver, User } from "./types";

import { encodeUser, decodeUser } from "./encoding";

function scopedKey(key: string): string {
  return `skygear2_${key}`;
}

function keyAccessToken(name: string): string {
  return `${name}_accessToken`;
}

function keyRefreshToken(name: string): string {
  return `${name}_refreshToken`;
}

function keySessionID(name: string): string {
  return `${name}_sessionID`;
}

function keyUser(name: string): string {
  return `${name}_user`;
}

function keyOIDCCodeVerifier(name: string): string {
  return `${name}_oidcCodeVerifier`;
}

function keyAnonymousKeyID(name: string): string {
  return `${name}_anonymousKeyID`;
}

/**
 * @internal
 */
export class _GlobalJSONStorage {
  driver: StorageDriver;

  constructor(driver: StorageDriver) {
    this.driver = driver;
  }

  async safeDel(key: string): Promise<void> {
    key = scopedKey(key);
    try {
      await this.driver.del(key);
    } catch {}
  }

  async safeGet(key: string): Promise<string | null> {
    key = scopedKey(key);
    try {
      return this.driver.get(key);
    } catch {
      return null;
    }
  }

  async safeGetJSON(key: string): Promise<unknown | undefined> {
    // No need to scope the key because safeGet does that.
    const jsonString = await this.safeGet(key);
    if (jsonString == null) {
      return undefined;
    }
    try {
      return JSON.parse(jsonString);
    } catch {
      return undefined;
    }
  }

  async safeSet(key: string, value: string): Promise<void> {
    key = scopedKey(key);
    try {
      await this.driver.set(key, value);
    } catch {}
  }

  async safeSetJSON(key: string, value: unknown): Promise<void> {
    // No need to scope the key because safeSet does that.
    try {
      const jsonString = JSON.stringify(value);
      await this.safeSet(key, jsonString);
    } catch {}
  }
}

/**
 * @public
 */
export class GlobalJSONContainerStorage implements ContainerStorage {
  private storage: _GlobalJSONStorage;

  constructor(driver: StorageDriver) {
    this.storage = new _GlobalJSONStorage(driver);
  }

  async setUser(namespace: string, user: User) {
    const userJSON = encodeUser(user);
    await this.storage.safeSetJSON(keyUser(namespace), userJSON);
  }

  async setAccessToken(namespace: string, accessToken: string) {
    await this.storage.safeSet(keyAccessToken(namespace), accessToken);
  }

  async setRefreshToken(namespace: string, refreshToken: string) {
    await this.storage.safeSet(keyRefreshToken(namespace), refreshToken);
  }

  async setSessionID(namespace: string, sessionID: string) {
    await this.storage.safeSet(keySessionID(namespace), sessionID);
  }

  async setOIDCCodeVerifier(namespace: string, code: string) {
    await this.storage.safeSet(keyOIDCCodeVerifier(namespace), code);
  }

  async setAnonymousKeyID(namespace: string, kid: string) {
    await this.storage.safeSet(keyAnonymousKeyID(namespace), kid);
  }

  async getUser(namespace: string): Promise<User | null> {
    const userJSON = await this.storage.safeGetJSON(keyUser(namespace));
    if (userJSON) {
      return decodeUser(userJSON);
    }
    return null;
  }

  async getAccessToken(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyAccessToken(namespace));
  }

  async getRefreshToken(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyRefreshToken(namespace));
  }

  async getSessionID(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keySessionID(namespace));
  }

  async getOIDCCodeVerifier(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyOIDCCodeVerifier(namespace));
  }

  async getAnonymousKeyID(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyAnonymousKeyID(namespace));
  }

  async delUser(namespace: string) {
    await this.storage.safeDel(keyUser(namespace));
  }

  async delAccessToken(namespace: string) {
    await this.storage.safeDel(keyAccessToken(namespace));
  }

  async delRefreshToken(namespace: string) {
    await this.storage.safeDel(keyRefreshToken(namespace));
  }

  async delSessionID(namespace: string) {
    await this.storage.safeDel(keySessionID(namespace));
  }

  async delOIDCCodeVerifier(namespace: string) {
    await this.storage.safeDel(keyOIDCCodeVerifier(namespace));
  }

  async delAnonymousKeyID(namespace: string) {
    await this.storage.safeDel(keyAnonymousKeyID(namespace));
  }
}
