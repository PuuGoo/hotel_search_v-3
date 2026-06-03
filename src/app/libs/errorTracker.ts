type ErrorLevel = "info" | "warning" | "error" | "critical";

interface ErrorReport {
  level: ErrorLevel;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

const MAX_ERRORS = 100;
let errorBuffer: ErrorReport[] = [];

function getBrowserContext() {
  if (typeof window === "undefined") {
    return { url: "server", userAgent: "server" };
  }
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}

export function trackError(
  level: ErrorLevel,
  message: string,
  context?: Record<string, unknown>,
  userId?: string,
  stack?: string
) {
  const { url, userAgent } = getBrowserContext();

  const report: ErrorReport = {
    level,
    message,
    stack,
    context,
    userId,
    timestamp: new Date().toISOString(),
    url,
    userAgent,
  };

  console.error(`[ERROR_TRACKER][${level.toUpperCase()}] ${message}`, context ?? "");

  errorBuffer.push(report);

  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer = errorBuffer.slice(-MAX_ERRORS);
  }
}

export function getRecentErrors(limit: number = 50): ErrorReport[] {
  return errorBuffer.slice(-limit).reverse();
}

export function clearErrors(): void {
  errorBuffer = [];
}

export function getErrorStats() {
  const byLevel: Record<ErrorLevel, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  };
  const byMessage: Record<string, number> = {};

  for (const err of errorBuffer) {
    byLevel[err.level]++;
    byMessage[err.message] = (byMessage[err.message] || 0) + 1;
  }

  const topMessages = Object.entries(byMessage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }));

  return {
    total: errorBuffer.length,
    byLevel,
    topMessages,
  };
}

export function getAllErrors(): ErrorReport[] {
  return [...errorBuffer];
}

export type { ErrorLevel, ErrorReport };
