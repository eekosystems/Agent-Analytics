import { describe, it, expect } from "vitest";
import {
  transformTraceForMixpanel,
  transformGenerationForMixpanel,
  transformScoreForMixpanel,
  transformEventForMixpanel,
} from "../features/mixpanel/transformers";
import type {
  AnalyticsTraceEvent,
  AnalyticsGenerationEvent,
  AnalyticsScoreEvent,
  AnalyticsObservationEvent,
} from "@langfuse/shared/src/server";

describe("Mixpanel transformers", () => {
  const projectId = "test-project-id";

  describe("transformEventForMixpanel", () => {
    it("should transform an event with user_id", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "test-event",
        activetrace_trace_name: "test-trace",
        activetrace_trace_id: "trace-456",
        activetrace_url:
          "https://langfuse.com/project/test/traces/trace-456?observation=event-123",
        activetrace_user_url: "https://langfuse.com/project/test/users/user-789",
        activetrace_cost_usd: 0.001,
        activetrace_input_units: 100,
        activetrace_output_units: 50,
        activetrace_total_units: 150,
        activetrace_session_id: "session-abc",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: "user-789",
        activetrace_latency: 1.5,
        activetrace_time_to_first_token: 0.3,
        activetrace_release: "v1.0.0",
        activetrace_version: "1",
        activetrace_model: "gpt-4",
        activetrace_level: "DEFAULT",
        activetrace_type: "GENERATION",
        activetrace_tags: ["tag1", "tag2"],
        activetrace_environment: "production",
        activetrace_event_version: "1.0.0",
        posthog_session_id: "posthog-session-123",
        mixpanel_session_id: "mixpanel-session-456",
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.event).toBe("[Active Trace] Observation");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.time).toBe(
        new Date("2024-01-15T10:00:00Z").getTime(),
      );
      expect(result.properties.$insert_id).toBeDefined();
      expect(result.properties.session_id).toBe("mixpanel-session-456");
      expect(result.properties.activetrace_observation_name).toBe("test-event");
      expect(result.properties.activetrace_trace_name).toBe("test-trace");
      expect(result.properties.activetrace_model).toBe("gpt-4");
      expect(result.properties.activetrace_type).toBe("GENERATION");
      // Should not include posthog_session_id or mixpanel_session_id in properties
      expect(result.properties.posthog_session_id).toBeUndefined();
      expect(result.properties.mixpanel_session_id).toBeUndefined();
    });

    it("should transform an anonymous event without user_id", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-anonymous",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "anonymous-event",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: null,
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.event).toBe("[Active Trace] Observation");
      // distinct_id should be empty string for non-user events (Mixpanel distributes across shards)
      expect(result.properties.distinct_id).toBe("");
      // Should not have $user_id for anonymous events
      expect(result.properties.$user_id).toBeUndefined();
      expect(result.properties.session_id).toBeUndefined();
    });

    it("should generate consistent insert IDs for the same event", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-consistent",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "consistent-event",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: null,
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result1 = transformEventForMixpanel(event, projectId);
      const result2 = transformEventForMixpanel(event, projectId);

      expect(result1.properties.$insert_id).toBe(result2.properties.$insert_id);
    });

    it("should use activetrace_session_id when mixpanel_session_id is not available", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-with-langfuse-session",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "session-event",
        activetrace_session_id: "langfuse-session-123",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: "user-456",
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.properties.session_id).toBe("langfuse-session-123");
    });

    it("should prefer mixpanel_session_id over activetrace_session_id", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-with-both-sessions",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "session-event",
        activetrace_session_id: "langfuse-session-123",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: "user-456",
        activetrace_event_version: "1.0.0",
        posthog_session_id: "posthog-session-789",
        mixpanel_session_id: "mixpanel-session-456",
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.properties.session_id).toBe("mixpanel-session-456");
    });

    it("should include activetrace_project_name in properties", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-with-project-name",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "test-event",
        activetrace_project_id: projectId,
        activetrace_project_name: "My Custom Project Name",
        activetrace_user_id: "user-123",
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);

      expect(result.properties.activetrace_project_name).toBe(
        "My Custom Project Name",
      );
    });
  });

  describe("bad distinct_id handling", () => {
    const badIds = [
      "undefined",
      "null",
      "Null",
      "NULL",
      "0",
      "-1",
      "00000000-0000-0000-0000-000000000000",
      "unknown",
      "anonymous",
      " undefined ",
      "lmy47d",
    ];

    it.each(badIds)(
      "transformTraceForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const trace: AnalyticsTraceEvent = {
          activetrace_id: "trace-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          activetrace_trace_name: "test",
          activetrace_project_id: projectId,
          activetrace_project_name: "Test",
          activetrace_user_id: badId,
          activetrace_event_version: "1.0.0",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformTraceForMixpanel(trace, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it.each(badIds)(
      "transformGenerationForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const generation: AnalyticsGenerationEvent = {
          activetrace_id: "gen-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          activetrace_generation_name: "test",
          activetrace_trace_name: "test",
          activetrace_trace_id: "trace-456",
          activetrace_project_id: projectId,
          activetrace_project_name: "Test",
          activetrace_user_id: badId,
          activetrace_event_version: "1.0.0",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformGenerationForMixpanel(generation, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it.each(badIds)(
      "transformScoreForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const score: AnalyticsScoreEvent = {
          activetrace_id: "score-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          activetrace_score_name: "test",
          activetrace_score_value: 1,
          activetrace_score_data_type: "NUMERIC",
          activetrace_trace_name: "test",
          activetrace_trace_id: "trace-456",
          activetrace_project_id: projectId,
          activetrace_project_name: "Test",
          activetrace_user_id: badId,
          activetrace_event_version: "1.0.0",
          activetrace_score_entity_type: "trace",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformScoreForMixpanel(score, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it.each(badIds)(
      "transformEventForMixpanel falls back to empty string distinct_id when user_id is '%s'",
      (badId) => {
        const event: AnalyticsObservationEvent = {
          activetrace_id: "event-bad-id",
          timestamp: new Date("2024-01-15T10:00:00Z"),
          activetrace_observation_name: "test",
          activetrace_project_id: projectId,
          activetrace_project_name: "Test",
          activetrace_user_id: badId,
          activetrace_event_version: "1.0.0",
          posthog_session_id: null,
          mixpanel_session_id: null,
        };

        const result = transformEventForMixpanel(event, projectId);
        expect(result.properties.distinct_id).toBe("");
        expect(result.properties.$user_id).toBeUndefined();
      },
    );

    it("should still use a valid user_id as distinct_id", () => {
      const event: AnalyticsObservationEvent = {
        activetrace_id: "event-valid",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_observation_name: "test",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test",
        activetrace_user_id: "real-user-123",
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: null,
      };

      const result = transformEventForMixpanel(event, projectId);
      expect(result.properties.distinct_id).toBe("real-user-123");
      expect(result.properties.$user_id).toBe("real-user-123");
    });
  });

  describe("transformTraceForMixpanel", () => {
    it("should transform a trace with user_id", () => {
      const trace: AnalyticsTraceEvent = {
        activetrace_id: "trace-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_trace_name: "test-trace",
        activetrace_url: "https://langfuse.com/project/test/traces/trace-123",
        activetrace_user_url: "https://langfuse.com/project/test/users/user-789",
        activetrace_cost_usd: 0.01,
        activetrace_count_observations: 5,
        activetrace_session_id: "session-abc",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: "user-789",
        activetrace_latency: 2.5,
        activetrace_release: "v1.0.0",
        activetrace_version: "1",
        activetrace_tags: ["tag1"],
        activetrace_environment: "production",
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: "mixpanel-session-123",
      };

      const result = transformTraceForMixpanel(trace, projectId);

      expect(result.event).toBe("[Active Trace] Trace");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.session_id).toBe("mixpanel-session-123");
    });
  });

  describe("transformGenerationForMixpanel", () => {
    it("should transform a generation with user_id", () => {
      const generation: AnalyticsGenerationEvent = {
        activetrace_id: "gen-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_generation_name: "test-generation",
        activetrace_trace_name: "test-trace",
        activetrace_trace_id: "trace-456",
        activetrace_url:
          "https://langfuse.com/project/test/traces/trace-456?observation=gen-123",
        activetrace_user_url: "https://langfuse.com/project/test/users/user-789",
        activetrace_cost_usd: 0.005,
        activetrace_input_units: 200,
        activetrace_output_units: 100,
        activetrace_total_units: 300,
        activetrace_session_id: "session-abc",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: "user-789",
        activetrace_latency: 1.2,
        activetrace_time_to_first_token: 0.2,
        activetrace_release: "v1.0.0",
        activetrace_version: "1",
        activetrace_model: "gpt-4-turbo",
        activetrace_level: "DEFAULT",
        activetrace_tags: ["api"],
        activetrace_environment: "staging",
        activetrace_event_version: "1.0.0",
        posthog_session_id: null,
        mixpanel_session_id: "mixpanel-session-456",
      };

      const result = transformGenerationForMixpanel(generation, projectId);

      expect(result.event).toBe("[Active Trace] Generation");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.session_id).toBe("mixpanel-session-456");
      expect(result.properties.activetrace_model).toBe("gpt-4-turbo");
    });
  });

  describe("transformScoreForMixpanel", () => {
    it("should transform a score with user_id", () => {
      const score: AnalyticsScoreEvent = {
        activetrace_id: "score-123",
        timestamp: new Date("2024-01-15T10:00:00Z"),
        activetrace_score_name: "quality",
        activetrace_score_value: 0.95,
        activetrace_score_comment: "Good response",
        activetrace_score_metadata: { source: "human" },
        activetrace_score_string_value: null,
        activetrace_score_data_type: "NUMERIC",
        activetrace_trace_name: "test-trace",
        activetrace_trace_id: "trace-456",
        activetrace_user_url: "https://langfuse.com/project/test/users/user-789",
        activetrace_session_id: "session-abc",
        activetrace_project_id: projectId,
        activetrace_project_name: "Test Project",
        activetrace_user_id: "user-789",
        activetrace_release: "v1.0.0",
        activetrace_tags: ["human-eval"],
        activetrace_environment: "production",
        activetrace_event_version: "1.0.0",
        activetrace_score_entity_type: "trace",
        activetrace_dataset_run_id: null,
        posthog_session_id: null,
        mixpanel_session_id: "mixpanel-session-789",
      };

      const result = transformScoreForMixpanel(score, projectId);

      expect(result.event).toBe("[Active Trace] Score");
      expect(result.properties.distinct_id).toBe("user-789");
      expect(result.properties.$user_id).toBe("user-789");
      expect(result.properties.session_id).toBe("mixpanel-session-789");
      expect(result.properties.activetrace_score_name).toBe("quality");
      expect(result.properties.activetrace_score_value).toBe(0.95);
    });
  });
});
