import {
  ContainerStorage,
  StorageDriver,
  JSONValue,
  User,
  Identity,
} from "./types";

import {
  encodeUser,
  encodeIdentity,
  decodeUser,
  decodeIdentity,
} from "./encoding";

function scopedKey(key: string): string {
  return `skygear2_${key}`;
}

function keyAccessToken(name: string): string {
  return `${name}_accessToken`;
}

function keyRefreshToken(name: string): string {
  return `${name}_refreshToken`;
}

function keyUser(name: string): string {
  return `${name}_user`;
}

function keyIdentity(name: string): string {
  return `${name}_identity`;
}

function keyOAuthRedirectAction(name: string): string {
  return `${name}_oauthRedirectAction`;
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

  async safeGetJSON(key: string): Promise<JSONValue | undefined> {
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

  async safeSetJSON(key: string, value: JSONValue): Promise<void> {
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

  async setIdentity(namespace: string, identity: Identity) {
    const identityJSON = encodeIdentity(identity);
    await this.storage.safeSetJSON(keyIdentity(namespace), identityJSON);
  }

  async setAccessToken(namespace: string, accessToken: string) {
    await this.storage.safeSet(keyAccessToken(namespace), accessToken);
  }

  async setRefreshToken(namespace: string, refreshToken: string) {
    await this.storage.safeSet(keyRefreshToken(namespace), refreshToken);
  }

  async setOAuthRedirectAction(namespace: string, oauthRedirectAction: string) {
    await this.storage.safeSet(
      keyOAuthRedirectAction(namespace),
      oauthRedirectAction
    );
  }

  async getUser(namespace: string): Promise<User | null> {
    const userJSON = await this.storage.safeGetJSON(keyUser(namespace));
    if (userJSON) {
      return decodeUser(userJSON);
    }
    return null;
  }

  async getIdentity(namespace: string): Promise<Identity | null> {
    const identityJSON = await this.storage.safeGetJSON(keyIdentity(namespace));
    if (identityJSON) {
      return decodeIdentity(identityJSON);
    }
    return null;
  }

  async getAccessToken(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyAccessToken(namespace));
  }

  async getRefreshToken(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyRefreshToken(namespace));
  }

  async getOAuthRedirectAction(namespace: string): Promise<string | null> {
    return this.storage.safeGet(keyOAuthRedirectAction(namespace));
  }

  async delUser(namespace: string) {
    await this.storage.safeDel(keyUser(namespace));
  }

  async delIdentity(namespace: string) {
    await this.storage.safeDel(keyIdentity(namespace));
  }

  async delAccessToken(namespace: string) {
    await this.storage.safeDel(keyAccessToken(namespace));
  }

  async delRefreshToken(namespace: string) {
    await this.storage.safeDel(keyRefreshToken(namespace));
  }

  async delOAuthRedirectAction(namespace: string) {
    await this.storage.safeDel(keyOAuthRedirectAction(namespace));
  }
}
