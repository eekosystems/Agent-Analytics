import { z } from "zod";

import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import {
  queryClickhouse,
  convertDateToClickhouseDateTime,
} from "@langfuse/shared/src/server";

/**
 * Granular error reporting over the ClickHouse `observations` table.
 *
 * An observation is an "error" when level = 'ERROR'. We surface error rate,
 * the most common error messages, which operations/tools/models fail, error
 * volume over time, and a recent-errors feed that links back to the trace.
 *
 * Schema notes (verified against clickhouse migration 0002_observations):
 *   - level: LowCardinality(String) — 'DEBUG' | 'DEFAULT' | 'WARNING' | 'ERROR'
 *   - status_message: Nullable(String) — the error text
 *   - name: the operation/tool/step name
 *   - provided_model_name: Nullable(String)
 *   - total_cost: Nullable(Decimal64(12))
 *   - observations is a ReplacingMergeTree -> FINAL + is_deleted = 0
 */

const dateRangeInput = z.object({
  projectId: z.string(),
  fromTimestamp: z.date(),
  toTimestamp: z.date(),
});

const errorFilter = `
  project_id = {projectId: String}
  AND start_time >= {fromTimestamp: DateTime64(3)}
  AND start_time <= {toTimestamp: DateTime64(3)}
  AND is_deleted = 0
  AND level = 'ERROR'
`;

const baseParams = (input: z.infer<typeof dateRangeInput>) => ({
  projectId: input.projectId,
  fromTimestamp: convertDateToClickhouseDateTime(input.fromTimestamp),
  toTimestamp: convertDateToClickhouseDateTime(input.toTimestamp),
});

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export const errorReportingRouter = createTRPCRouter({
  /**
   * Headline KPIs: error count, error rate, affected traces, distinct
   * messages, and the cost burned on failed steps.
   */
  getSummary: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        error_count: string;
        total_count: string;
        affected_traces: string;
        distinct_messages: string;
        error_cost: string | null;
      }>({
        query: `
          SELECT
            countIf(level = 'ERROR') AS error_count,
            count() AS total_count,
            uniqExactIf(trace_id, level = 'ERROR') AS affected_traces,
            uniqExactIf(status_message, level = 'ERROR') AS distinct_messages,
            sumIf(total_cost, level = 'ERROR') AS error_cost
          FROM observations FINAL
          WHERE project_id = {projectId: String}
            AND start_time >= {fromTimestamp: DateTime64(3)}
            AND start_time <= {toTimestamp: DateTime64(3)}
            AND is_deleted = 0
        `,
        params: baseParams(input),
        tags: {
          feature: "error-reporting",
          type: "analytics",
          kind: "summary",
          projectId: input.projectId,
        },
      });

      const r = rows[0];
      const errors = num(r?.error_count);
      const total = num(r?.total_count);
      return {
        errorCount: errors,
        totalCount: total,
        errorRate: total > 0 ? errors / total : 0,
        affectedTraces: num(r?.affected_traces),
        distinctMessages: num(r?.distinct_messages),
        errorCost: num(r?.error_cost),
      };
    }),

  /** Error volume per day for the trend chart. */
  getErrorsOverTime: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{ day: string; count: string }>({
        query: `
          SELECT toDate(start_time) AS day, count() AS count
          FROM observations FINAL
          WHERE ${errorFilter}
          GROUP BY day
          ORDER BY day
        `,
        params: baseParams(input),
        tags: {
          feature: "error-reporting",
          type: "analytics",
          kind: "over-time",
          projectId: input.projectId,
        },
      });
      return rows.map((r) => ({ day: r.day, count: num(r.count) }));
    }),

  /** Most common error messages, with a sample trace to drill into. */
  getTopMessages: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        message: string;
        count: string;
        last_seen: string;
        sample_trace_id: string | null;
      }>({
        query: `
          SELECT
            coalesce(nullIf(status_message, ''), '(no message)') AS message,
            count() AS count,
            max(start_time) AS last_seen,
            any(trace_id) AS sample_trace_id
          FROM observations FINAL
          WHERE ${errorFilter}
          GROUP BY message
          ORDER BY count DESC
          LIMIT 50
        `,
        params: baseParams(input),
        tags: {
          feature: "error-reporting",
          type: "analytics",
          kind: "top-messages",
          projectId: input.projectId,
        },
      });
      return rows.map((r) => ({
        message: r.message,
        count: num(r.count),
        lastSeen: r.last_seen,
        sampleTraceId: r.sample_trace_id ?? null,
      }));
    }),

  /** Which operations / tools fail most. */
  getByOperation: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        operation: string;
        type: string;
        count: string;
      }>({
        query: `
          SELECT
            coalesce(nullIf(name, ''), '(unnamed)') AS operation,
            type,
            count() AS count
          FROM observations FINAL
          WHERE ${errorFilter}
          GROUP BY operation, type
          ORDER BY count DESC
          LIMIT 50
        `,
        params: baseParams(input),
        tags: {
          feature: "error-reporting",
          type: "analytics",
          kind: "by-operation",
          projectId: input.projectId,
        },
      });
      return rows.map((r) => ({
        operation: r.operation,
        type: r.type,
        count: num(r.count),
      }));
    }),

  /** Which models produce the most errors. */
  getByModel: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{ model: string; count: string }>({
        query: `
          SELECT
            coalesce(nullIf(provided_model_name, ''), '(none)') AS model,
            count() AS count
          FROM observations FINAL
          WHERE ${errorFilter}
          GROUP BY model
          ORDER BY count DESC
          LIMIT 50
        `,
        params: baseParams(input),
        tags: {
          feature: "error-reporting",
          type: "analytics",
          kind: "by-model",
          projectId: input.projectId,
        },
      });
      return rows.map((r) => ({ model: r.model, count: num(r.count) }));
    }),

  /** Recent individual errors, newest first, linking back to the trace. */
  getRecentErrors: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        id: string;
        trace_id: string | null;
        name: string;
        message: string;
        model: string;
        start_time: string;
      }>({
        query: `
          SELECT
            id,
            trace_id,
            coalesce(nullIf(name, ''), '(unnamed)') AS name,
            coalesce(nullIf(status_message, ''), '') AS message,
            coalesce(nullIf(provided_model_name, ''), '') AS model,
            start_time
          FROM observations FINAL
          WHERE ${errorFilter}
          ORDER BY start_time DESC
          LIMIT 100
        `,
        params: baseParams(input),
        tags: {
          feature: "error-reporting",
          type: "analytics",
          kind: "recent",
          projectId: input.projectId,
        },
      });
      return rows.map((r) => ({
        id: r.id,
        traceId: r.trace_id ?? null,
        name: r.name,
        message: r.message,
        model: r.model,
        startTime: r.start_time,
      }));
    }),
});
