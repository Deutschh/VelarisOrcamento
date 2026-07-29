const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type IdempotencyKey = string & { readonly __brand: "IdempotencyKey" };

export function parseIdempotencyKey(value: string): IdempotencyKey {
  if (!uuidV4Pattern.test(value)) {
    throw new Error("Idempotency key must be a UUID v4.");
  }

  return value as IdempotencyKey;
}
