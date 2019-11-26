import { encodeUTF8, encodeBase64URLFromUint8Array } from "@skygear/core";

function byteToHex(byte: number): string {
  return ("0" + byte.toString(16)).substr(-2);
}

function numberArrayToUint8Array(arr: number[]): Uint8Array {
  const output = new Uint8Array(arr.length);
  for (let i = 0; i < arr.length; ++i) {
    output[i] = arr[i];
  }
  return output;
}

function sha256(s: string): Promise<Uint8Array> {
  const bytes = numberArrayToUint8Array(encodeUTF8(s));
  const promiseOrEvent = window.crypto.subtle.digest("SHA-256", bytes.buffer);
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

export async function codeChallenge(codeVerifier: string): Promise<string> {
  const hash = await sha256(codeVerifier);
  const base64 = encodeBase64URLFromUint8Array(hash);
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
