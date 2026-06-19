import {
  clickhouseClient,
  convertDateToClickhouseDateTime,
  logger,
} from "@langfuse/shared/src/server";

export type BusinessEventClickhouseRow = {
  id: string;
  projectId: string;
  configId: string;
  name: string;
  traceId: string | null;
  observationId: string | null;
  clientId: string | null;
  value: number | null;
  timestamp: Date;
  metadata?: Record<string, unknown> | null;
};

/**
 * Mirror a business event into the ClickHouse `business_events` table so it
 * becomes a native widget / dashboard data source (the `business-events` query
 * view).
 *
 * Postgres remains the source of truth (config + the Business Outcomes page);
 * this is a best-effort analytics write. Callers should not fail ingestion if
 * ClickHouse is unavailable — the event is already safely in Postgres.
 */
export async function insertBusinessEventToClickhouse(
  row: BusinessEventClickhouseRow,
): Promise<void> {
  const nowCh = convertDateToClickhouseDateTime(new Date());
  // ClickHouse Map(String, String) requires string values.
  const metadata: Record<string, string> = {};
  if (row.metadata) {
    for (const [k, v] of Object.entries(row.metadata)) {
      if (v !== null && v !== undefined) {
        metadata[k] = typeof v === "string" ? v : JSON.stringify(v);
      }
    }
  }

  await clickhouseClient().insert({
    table: "business_events",
    values: [
      {
        id: row.id,
        project_id: row.projectId,
        config_id: row.configId,
        name: row.name,
        trace_id: row.traceId,
        observation_id: row.observationId,
        client_id: row.clientId,
        value: row.value,
        metadata,
        timestamp: convertDateToClickhouseDateTime(row.timestamp),
        created_at: nowCh,
        updated_at: nowCh,
        event_ts: nowCh,
        is_deleted: 0,
      },
    ],
    format: "JSONEachRow",
  });
}

/**
 * Best-effort wrapper: mirror to ClickHouse, logging (not throwing) on failure
 * so the primary Postgres write/ingestion path is never blocked.
 */
export async function mirrorBusinessEventToClickhouse(
  row: BusinessEventClickhouseRow,
): Promise<void> {
  try {
    await insertBusinessEventToClickhouse(row);
  } catch (e) {
    logger.error("Failed to mirror business event to ClickHouse", e);
  }
}
