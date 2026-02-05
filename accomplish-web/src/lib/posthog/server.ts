import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (!process.env.POSTHOG_SERVER_KEY) {
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.POSTHOG_SERVER_KEY, {
      host: process.env.POSTHOG_HOST || "https://app.posthog.com",
    });
  }

  return posthogClient;
}

export async function posthogCaptureServer(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) {
    return;
  }

  client.capture({
    distinctId: userId,
    event,
    properties,
  });

  await client.flush();
}

export async function posthogShutdown() {
  const client = getPostHogClient();
  if (client) {
    await client.shutdown();
  }
}
