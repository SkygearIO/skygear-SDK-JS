import { _encodeUTF8, _encodeBase64URLFromByteArray } from "@skygear/core";
import { signAnonymousToken, getAnonymousKey } from "./nativemodule";

function encodeRawBase64URL(input: string): string {
  return _encodeBase64URLFromByteArray(_encodeUTF8(input));
}

function toRawBase64URL(base64: string): string {
  return base64
    .replace(/=+$/, "")
    .replace(/\//g, "_")
    .replace(/\+/g, "-");
}

export async function getAnonymousJWK(
  kid: string | null
): Promise<{ kid: string; alg: string; jwk?: unknown }> {
  const key = await getAnonymousKey(kid);
  if (key.jwk) {
    key.jwk.n = toRawBase64URL(key.jwk.n);
    key.jwk.e = toRawBase64URL(key.jwk.e);
  }
  return key;
}

export async function signAnonymousJWT(
  kid: string,
  header: object,
  payload: object
): Promise<string> {
  const dataToSign = [header, payload]
    .map(part => encodeRawBase64URL(JSON.stringify(part)))
    .join(".");
  const sig = toRawBase64URL(await signAnonymousToken(kid, dataToSign));
  const token = `${dataToSign}.${sig}`;
  return token;
}
