import { SkygearError } from "./error";

/**
 * @public
 */
export interface ValidationError extends SkygearError {
  reason: "ValidationFailed";
  info: {
    causes: ValidationErrorCause[];
  };
}

/**
 * @public
 */
export const ValidationErrorKinds = {
  General: "General",
  Required: "Required",
  Type: "Type",
  Constant: "Constant",
  Enum: "Enum",
  ExtraEntry: "ExtraEntry",
  EntryAmount: "EntryAmount",
  StringLength: "StringLength",
  StringFormat: "StringFormat",
  NumberRange: "NumberRange",
} as const;

/**
 * @public
 */
export type ValidationErrorKind = (typeof ValidationErrorKinds)[keyof (typeof ValidationErrorKinds)];

interface ValidationErrorCauseBase<Kind, Details> {
  kind: Kind;
  pointer: string;
  message: string;
  details: Details;
}

interface ValidationErrorExpectationDetails {
  expected: unknown;
}
interface ValidationErrorRangeDetails {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}
interface ValidationErrorFormatDetails {
  pattern?: string;
  format?: string;
}
type ValidationInvalidTypeCause = ValidationErrorCauseBase<
  "Type",
  ValidationErrorExpectationDetails
>;
type ValidationInvalidConstantCause = ValidationErrorCauseBase<
  "Constant",
  ValidationErrorExpectationDetails
>;
type ValidationInvalidEnumCause = ValidationErrorCauseBase<
  "Enum",
  ValidationErrorExpectationDetails
>;
type ValidationInvalidStringFormatCause = ValidationErrorCauseBase<
  "StringFormat",
  ValidationErrorFormatDetails
>;
type ValidationInvalidEntryAmountCause = ValidationErrorCauseBase<
  "EntryAmount",
  ValidationErrorRangeDetails
>;
type ValidationInvalidStringLengthCause = ValidationErrorCauseBase<
  "StringLength",
  ValidationErrorRangeDetails
>;
type ValidationInvalidNumberRangeCause = ValidationErrorCauseBase<
  "NumberRange",
  ValidationErrorRangeDetails
>;

/**
 * @public
 */
type ValidationErrorCause =
  | ValidationErrorCauseBase<ValidationErrorKind, never>
  | ValidationInvalidTypeCause
  | ValidationInvalidConstantCause
  | ValidationInvalidEnumCause
  | ValidationInvalidStringFormatCause
  | ValidationInvalidEntryAmountCause
  | ValidationInvalidStringLengthCause
  | ValidationInvalidNumberRangeCause;

/**
 * @public
 */
export function isValidationError(err: unknown): err is ValidationError {
  if (
    err instanceof SkygearError &&
    err.reason === "ValidationFailed" &&
    err.info != null &&
    "causes" in err.info
  ) {
    return true;
  }
  return false;
}
