import { v5 } from "uuid";
import type {
  AnalyticsTraceEvent,
  AnalyticsGenerationEvent,
  AnalyticsScoreEvent,
  AnalyticsObservationEvent,
} from "@langfuse/shared/src/server";

// UUID v5 namespace for Mixpanel (different from PostHog)
const MIXPANEL_UUID_NAMESPACE = "8f7c3e42-9a1b-4d5f-8e2a-1c6b9d3f4e7a";

// Values that Mixpanel's /import?strict=1 API rejects as distinct_id.
const MIXPANEL_BAD_DISTINCT_IDS = new Set([
  "undefined",
  "null",
  "nil",
  "none",
  "unknown",
  "n/a",
  "na",
  "anon",
  "anonymous",
  "false",
  "true",
  "0",
  "-1",
  "00000000-0000-0000-0000-000000000000",
  "<nil>",
  "[]",
  "{}",
  "lmy47d",
]);

function isBadDistinctId(value: unknown): boolean {
  if (typeof value !== "string" || !value) return true;
  return MIXPANEL_BAD_DISTINCT_IDS.has(value.trim().toLowerCase());
}

export type MixpanelEvent = {
  event: string;
  properties: {
    time: number; // milliseconds since epoch
    distinct_id: string;
    $insert_id: string;
    $user_id?: string;
    session_id?: string;
    [key: string]: unknown;
  };
};

export const transformTraceForMixpanel = (
  trace: AnalyticsTraceEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${trace.activetrace_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = trace;

  const hasValidUserId = !isBadDistinctId(trace.activetrace_user_id);

  return {
    event: "[Active Trace] Trace",
    properties: {
      time: new Date(trace.timestamp as Date).getTime(),
      // Empty string signals Mixpanel to distribute the event across shards
      // without attributing it to a user (recommended for non-user events).
      distinct_id: hasValidUserId ? (trace.activetrace_user_id as string) : "",
      $insert_id: insertId,
      ...(hasValidUserId
        ? { $user_id: trace.activetrace_user_id as string }
        : {}),
      session_id:
        mixpanel_session_id || trace.activetrace_session_id
          ? (mixpanel_session_id as string) ||
            (trace.activetrace_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};

export const transformGenerationForMixpanel = (
  generation: AnalyticsGenerationEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${generation.activetrace_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = generation;

  const hasValidUserId = !isBadDistinctId(generation.activetrace_user_id);

  return {
    event: "[Active Trace] Generation",
    properties: {
      time: new Date(generation.timestamp as Date).getTime(),
      distinct_id: hasValidUserId
        ? (generation.activetrace_user_id as string)
        : "",
      $insert_id: insertId,
      ...(hasValidUserId
        ? { $user_id: generation.activetrace_user_id as string }
        : {}),
      session_id:
        mixpanel_session_id || generation.activetrace_session_id
          ? (mixpanel_session_id as string) ||
            (generation.activetrace_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};

export const transformScoreForMixpanel = (
  score: AnalyticsScoreEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${score.activetrace_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = score;

  const hasValidUserId = !isBadDistinctId(score.activetrace_user_id);

  return {
    event: "[Active Trace] Score",
    properties: {
      time: new Date(score.timestamp as Date).getTime(),
      distinct_id: hasValidUserId ? (score.activetrace_user_id as string) : "",
      $insert_id: insertId,
      ...(hasValidUserId
        ? { $user_id: score.activetrace_user_id as string }
        : {}),
      session_id:
        mixpanel_session_id || score.activetrace_session_id
          ? (mixpanel_session_id as string) ||
            (score.activetrace_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};

export const transformEventForMixpanel = (
  event: AnalyticsObservationEvent,
  projectId: string,
): MixpanelEvent => {
  const insertId = v5(
    `${projectId}-${event.activetrace_id}`,
    MIXPANEL_UUID_NAMESPACE,
  );

  // Extract session IDs and exclude from properties

  const { posthog_session_id, mixpanel_session_id, ...otherProps } = event;

  const hasValidUserId = !isBadDistinctId(event.activetrace_user_id);

  return {
    event: "[Active Trace] Observation",
    properties: {
      time: new Date(event.timestamp as Date).getTime(),
      distinct_id: hasValidUserId ? (event.activetrace_user_id as string) : "",
      $insert_id: insertId,
      ...(hasValidUserId
        ? { $user_id: event.activetrace_user_id as string }
        : {}),
      session_id:
        mixpanel_session_id || event.activetrace_session_id
          ? (mixpanel_session_id as string) ||
            (event.activetrace_session_id as string)
          : undefined,
      ...otherProps,
    },
  };
};
