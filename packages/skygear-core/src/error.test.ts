import { SkygearError, decodeError } from "./error";

describe("decodeError", () => {
  it("decodes skygear error", () => {
    const actual = decodeError({
      name: "name",
      reason: "reason",
      message: "message",
      code: 401,
      info: {
        a: "b",
      },
    });
    const expected = new SkygearError("message", "name", "reason", {
      a: "b",
    });
    expect(actual).toBeInstanceOf(SkygearError);
    expect(actual.name).toEqual(expected.name);
    expect(actual.message).toEqual(expected.message);
    expect((actual as any).reason).toEqual(expected.reason);
    expect((actual as any).info).toEqual(expected.info);
  });

  it("returns Error", () => {
    const e = new Error("test");
    expect(decodeError(e)).toBe(e);
  });

  it("decodes object with message", () => {
    const actual = decodeError({
      message: "error message",
    });
    expect(actual).toBeInstanceOf(Error);
    expect(actual.message).toEqual("error message");
  });

  it("decodes object with toString", () => {
    const actual = decodeError({
      toString: () => "error message",
    });
    expect(actual).toBeInstanceOf(Error);
    expect(actual.message).toEqual("error message");
  });

  it("decodes by casting to string", () => {
    const nullError = decodeError(null);
    expect(nullError).toBeInstanceOf(Error);
    expect(nullError.message).toEqual("null");

    const undefinedError = decodeError();
    expect(undefinedError).toBeInstanceOf(Error);
    expect(undefinedError.message).toEqual("undefined");
  });
});
