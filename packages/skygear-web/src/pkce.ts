import { _encodeUTF8, _encodeBase64URLFromUint8Array } from "@skygear/core";

function byteToHex(byte: number): string {
  return ("0" + byte.toString(16)).substr(-2);
}

// uint8ArrayFrom is Uint8Array.from that works everywhere.
function uint8ArrayFrom(arr: number[]): Uint8Array {
  const output = new Uint8Array(arr.length);
  for (let i = 0; i < arr.length; ++i) {
    output[i] = arr[i];
  }
  return output;
}

// windowCryptoSubtleDigest is window.crypto.subtle.digest with IE 11 support.
function windowCryptoSubtleDigest(
  algorithm: string,
  data: Uint8Array
): Promise<Uint8Array> {
  const promiseOrEvent = window.crypto.subtle.digest(algorithm, data.buffer);
  // eslint-disable-next-line
  if (promiseOrEvent.then) {
    // @ts-ignore
    return promiseOrEvent.then((output: ArrayBuffer) => {
      return new Uint8Array(output);
    });
  }
  return new Promise((resolve, reject) => {
    (promiseOrEvent as any).oncomplete = function(output: ArrayBuffer) {
      resolve(new Uint8Array(output));
    };
    (promiseOrEvent as any).onerror = function(err: any) {
      reject(err);
    };
  });
}

function sha256(s: string): Promise<Uint8Array> {
  const bytes = uint8ArrayFrom(_encodeUTF8(s));
  return windowCryptoSubtleDigest("SHA-256", bytes);
}

export async function computeCodeChallenge(
  codeVerifier: string
): Promise<string> {
  const hash = await sha256(codeVerifier);
  const base64 = _encodeBase64URLFromUint8Array(hash);
  return base64;
}

export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32);
  window.crypto.getRandomValues(arr);
  let output = "";
  for (let i = 0; i < arr.length; ++i) {
    output += byteToHex(arr[i]);
  }
  return output;
}
