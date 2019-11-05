import { isValidationError, ValidationErrorKinds } from "./validation";
import { SkygearError } from "./error";

describe("ValidationError", () => {
  const error = new SkygearError(
    "validation failed",
    "Invalid",
    "ValidationFailed",
    {
      causes: [
        {
          kind: "General",
          pointer: "/login_id",
          message: "invalid login ID format",
        },
        {
          kind: "Type",
          pointer: "/password",
          message: "should be string instead of number",
          details: { expected: "string" },
        },
        {
          kind: "StringLength",
          pointer: "/password",
          message: "should be have at least 8 characters",
          details: { gte: 8 },
        },
      ],
    }
  );
  it("should be distinguished from SkygearError", () => {
    expect(isValidationError(error)).toBeTruthy();
  });
  it("should have correct typing", () => {
    if (!isValidationError(error)) {
      return;
    }
    for (const cause of error.info.causes) {
      switch (cause.kind) {
        case ValidationErrorKinds.General:
          expect(cause.pointer).toEqual("/login_id");
          expect(cause.message).toEqual("invalid login ID format");
          expect(cause.details).toBeUndefined();
          break;
        case ValidationErrorKinds.Type:
          expect(cause.pointer).toEqual("/password");
          expect(cause.message).toEqual("should be string instead of number");
          expect(cause.details.expected).toEqual("string");
          break;
        case ValidationErrorKinds.StringLength:
          expect(cause.pointer).toEqual("/password");
          expect(cause.message).toEqual("should be have at least 8 characters");
          expect(cause.details.gte).toEqual(8);
          break;
        default:
          throw new Error("unreachable");
      }
    }
  });
});
