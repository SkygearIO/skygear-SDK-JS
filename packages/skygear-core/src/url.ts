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
