import { v5 } from "uuid";
import type {
  AnalyticsTraceEvent,
  AnalyticsGenerationEvent,
  AnalyticsScoreEvent,
  AnalyticsObservationEvent,
} from "@langfuse/shared/src/server";

// UUID v5 namespace for PostHog
const POSTHOG_UUID_NAMESPACE = "0f6c91df-d035-4813-b838-9741ba38ef0b";

type PostHogEvent = {
  distinctId: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  uuid: string;
};

export const transformTraceForPostHog = (
  trace: AnalyticsTraceEvent,
  projectId: string,
): PostHogEvent => {
  const uuid = v5(
    `${projectId}-${trace.activetrace_id}`,
    POSTHOG_UUID_NAMESPACE,
  );

  // Extract posthog_session_id and map to $session_id

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = trace;

  return {
    distinctId: trace.activetrace_user_id
      ? (trace.activetrace_user_id as string)
      : uuid,
    event: "active trace trace",
    properties: {
      ...otherProps,
      $session_id: posthog_session_id ?? null,
      // PostHog-specific: add user profile enrichment or mark as anonymous
      ...(trace.activetrace_user_id && trace.activetrace_user_url
        ? {
            $set: {
              activetrace_user_url: trace.activetrace_user_url,
            },
          }
        : // Capture as anonymous PostHog event (cheaper/faster)
          // https://posthog.com/docs/data/anonymous-vs-identified-events?tab=Backend
          { $process_person_profile: false }),
    },
    timestamp: trace.timestamp as Date,
    uuid,
  };
};

export const transformGenerationForPostHog = (
  generation: AnalyticsGenerationEvent,
  projectId: string,
): PostHogEvent => {
  const uuid = v5(
    `${projectId}-${generation.activetrace_id}`,
    POSTHOG_UUID_NAMESPACE,
  );

  // Extract posthog_session_id and map to $session_id

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = generation;

  return {
    distinctId: generation.activetrace_user_id
      ? (generation.activetrace_user_id as string)
      : uuid,
    event: "langfuse generation",
    properties: {
      ...otherProps,
      $session_id: posthog_session_id ?? null,
      // PostHog-specific: add user profile enrichment or mark as anonymous
      ...(generation.activetrace_user_id && generation.activetrace_user_url
        ? {
            $set: {
              activetrace_user_url: generation.activetrace_user_url,
            },
          }
        : // Capture as anonymous PostHog event (cheaper/faster)
          // https://posthog.com/docs/data/anonymous-vs-identified-events?tab=Backend
          { $process_person_profile: false }),
    },
    timestamp: generation.timestamp as Date,
    uuid,
  };
};

export const transformScoreForPostHog = (
  score: AnalyticsScoreEvent,
  projectId: string,
): PostHogEvent => {
  const uuid = v5(
    `${projectId}-${score.activetrace_id}`,
    POSTHOG_UUID_NAMESPACE,
  );

  // Extract posthog_session_id and map to $session_id

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = score;

  return {
    distinctId: score.activetrace_user_id
      ? (score.activetrace_user_id as string)
      : uuid,
    event: "langfuse score",
    properties: {
      ...otherProps,
      $session_id: posthog_session_id ?? null,
      // PostHog-specific: add user profile enrichment or mark as anonymous
      ...(score.activetrace_user_id && score.activetrace_user_url
        ? {
            $set: {
              activetrace_user_url: score.activetrace_user_url,
            },
          }
        : // Capture as anonymous PostHog event (cheaper/faster)
          // https://posthog.com/docs/data/anonymous-vs-identified-events?tab=Backend
          { $process_person_profile: false }),
    },
    timestamp: score.timestamp as Date,
    uuid,
  };
};

export const transformEventForPostHog = (
  event: AnalyticsObservationEvent,
  projectId: string,
): PostHogEvent => {
  const uuid = v5(
    `${projectId}-${event.activetrace_id}`,
    POSTHOG_UUID_NAMESPACE,
  );

  // Extract posthog_session_id and map to $session_id

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = event;

  return {
    distinctId: event.activetrace_user_id
      ? (event.activetrace_user_id as string)
      : uuid,
    event: "langfuse observation",
    properties: {
      ...otherProps,
      $session_id: posthog_session_id ?? null,
      // PostHog-specific: add user profile enrichment or mark as anonymous
      ...(event.activetrace_user_id && event.activetrace_user_url
        ? {
            $set: {
              activetrace_user_url: event.activetrace_user_url,
            },
          }
        : // Capture as anonymous PostHog event (cheaper/faster)
          // https://posthog.com/docs/data/anonymous-vs-identified-events?tab=Backend
          { $process_person_profile: false }),
    },
    timestamp: event.timestamp as Date,
    uuid,
  };
};
