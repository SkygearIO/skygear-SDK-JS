import { ContainerStorage, JSONValue } from "./types";

export async function safeDel(
  storage: ContainerStorage,
  key: string
): Promise<void> {
  try {
    await storage.del(key);
  } catch {}
}

export async function safeGet(
  storage: ContainerStorage,
  key: string
): Promise<string | null> {
  try {
    return storage.get(key);
  } catch {
    return null;
  }
}

export async function safeGetJSON(
  storage: ContainerStorage,
  key: string
): Promise<JSONValue | undefined> {
  const jsonString = await safeGet(storage, key);
  if (jsonString == null) {
    return undefined;
  }
  try {
    return JSON.parse(jsonString);
  } catch {
    return undefined;
  }
}

export async function safeSet(
  storage: ContainerStorage,
  key: string,
  value: string
): Promise<void> {
  try {
    await storage.set(key, value);
  } catch {}
}

export async function safeSetJSON(
  storage: ContainerStorage,
  key: string,
  value: JSONValue
): Promise<void> {
  try {
    const jsonString = JSON.stringify(value);
    await storage.set(key, jsonString);
  } catch {}
}
