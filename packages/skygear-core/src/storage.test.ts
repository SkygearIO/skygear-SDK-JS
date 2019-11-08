import { GlobalJSONContainerStorage, _GlobalJSONStorage } from "./storage";
import {
  StorageDriver,
  User,
  Identity,
  ExtraSessionInfoOptions,
} from "./types";

class MemoryStorageDriver implements StorageDriver {
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

describe("ContainerStorage", () => {
  it("should set, get and delete user", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new GlobalJSONContainerStorage(driver);
    const user: User = {
      id: "userid",
      createdAt: new Date(0),
      lastLoginAt: new Date(0),
      isVerified: false,
      isDisabled: false,
      metadata: {},
    };
    const ns = "test";

    await storage.setUser(ns, user);
    let restored = await storage.getUser(ns);
    expect(restored).toEqual(user);

    await storage.delUser(ns);
    restored = await storage.getUser(ns);
    expect(restored).toEqual(null);
  });

  it("should set, get and delete identity", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new GlobalJSONContainerStorage(driver);
    const pwIdentity: Identity = {
      id: "id",
      type: "password",
      loginIDKey: "email",
      loginID: "test@skygeario.com",
      claims: {
        email: "test@skygeario.com",
      },
    };
    const ns = "test";

    await storage.setIdentity(ns, pwIdentity);
    let restored = await storage.getIdentity(ns);
    expect(restored).toEqual(pwIdentity);

    await storage.delIdentity(ns);
    restored = await storage.getIdentity(ns);
    expect(restored).toEqual(null);
  });

  it("should set, get and delete access token", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new GlobalJSONContainerStorage(driver);
    const token = "test_token";
    const ns = "test";

    await storage.setAccessToken(ns, token);
    let restored = await storage.getAccessToken(ns);
    expect(restored).toEqual(token);

    await storage.delAccessToken(ns);
    restored = await storage.getAccessToken(ns);
    expect(restored).toEqual(null);
  });

  it("should set, get and delete refresh token", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new GlobalJSONContainerStorage(driver);
    const token = "test_token";
    const ns = "test";

    await storage.setRefreshToken(ns, token);
    let restored = await storage.getRefreshToken(ns);
    expect(restored).toEqual(token);

    await storage.delRefreshToken(ns);
    restored = await storage.getRefreshToken(ns);
    expect(restored).toEqual(null);
  });

  it("should set, get and delete session ID", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new GlobalJSONContainerStorage(driver);
    const id = "session_id";
    const ns = "test";

    await storage.setSessionID(ns, id);
    let restored = await storage.getSessionID(ns);
    expect(restored).toEqual(id);

    await storage.delSessionID(ns);
    restored = await storage.getSessionID(ns);
    expect(restored).toEqual(null);
  });

  it("should set, get and delete oauth redirect action", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new GlobalJSONContainerStorage(driver);
    const action = "login";
    const ns = "test";

    await storage.setOAuthRedirectAction(ns, action);
    let restored = await storage.getOAuthRedirectAction(ns);
    expect(restored).toEqual(action);

    await storage.delOAuthRedirectAction(ns);
    restored = await storage.getOAuthRedirectAction(ns);
    expect(restored).toEqual(null);
  });
});

it("should set and get extra session info options", async () => {
  const driver = new MemoryStorageDriver();
  const storage = new GlobalJSONContainerStorage(driver);
  const options: ExtraSessionInfoOptions = {
    deviceName: undefined,
  };
  const ns = "test";

  await storage.setExtraSessionInfoOptions(ns, options);
  const restored = await storage.getExtraSessionInfoOptions(ns);
  expect(restored).toEqual(options);
  expect(restored).not.toHaveProperty("deviceName");
});

describe("GlobalJSONStorage", () => {
  it("should scope the key", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new _GlobalJSONStorage(driver);

    await storage.safeSet("a", "b");
    expect(
      Object.prototype.hasOwnProperty.call(driver.backingStore, "a")
    ).toEqual(false);
    expect(
      Object.prototype.hasOwnProperty.call(driver.backingStore, "skygear2_a")
    ).toEqual(true);

    await storage.safeSetJSON("json", {});
    expect(
      Object.prototype.hasOwnProperty.call(driver.backingStore, "json")
    ).toEqual(false);
    expect(
      Object.prototype.hasOwnProperty.call(driver.backingStore, "skygear2_json")
    ).toEqual(true);
  });
  it("should safeSet and safeGet", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new _GlobalJSONStorage(driver);

    await storage.safeSet("a", "b");
    expect(await storage.safeGet("a")).toEqual("b");
  });

  it("should safeDel", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new _GlobalJSONStorage(driver);

    await storage.safeSet("a", "b");
    expect(await storage.safeGet("a")).toEqual("b");
    await storage.safeDel("a");
    expect(await storage.safeGet("a")).toEqual(null);
  });

  it("should safeSetJSON and safeGetJSON", async () => {
    const driver = new MemoryStorageDriver();
    const storage = new _GlobalJSONStorage(driver);

    const json = {
      str: "str",
      num: 1,
      bool: true,
      arr: ["str", 1, true],
    };

    await storage.safeSetJSON("json", json);
    expect(await storage.safeGetJSON("json")).toEqual(json);
    await storage.safeDel("json");
    expect(await storage.safeGetJSON("json")).toEqual(undefined);
  });
});
