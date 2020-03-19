/**
 * @public
 */
export function encodeQueryComponent(s: string): string {
  return encodeURIComponent(s).replace(/%20/g, "+");
}

/**
 * @public
 */
export function encodeQuery(query?: [string, string][]): string {
  if (query == null || query.length <= 0) {
    return "";
  }
  let output = "?";
  for (let i = 0; i < query.length; ++i) {
    const key = encodeQueryComponent(query[i][0]);
    const value = encodeQueryComponent(query[i][1]);

    if (key === "" && value === "") {
      continue;
    }
    if (output !== "?") {
      output += "&";
    }

    output += key;
    if (value !== "") {
      output += "=";
      output += value;
    }
  }
  return output;
}

/**
 * @public
 */
export function decodeQueryComponent(s: string): string {
  return decodeURIComponent(s.replace(/\+/g, "%20"));
}

/**
 * @public
 */
export function decodeQuery(query?: string): [string, string][] {
  if (!query) {
    return [];
  }
  const vars = query.split("&");
  const result: [string, string][] = [];
  for (let i = 0; i < vars.length; i++) {
    const idx = vars[i].indexOf("=");
    let key = "";
    let value = "";
    if (idx === -1) {
      key = vars[i];
      value = "";
    } else {
      key = vars[i].slice(0, idx);
      value = vars[i].slice(idx + 1);
    }
    result.push([decodeQueryComponent(key), decodeQueryComponent(value)]);
  }

  return result;
}
