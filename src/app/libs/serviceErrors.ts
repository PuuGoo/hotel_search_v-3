// Typed error contract for transient "service unavailable" conditions in the
// search path. Previously the route classified 503s by substring-matching the
// English error message ("Circuit breaker is open" / "exhausted"). That coupling
// was brittle: editing a message string in circuitBreaker.ts or tavily.ts would
// silently downgrade an overload from a 503 (which the bulk-search client
// handles by pausing + saving a resumable session) to a generic 500 (which it
// treats as a hard failure). A typed error makes the contract explicit and
// refactor-safe.

export type ServiceUnavailableCode =
  // The circuit breaker is open: upstream has been failing and we are
  // short-circuiting to let it recover.
  | "CIRCUIT_OPEN"
  // Every configured upstream credential (e.g. Tavily API key) was rejected
  // with a retryable status, so the request could not be served.
  | "KEYS_EXHAUSTED";

// A retryable, client-visible "try again later" condition. The route maps any
// ServiceUnavailableError to HTTP 503 regardless of its message text.
export class ServiceUnavailableError extends Error {
  readonly code: ServiceUnavailableCode;

  constructor(code: ServiceUnavailableCode, message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
    this.code = code;
    // Preserve the prototype chain so `instanceof` works after TS down-levels
    // to ES2015 (extending built-ins like Error otherwise breaks instanceof).
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

// Narrow an unknown caught value to a ServiceUnavailableError. Used by the route
// so the 503 decision does not depend on message-string matching.
export function isServiceUnavailable(
  error: unknown
): error is ServiceUnavailableError {
  return error instanceof ServiceUnavailableError;
}
