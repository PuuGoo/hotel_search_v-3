import { ServiceUnavailableError } from "./serviceErrors";

const STATES = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half_open",
} as const;

type CircuitState = (typeof STATES)[keyof typeof STATES];

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
}

export class CircuitBreaker {
  private failureThreshold: number;
  private resetTimeout: number;
  private state: CircuitState;
  private failureCount: number;
  private lastFailureTime: number | null;
  private successCount: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === STATES.OPEN) {
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = STATES.HALF_OPEN;
      } else {
        // Typed so the API layer can classify this as a 503 without matching
        // the message text. Message kept identical for backward compatibility.
        throw new ServiceUnavailableError(
          "CIRCUIT_OPEN",
          "Circuit breaker is open"
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === STATES.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    // Reset the half-open success streak: closing requires CONSECUTIVE
    // successes, so any failure (including a failed half-open probe) must
    // restart the count from zero.
    this.successCount = 0;
    if (this.failureCount >= this.failureThreshold) {
      this.state = STATES.OPEN;
    }
  }

  private reset(): void {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}
