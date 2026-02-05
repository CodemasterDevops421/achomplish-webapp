import * as Sentry from "@sentry/node";

let initialized = false;

export function initSentryServer() {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureServerError(error: unknown, context?: Record<string, unknown>) {
  initSentryServer();
  if (context) {
    Sentry.setContext("context", context);
  }
  Sentry.captureException(error);
}

export { Sentry };
