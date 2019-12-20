import { _windowAtob } from "@skygear/core";

/**
 * @internal
 */
export function extractResultFromURL(url: string): any {
  const anchor = "x-skygear-result=";
  const idx = url.indexOf(anchor);
  if (idx < 0) {
    throw new Error("missing x-skygear-result in redirect URL");
  }
  let result = "";
  const fragmentIdx = url.lastIndexOf("#");
  if (fragmentIdx < 0) {
    result = url.substring(idx + anchor.length);
  } else {
    result = url.substring(idx + anchor.length, fragmentIdx);
  }
  result = decodeURIComponent(result);
  const jsonStr = _windowAtob(result);
  const j = JSON.parse(jsonStr);
  return j;
}
