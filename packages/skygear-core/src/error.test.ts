import { SkygearError, decodeError } from "./error";

describe("decodeError", () => {
  it("decodes skygear error", () => {
    expect(
      decodeError({
        code: 101,
        message: "message",
        name: "name",
      })
    ).toEqual(
      new SkygearError(101, "message", "name", {
        a: "b",
      })
    );
  });
});
