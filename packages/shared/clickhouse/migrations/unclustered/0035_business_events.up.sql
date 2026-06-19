CREATE TABLE business_events (
    `id` String,
    `timestamp` DateTime64(3),
    `project_id` String,
    `config_id` String,
    `name` String,
    `trace_id` Nullable(String),
    `observation_id` Nullable(String),
    `client_id` Nullable(String),
    `value` Nullable(Float64),
    `metadata` Map(LowCardinality(String), String),
    `created_at` DateTime64(3) DEFAULT now(),
    `updated_at` DateTime64(3) DEFAULT now(),
    event_ts DateTime64(3),
    `is_deleted` UInt8,
    INDEX idx_id id TYPE bloom_filter(0.001) GRANULARITY 1,
    INDEX idx_project_trace (project_id, trace_id) TYPE bloom_filter(0.001) GRANULARITY 1
) ENGINE = ReplacingMergeTree(event_ts, is_deleted) Partition by toYYYYMM(timestamp)
PRIMARY KEY (
    project_id,
    toDate(timestamp),
    name
)
ORDER BY (
    project_id,
    toDate(timestamp),
    name,
    id
)
