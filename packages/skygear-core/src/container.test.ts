import { generateOTPAuthURI } from "./container";

describe("generateOTPAuthURI", () => {
  it("johndoe@example.com issued by Example", () => {
    expect(
      generateOTPAuthURI({
        secret: "secret",
        accountName: "johndoe@example.com",
        issuer: "Example",
      })
    ).toEqual(
      "otpauth://totp/Example:johndoe@example.com?secret=secret&issuer=Example"
    );
  });

  it("johndoe@example.com issued by Example Co", () => {
    expect(
      generateOTPAuthURI({
        secret: "secret",
        accountName: "johndoe@example.com",
        issuer: "Example Co",
      })
    ).toEqual(
      "otpauth://totp/Example%20Co:johndoe@example.com?secret=secret&issuer=Example+Co"
    );
  });
});
