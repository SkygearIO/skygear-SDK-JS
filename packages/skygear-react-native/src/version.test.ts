import { parseSemver } from "./version";

describe("parseSemver", () => {
  it("parse semver", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseSemver("0.2.12")).toEqual({ major: 0, minor: 2, patch: 12 });
    expect(parseSemver("0.2.0")).toEqual({ major: 0, minor: 2, patch: 0 });
    expect(parseSemver("1.2")).toEqual({ major: 1, minor: 2, patch: 0 });
    expect(parseSemver("1")).toEqual(undefined);
    expect(parseSemver(".1")).toEqual(undefined);
    expect(parseSemver("v1.2.3")).toEqual(undefined);
  });
});
