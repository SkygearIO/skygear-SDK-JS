import { _gearEndpoint } from "./client";

describe("_gearEndpoint", () => {
  it("https endpoint", () => {
    expect(_gearEndpoint("https://example.com", "accounts")).toEqual(
      "https://accounts.example.com"
    );
  });

  it("http endpoint", () => {
    expect(_gearEndpoint("http://localhost.com", "accounts")).toEqual(
      "http://accounts.localhost.com"
    );
  });

  it("empty protocol endpoint", () => {
    expect(_gearEndpoint("//example.com", "accounts")).toEqual(
      "//accounts.example.com"
    );
  });

  it("invalid app endpoint should throw error", () => {
    expect(() => {
      _gearEndpoint("example.com", "accounts");
    }).toThrow();
  });
});
