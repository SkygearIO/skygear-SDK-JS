import { encodeQueryComponent } from "./url";

describe("encodeQueryComponent", () => {
  const f = encodeQueryComponent;

  it("encode space to +", () => {
    expect(f("a b")).toEqual("a+b");
  });
});
