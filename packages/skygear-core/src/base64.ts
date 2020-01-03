import { _encodeUTF8 } from "./utf8";
import { ByteArray } from "./types";

// https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding
function uint6ToB64(nUint6: number) {
  return nUint6 < 26
    ? nUint6 + 65
    : nUint6 < 52
    ? nUint6 + 71
    : nUint6 < 62
    ? nUint6 - 4
    : nUint6 === 62
    ? 43
    : nUint6 === 63
    ? 47
    : 65;
}

function uint6ToB64URL(nUint6: number) {
  return nUint6 < 26
    ? nUint6 + 65
    : nUint6 < 52
    ? nUint6 + 71
    : nUint6 < 62
    ? nUint6 - 4
    : nUint6 === 62
    ? 45
    : nUint6 === 63
    ? 95
    : 65;
}

function base64EncArr(aBytes: ByteArray) {
  const eqLen = (3 - (aBytes.length % 3)) % 3;
  let sB64Enc = "";
  let nUint24 = 0;
  for (let nIdx = 0; nIdx < aBytes.length; nIdx++) {
    const nMod3 = nIdx % 3;
    nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCharCode(
        uint6ToB64((nUint24 >>> 18) & 63),
        uint6ToB64((nUint24 >>> 12) & 63),
        uint6ToB64((nUint24 >>> 6) & 63),
        uint6ToB64(nUint24 & 63)
      );
      nUint24 = 0;
    }
  }

  return eqLen === 0
    ? sB64Enc
    : sB64Enc.substring(0, sB64Enc.length - eqLen) + (eqLen === 1 ? "=" : "==");
}

function base64URLEncArr(aBytes: ByteArray) {
  const eqLen = (3 - (aBytes.length % 3)) % 3;
  let sB64Enc = "";
  let nUint24 = 0;
  for (let nIdx = 0; nIdx < aBytes.length; nIdx++) {
    const nMod3 = nIdx % 3;
    nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCharCode(
        uint6ToB64URL((nUint24 >>> 18) & 63),
        uint6ToB64URL((nUint24 >>> 12) & 63),
        uint6ToB64URL((nUint24 >>> 6) & 63),
        uint6ToB64URL(nUint24 & 63)
      );
      nUint24 = 0;
    }
  }

  return eqLen === 0 ? sB64Enc : sB64Enc.substring(0, sB64Enc.length - eqLen);
}

/**
 * @internal
 */
export function _encodeBase64FromString(input: string): string {
  const bytes = _encodeUTF8(input);
  return base64EncArr(bytes);
}

/**
 * @internal
 */
export function _encodeBase64URLFromByteArray(bytes: ByteArray): string {
  return base64URLEncArr(bytes);
}

/**
 * @internal
 */
export function _windowAtob(string: string): string {
  // This is borrowed from
  // https://github.com/MaxArt2501/base64-js/blob/master/base64.js
  const b64 =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  // Regular expression to check formal correctness of base64 encoded strings
  // eslint-disable-next-line no-useless-escape
  const b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;
  // atob can work with strings with whitespaces, even inside the encoded part,
  // but only \t, \n, \f, \r and ' ', which can be stripped.
  string = String(string).replace(/[\t\n\f\r ]+/g, "");
  if (!b64re.test(string))
    throw new TypeError(
      "Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded."
    );

  // Adding the padding if missing, for semplicity
  string += "==".slice(2 - (string.length & 3));
  let bitmap,
    result = "",
    r1,
    r2,
    i = 0;
  for (; i < string.length; ) {
    bitmap =
      (b64.indexOf(string.charAt(i++)) << 18) |
      (b64.indexOf(string.charAt(i++)) << 12) |
      ((r1 = b64.indexOf(string.charAt(i++))) << 6) |
      (r2 = b64.indexOf(string.charAt(i++)));

    result +=
      r1 === 64
        ? String.fromCharCode((bitmap >> 16) & 255)
        : r2 === 64
        ? String.fromCharCode((bitmap >> 16) & 255, (bitmap >> 8) & 255)
        : String.fromCharCode(
            (bitmap >> 16) & 255,
            (bitmap >> 8) & 255,
            bitmap & 255
          );
  }
  return result;
}
