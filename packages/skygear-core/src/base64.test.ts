import { encodeBase64 } from "./base64";

describe("encodeBase64", () => {
  const f = encodeBase64;

  it("encode ASCII strings", () => {
    expect(f("test")).toEqual("dGVzdA==");
  });

  it("encode unicode strings", () => {
    expect(f("測試")).toEqual("5ris6Kmm");
  });

  it("encode complex unicode strings", () => {
    expect(f("👩‍👩‍👧‍👧")).toEqual("8J+RqeKAjfCfkanigI3wn5Gn4oCN8J+Rpw==");
  });
});
