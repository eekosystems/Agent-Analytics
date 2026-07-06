// Standard analytics event types for analytics integrations (PostHog, Mixpanel, etc.)
// These represent the raw data structure from ClickHouse queries

export type AnalyticsTraceEvent = {
  activetrace_id: unknown;
  timestamp: unknown;
  activetrace_trace_name?: unknown;
  activetrace_url?: unknown;
  activetrace_user_url?: unknown;
  activetrace_cost_usd?: unknown;
  activetrace_count_observations?: unknown;
  activetrace_session_id?: unknown;
  activetrace_project_id?: unknown;
  activetrace_project_name?: unknown;
  activetrace_user_id?: unknown;
  activetrace_latency?: unknown;
  activetrace_release?: unknown;
  activetrace_version?: unknown;
  activetrace_tags?: unknown;
  activetrace_environment?: unknown;
  activetrace_event_version?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};

export type AnalyticsGenerationEvent = {
  activetrace_id: unknown;
  timestamp: unknown;
  activetrace_generation_name?: unknown;
  activetrace_trace_name?: unknown;
  activetrace_trace_id?: unknown;
  activetrace_url?: unknown;
  activetrace_user_url?: unknown;
  activetrace_cost_usd?: unknown;
  activetrace_input_units?: unknown;
  activetrace_output_units?: unknown;
  activetrace_total_units?: unknown;
  activetrace_session_id?: unknown;
  activetrace_project_id?: unknown;
  activetrace_project_name?: unknown;
  activetrace_user_id?: unknown;
  activetrace_latency?: unknown;
  activetrace_time_to_first_token?: unknown;
  activetrace_release?: unknown;
  activetrace_version?: unknown;
  activetrace_model?: unknown;
  activetrace_level?: unknown;
  activetrace_tags?: unknown;
  activetrace_environment?: unknown;
  activetrace_event_version?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};

export type AnalyticsScoreEvent = {
  activetrace_id: unknown;
  timestamp: unknown;
  activetrace_score_name?: unknown;
  activetrace_score_value?: unknown;
  activetrace_score_comment?: unknown;
  activetrace_score_metadata?: unknown;
  activetrace_score_string_value?: unknown;
  activetrace_score_data_type?: unknown;
  activetrace_trace_name?: unknown;
  activetrace_trace_id?: unknown;
  activetrace_user_url?: unknown;
  activetrace_session_id?: unknown;
  activetrace_project_id?: unknown;
  activetrace_project_name?: unknown;
  activetrace_user_id?: unknown;
  activetrace_release?: unknown;
  activetrace_tags?: unknown;
  activetrace_environment?: unknown;
  activetrace_event_version?: unknown;
  activetrace_score_entity_type?: unknown;
  activetrace_dataset_run_id?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};

export type AnalyticsObservationEvent = {
  activetrace_id: unknown;
  timestamp: unknown;
  activetrace_observation_name?: unknown;
  activetrace_trace_name?: unknown;
  activetrace_trace_id?: unknown;
  activetrace_url?: unknown;
  activetrace_user_url?: unknown;
  activetrace_cost_usd?: unknown;
  activetrace_input_units?: unknown;
  activetrace_output_units?: unknown;
  activetrace_total_units?: unknown;
  activetrace_session_id?: unknown;
  activetrace_project_id?: unknown;
  activetrace_project_name?: unknown;
  activetrace_user_id?: unknown;
  activetrace_latency?: unknown;
  activetrace_time_to_first_token?: unknown;
  activetrace_release?: unknown;
  activetrace_version?: unknown;
  activetrace_model?: unknown;
  activetrace_level?: unknown;
  activetrace_type?: unknown;
  activetrace_tags?: unknown;
  activetrace_environment?: unknown;
  activetrace_event_version?: unknown;
  posthog_session_id?: unknown;
  mixpanel_session_id?: unknown;
};
