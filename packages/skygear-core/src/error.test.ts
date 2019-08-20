import { SkygearError, decodeError } from "./error";

describe("decodeError", () => {
  it("decodes skygear error", () => {
    const actual = decodeError({
      message: "message",
      name: "name",
      info: {
        a: "b",
      },
    });
    const expected = new SkygearError("message", "name", {
      a: "b",
    });
    expect(actual).toBeInstanceOf(SkygearError);
    expect(actual.message).toEqual(expected.message);
    expect(actual.name).toEqual(expected.name);
    expect((actual as any).info).toEqual(expected.info);
  });
});
