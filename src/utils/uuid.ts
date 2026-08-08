/** Generates a RFC-4122 v4 UUID using the browser's crypto API */
export function randomUUID(): string {
  return crypto.randomUUID()
}
