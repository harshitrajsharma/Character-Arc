/**
 * Wall-clock timestamp helper for attempt events.
 *
 * Lives in its own module so the React Compiler's render-purity analysis
 * treats `now()` as an opaque call (like `createIdempotencyKey`), avoiding
 * `react-hooks/purity` errors when timestamps are needed in event handlers.
 */
export function now(): number {
  return Date.now()
}
