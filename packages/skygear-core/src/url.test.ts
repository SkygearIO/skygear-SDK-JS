import { encodeQueryComponent, encodeQuery } from "./url";

describe("encodeQueryComponent", () => {
  const f = encodeQueryComponent;

  it("encode space to +", () => {
    expect(f("a b")).toEqual("a+b");
  });
});

describe("encodeQuery", () => {
  const f = encodeQuery;

  it("encode undefined to empty string", () => {
    expect(f()).toEqual("");
    expect(f(undefined)).toEqual("");
  });

  it("encode empty query to empty string", () => {
    expect(f([])).toEqual("");
  });

  it("encode query with leading ?", () => {
    expect(f([["a", "b"]])).toEqual("?a=b");
  });

  it("encode more than one pair", () => {
    expect(f([["a", "b"], ["c", "d"]])).toEqual("?a=b&c=d");
  });

  it("encode key and value", () => {
    expect(f([["key1", "a b c"], ["key2", "c d e"]])).toEqual(
      "?key1=a+b+c&key2=c+d+e"
    );
  });

  it("skip empty pair", () => {
    expect(f([["", ""], ["a", "b"], ["", ""], ["c", "d"]])).toEqual("?a=b&c=d");
    expect(f([["a", "b"], ["", ""], ["c", "d"], ["", ""]])).toEqual("?a=b&c=d");
  });

  it("omit empty value", () => {
    expect(f([["a", ""], ["b", ""]])).toEqual("?a&b");
  });

  it("support empty key", () => {
    expect(f([["", "a"], ["", "b"]])).toEqual("?=a&=b");
  });
});
