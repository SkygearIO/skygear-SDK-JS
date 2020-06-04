import { ByteArray } from "./types";

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
export function _encodeBase64URLFromByteArray(bytes: ByteArray): string {
  return base64URLEncArr(bytes);
}
