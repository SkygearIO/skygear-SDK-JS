import { extractResultFromURL } from "./url";

describe("extractResultFromURL", () => {
  it("work", () => {
    expect(
      extractResultFromURL(
        "test://example.com/path?x-skygear-result=eyJoZWxsbyI6IndvcmxkIn0%3D#"
      )
    ).toEqual({ hello: "world" });
  });
});
