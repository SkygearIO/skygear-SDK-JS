import { TextEncoder } from "util";
import {
  _encodeBase64FromString,
  _encodeBase64URLFromByteArray,
} from "./base64";

describe("_encodeBase64FromString", () => {
  const f = _encodeBase64FromString;

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

describe("_encodeBase64URLFromByteArray", () => {
  const encoder = new TextEncoder();
  const f = _encodeBase64URLFromByteArray;

  it("encode ASCII strings without padding", () => {
    expect(f(encoder.encode("test"))).toEqual("dGVzdA");
  });
});
