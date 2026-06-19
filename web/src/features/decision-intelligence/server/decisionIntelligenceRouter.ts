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
 * Decision Intelligence analytics.
 *
 * Reads directly from the ClickHouse `observations` table (project-scoped) to
 * surface cost / token / decision metrics on top of the standard trace data.
 *
 * Custom decision metadata is read from the observation `metadata` map using
 * the convention documented for the Active Trace SDK, e.g.
 *   metadata['capability']      -> logical step ("planning", "retrieval", ...)
 *   metadata['decision_label']  -> the branch chosen ("deep_research", ...)
 *   metadata['confidence']      -> numeric confidence 0..1 (stored as string)
 *   metadata['client_id']       -> end-customer the run belongs to
 *
 * Notes on the schema (verified against clickhouse migrations 0002_observations):
 *   - tokens live in usage_details Map(LowCardinality(String), UInt64)
 *   - cost lives in total_cost Nullable(Decimal64(12))
 *   - model name is provided_model_name (nullable)
 *   - there is no latency column; latency is end_time - start_time
 *   - observations is a ReplacingMergeTree -> use FINAL + is_deleted = 0
 */

const dateRangeInput = z.object({
  projectId: z.string(),
  fromTimestamp: z.date(),
  toTimestamp: z.date(),
});

// Shared WHERE clause + params for a project-scoped, time-bounded query.
const baseFilter = `
  project_id = {projectId: String}
  AND start_time >= {fromTimestamp: DateTime64(3)}
  AND start_time <= {toTimestamp: DateTime64(3)}
  AND is_deleted = 0
`;

const baseParams = (input: z.infer<typeof dateRangeInput>) => ({
  projectId: input.projectId,
  fromTimestamp: convertDateToClickhouseDateTime(input.fromTimestamp),
  toTimestamp: convertDateToClickhouseDateTime(input.toTimestamp),
});

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export const decisionIntelligenceRouter = createTRPCRouter({
  /**
   * Top-line KPIs across all observations in the window.
   */
  getSummary: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        observations: string;
        llm_calls: string;
        error_count: string;
        total_cost: string | null;
        total_tokens: string | null;
        avg_latency_ms: string | null;
      }>({
        query: `
          SELECT
            count() AS observations,
            countIf(type = 'GENERATION') AS llm_calls,
            countIf(level = 'ERROR') AS error_count,
            sum(total_cost) AS total_cost,
            sum(usage_details['input'] + usage_details['output']) AS total_tokens,
            avg(if(end_time IS NOT NULL, date_diff('millisecond', start_time, end_time), NULL)) AS avg_latency_ms
          FROM observations FINAL
          WHERE ${baseFilter}
        `,
        params: baseParams(input),
        tags: {
          feature: "decision-intelligence",
          type: "analytics",
          kind: "summary",
          projectId: input.projectId,
        },
      });

      const r = rows[0];
      return {
        observations: num(r?.observations),
        llmCalls: num(r?.llm_calls),
        errorCount: num(r?.error_count),
        totalCost: num(r?.total_cost),
        totalTokens: num(r?.total_tokens),
        avgLatencyMs: num(r?.avg_latency_ms),
      };
    }),

  /**
   * Cost / tokens / latency per model (LLM generations only).
   */
  getModelBreakdown: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        model: string;
        calls: string;
        cost: string | null;
        input_tokens: string | null;
        output_tokens: string | null;
        avg_latency_ms: string | null;
      }>({
        query: `
          SELECT
            coalesce(nullIf(provided_model_name, ''), 'unknown') AS model,
            count() AS calls,
            sum(total_cost) AS cost,
            sum(usage_details['input']) AS input_tokens,
            sum(usage_details['output']) AS output_tokens,
            avg(if(end_time IS NOT NULL, date_diff('millisecond', start_time, end_time), NULL)) AS avg_latency_ms
          FROM observations FINAL
          WHERE ${baseFilter}
            AND type = 'GENERATION'
          GROUP BY model
          ORDER BY cost DESC
          LIMIT 100
        `,
        params: baseParams(input),
        tags: {
          feature: "decision-intelligence",
          type: "analytics",
          kind: "model-breakdown",
          projectId: input.projectId,
        },
      });

      return rows.map((r) => ({
        model: r.model,
        calls: num(r.calls),
        cost: num(r.cost),
        inputTokens: num(r.input_tokens),
        outputTokens: num(r.output_tokens),
        avgLatencyMs: num(r.avg_latency_ms),
      }));
    }),

  /**
   * Spend grouped by the custom metadata['capability'] field.
   */
  getCapabilitySpend: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        capability: string;
        calls: string;
        cost: string | null;
        tokens: string | null;
      }>({
        query: `
          SELECT
            metadata['capability'] AS capability,
            count() AS calls,
            sum(total_cost) AS cost,
            sum(usage_details['input'] + usage_details['output']) AS tokens
          FROM observations FINAL
          WHERE ${baseFilter}
            AND metadata['capability'] != ''
          GROUP BY capability
          ORDER BY cost DESC
          LIMIT 100
        `,
        params: baseParams(input),
        tags: {
          feature: "decision-intelligence",
          type: "analytics",
          kind: "capability-spend",
          projectId: input.projectId,
        },
      });

      return rows.map((r) => ({
        capability: r.capability,
        calls: num(r.calls),
        cost: num(r.cost),
        tokens: num(r.tokens),
      }));
    }),

  /**
   * Decision map: cost & confidence grouped by metadata['decision_label'].
   */
  getDecisionMap: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        decision_label: string;
        count: string;
        avg_cost: string | null;
        avg_confidence: string | null;
        avg_latency_ms: string | null;
      }>({
        query: `
          SELECT
            metadata['decision_label'] AS decision_label,
            count() AS count,
            avg(total_cost) AS avg_cost,
            avg(toFloat64OrNull(metadata['confidence'])) AS avg_confidence,
            avg(if(end_time IS NOT NULL, date_diff('millisecond', start_time, end_time), NULL)) AS avg_latency_ms
          FROM observations FINAL
          WHERE ${baseFilter}
            AND metadata['decision_label'] != ''
          GROUP BY decision_label
          ORDER BY count DESC
          LIMIT 100
        `,
        params: baseParams(input),
        tags: {
          feature: "decision-intelligence",
          type: "analytics",
          kind: "decision-map",
          projectId: input.projectId,
        },
      });

      return rows.map((r) => ({
        decisionLabel: r.decision_label,
        count: num(r.count),
        avgCost: num(r.avg_cost),
        avgConfidence: r.avg_confidence === null ? null : num(r.avg_confidence),
        avgLatencyMs: num(r.avg_latency_ms),
      }));
    }),

  /**
   * Client profitability: infra cost vs. billable usage (cost x markup)
   * grouped by metadata['client_id'].
   */
  getClientProfitability: protectedProjectProcedure
    .input(dateRangeInput.extend({ markup: z.number().min(1).max(100).default(3.5) }))
    .query(async ({ input }) => {
      const rows = await queryClickhouse<{
        client_id: string;
        calls: string;
        cost: string | null;
      }>({
        query: `
          SELECT
            metadata['client_id'] AS client_id,
            count() AS calls,
            sum(total_cost) AS cost
          FROM observations FINAL
          WHERE ${baseFilter}
            AND metadata['client_id'] != ''
          GROUP BY client_id
          ORDER BY cost DESC
          LIMIT 100
        `,
        params: baseParams(input),
        tags: {
          feature: "decision-intelligence",
          type: "analytics",
          kind: "client-profitability",
          projectId: input.projectId,
        },
      });

      return rows.map((r) => {
        const cost = num(r.cost);
        const billable = cost * input.markup;
        return {
          clientId: r.client_id,
          calls: num(r.calls),
          infraCost: cost,
          billableUsage: billable,
          grossMargin: billable - cost,
        };
      });
    }),
});
