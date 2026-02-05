"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { initSentryClient } from "@/lib/sentry/client";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      initSentryClient();
      const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      if (posthogKey) {
        posthog.init(posthogKey, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
          capture_pageview: true,
          capture_pageleave: true,
          autocapture: true,
          session_recording: {
            recordCrossOriginIframes: true,
          },
        });
      }
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export { posthog };
