import { TextEncoder } from "util";
import { _encodeBase64URLFromByteArray } from "./base64";

describe("_encodeBase64URLFromByteArray", () => {
  const encoder = new TextEncoder();
  const f = _encodeBase64URLFromByteArray;

  it("encode ASCII strings without padding", () => {
    expect(f(encoder.encode("test"))).toEqual("dGVzdA");
  });
});
