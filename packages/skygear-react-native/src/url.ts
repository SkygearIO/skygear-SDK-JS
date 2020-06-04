/**
 * @internal
 */
export function getCallbackURLScheme(url: string): string {
  const idx = url.indexOf(":");
  if (idx < 0) {
    return "";
  }
  return url.substring(0, idx);
}
