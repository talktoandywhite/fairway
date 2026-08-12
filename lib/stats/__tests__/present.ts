/**
 * Narrow a `T | null` to `T` for assertions on functions that return null for
 * the empty/insufficient case. Throws (failing the test) if the value is null,
 * so the returned value is safely non-null without a forbidden `!` assertion.
 */
export function present<T>(value: T | null): T {
  if (value === null) {
    throw new Error("expected a non-null value, received null");
  }
  return value;
}
