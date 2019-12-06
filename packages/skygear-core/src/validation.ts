import { SkygearError } from "./error";

/**
 * @public
 */
export interface ValidationError extends SkygearError {
  /**
   * {@inheritdoc SkygearError.reason}
   */
  reason: "ValidationFailed";
  info: {
    /**
     * Error causes.
     */
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

/**
 * @public
 */
export interface ValidationErrorCauseBase<Kind, Details> {
  /**
   * Validation error kind.
   */
  kind: Kind;
  /**
   * JSON pointer to field causing the error.
   */
  pointer: string;
  /**
   * Error message.
   *
   * @remarks
   * Error messages are provided for convenience, and not stable APIs;
   * Consumers should use {@link ValidationErrorCauseBase.kind} to distinguish
   * between different error causes.
   */
  message: string;
  /**
   * Error details.
   *
   * @remarks
   * Error details are specific to each error cause kind.
   */
  details: Details;
}

/**
 * @public
 */
export interface ValidationErrorExpectationDetails {
  expected: unknown;
}
/**
 * @public
 */
export interface ValidationErrorRangeDetails {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}
/**
 * @public
 */
export interface ValidationErrorFormatDetails {
  pattern?: string;
  format?: string;
}
/**
 * @public
 */
export type ValidationInvalidTypeCause = ValidationErrorCauseBase<
  "Type",
  ValidationErrorExpectationDetails
>;
/**
 * @public
 */
export type ValidationInvalidConstantCause = ValidationErrorCauseBase<
  "Constant",
  ValidationErrorExpectationDetails
>;
/**
 * @public
 */
export type ValidationInvalidEnumCause = ValidationErrorCauseBase<
  "Enum",
  ValidationErrorExpectationDetails
>;
/**
 * @public
 */
export type ValidationInvalidStringFormatCause = ValidationErrorCauseBase<
  "StringFormat",
  ValidationErrorFormatDetails
>;
/**
 * @public
 */
export type ValidationInvalidEntryAmountCause = ValidationErrorCauseBase<
  "EntryAmount",
  ValidationErrorRangeDetails
>;
/**
 * @public
 */
export type ValidationInvalidStringLengthCause = ValidationErrorCauseBase<
  "StringLength",
  ValidationErrorRangeDetails
>;
/**
 * @public
 */
export type ValidationInvalidNumberRangeCause = ValidationErrorCauseBase<
  "NumberRange",
  ValidationErrorRangeDetails
>;

/**
 * @public
 */
export type ValidationErrorCause =
  | ValidationErrorCauseBase<ValidationErrorKind, never>
  | ValidationInvalidTypeCause
  | ValidationInvalidConstantCause
  | ValidationInvalidEnumCause
  | ValidationInvalidStringFormatCause
  | ValidationInvalidEntryAmountCause
  | ValidationInvalidStringLengthCause
  | ValidationInvalidNumberRangeCause;

/**
 * Check if the provided error indicates the server failed to validate input
 * parameters to API.
 *
 * @remarks
 * The error may be thrown when calling any of the Skygear APIs.
 *
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
