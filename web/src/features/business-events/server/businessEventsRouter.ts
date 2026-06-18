import { z } from "zod";

import {
  createTRPCRouter,
  protectedProjectProcedure,
} from "@/src/server/api/trpc";
import {
  queryClickhouse,
  convertDateToClickhouseDateTime,
} from "@langfuse/shared/src/server";
import { auditLog } from "@/src/features/audit-logs/auditLog";
import { LangfuseNotFoundError } from "@langfuse/shared";

/**
 * Business event attribution.
 *
 * Users define custom outcome types ("qualified_lead", "booked_call",
 * "signed_contract") as BusinessEventConfig rows. Occurrences are recorded as
 * BusinessEvent rows (via the public API or manually) and optionally attributed
 * to a trace and/or carry a monetary value.
 *
 * Cost-per-outcome joins these Postgres events to the existing ClickHouse trace
 * costs: for every event that references a traceId we look up the summed
 * total_cost of that trace's observations, then aggregate per outcome type.
 */

// Event names are machine-friendly identifiers used by the SDK.
const eventNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(64, "Name must be 64 characters or fewer")
  .regex(
    /^[a-zA-Z0-9_\- ]+$/,
    "Use letters, numbers, spaces, hyphens or underscores",
  );

const dateRangeInput = z.object({
  projectId: z.string(),
  fromTimestamp: z.date(),
  toTimestamp: z.date(),
});

const num = (v: string | number | null | undefined) => Number(v ?? 0);

export const businessEventsRouter = createTRPCRouter({
  /**
   * List the custom event types defined for this project.
   */
  getConfigs: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        includeArchived: z.boolean().default(false),
      }),
    )
    .query(async ({ input, ctx }) => {
      return ctx.prisma.businessEventConfig.findMany({
        where: {
          projectId: input.projectId,
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      });
    }),

  /**
   * Create a custom event type ("custom event name").
   */
  createConfig: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: eventNameSchema,
        description: z.string().trim().max(500).nullish(),
        unit: z.string().trim().max(16).nullish(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.businessEventConfig.findFirst({
        where: { projectId: input.projectId, name: input.name },
      });
      if (existing) {
        throw new LangfuseNotFoundError(
          `An event type named "${input.name}" already exists in this project.`,
        );
      }

      const config = await ctx.prisma.businessEventConfig.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          description: input.description ?? null,
          unit: input.unit ?? null,
        },
      });

      await auditLog({
        session: ctx.session,
        resourceType: "businessEventConfig",
        resourceId: config.id,
        action: "create",
        after: config,
      });

      return config;
    }),

  /**
   * Update or archive a custom event type.
   */
  updateConfig: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string(),
        description: z.string().trim().max(500).nullish(),
        unit: z.string().trim().max(16).nullish(),
        isArchived: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.businessEventConfig.findFirst({
        where: { id: input.id, projectId: input.projectId },
      });
      if (!existing) {
        throw new LangfuseNotFoundError(
          "No event type with this id in this project.",
        );
      }

      const config = await ctx.prisma.businessEventConfig.update({
        where: { id_projectId: { id: input.id, projectId: input.projectId } },
        data: {
          description:
            input.description === undefined
              ? undefined
              : (input.description ?? null),
          unit: input.unit === undefined ? undefined : (input.unit ?? null),
          isArchived: input.isArchived,
        },
      });

      await auditLog({
        session: ctx.session,
        resourceType: "businessEventConfig",
        resourceId: config.id,
        action: "update",
        before: existing,
        after: config,
      });

      return config;
    }),

  /**
   * Manually record an occurrence of an outcome (e.g. for testing or backfill).
   * The primary ingestion path is the public API.
   */
  recordEvent: protectedProjectProcedure
    .input(
      z.object({
        projectId: z.string(),
        configId: z.string(),
        traceId: z.string().trim().min(1).nullish(),
        clientId: z.string().trim().min(1).nullish(),
        value: z.number().nullish(),
        timestamp: z.date().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const config = await ctx.prisma.businessEventConfig.findFirst({
        where: { id: input.configId, projectId: input.projectId },
      });
      if (!config) {
        throw new LangfuseNotFoundError(
          "No event type with this id in this project.",
        );
      }

      return ctx.prisma.businessEvent.create({
        data: {
          projectId: input.projectId,
          configId: config.id,
          name: config.name,
          traceId: input.traceId ?? null,
          clientId: input.clientId ?? null,
          value: input.value ?? null,
          timestamp: input.timestamp ?? undefined,
        },
      });
    }),

  /**
   * Cost-per-outcome analytics. For each outcome type in the window: count,
   * revenue (sum of value), the LLM cost attributed via linked traces,
   * cost-per-outcome, profit and ROI.
   */
  getOutcomeAnalytics: protectedProjectProcedure
    .input(dateRangeInput)
    .query(async ({ input, ctx }) => {
      const [configs, events] = await Promise.all([
        ctx.prisma.businessEventConfig.findMany({
          where: { projectId: input.projectId, isArchived: false },
          orderBy: [{ createdAt: "desc" }],
        }),
        ctx.prisma.businessEvent.findMany({
          where: {
            projectId: input.projectId,
            timestamp: { gte: input.fromTimestamp, lte: input.toTimestamp },
          },
          select: {
            configId: true,
            traceId: true,
            value: true,
          },
        }),
      ]);

      // Look up the summed cost of every trace referenced by an event.
      const traceIds = Array.from(
        new Set(
          events
            .map((e) => e.traceId)
            .filter((t): t is string => !!t && t.length > 0),
        ),
      );

      const costByTrace = new Map<string, number>();
      if (traceIds.length > 0) {
        const rows = await queryClickhouse<{
          trace_id: string;
          cost: string | null;
        }>({
          query: `
            SELECT trace_id, sum(total_cost) AS cost
            FROM observations FINAL
            WHERE project_id = {projectId: String}
              AND is_deleted = 0
              AND trace_id IN {traceIds: Array(String)}
            GROUP BY trace_id
          `,
          params: { projectId: input.projectId, traceIds },
          tags: {
            feature: "business-events",
            type: "analytics",
            kind: "trace-cost",
            projectId: input.projectId,
          },
        });
        for (const r of rows) costByTrace.set(r.trace_id, num(r.cost));
      }

      type Agg = {
        count: number;
        revenue: number;
        attributedCost: number;
        attributedCount: number;
      };
      const byConfig = new Map<string, Agg>();
      for (const e of events) {
        const agg = byConfig.get(e.configId) ?? {
          count: 0,
          revenue: 0,
          attributedCost: 0,
          attributedCount: 0,
        };
        agg.count += 1;
        if (e.value != null) agg.revenue += e.value;
        if (e.traceId && costByTrace.has(e.traceId)) {
          agg.attributedCost += costByTrace.get(e.traceId) ?? 0;
          agg.attributedCount += 1;
        }
        byConfig.set(e.configId, agg);
      }

      const outcomes = configs.map((c) => {
        const a = byConfig.get(c.id) ?? {
          count: 0,
          revenue: 0,
          attributedCost: 0,
          attributedCount: 0,
        };
        return {
          configId: c.id,
          name: c.name,
          unit: c.unit,
          count: a.count,
          revenue: a.revenue,
          attributedCost: a.attributedCost,
          // events that carry a trace we could price; used to flag coverage
          attributedCount: a.attributedCount,
          costPerOutcome: a.count > 0 ? a.attributedCost / a.count : 0,
          profit: a.revenue - a.attributedCost,
          roi:
            a.attributedCost > 0 ? a.revenue / a.attributedCost : null,
        };
      });

      outcomes.sort((x, y) => y.count - x.count);

      const totals = outcomes.reduce(
        (acc, o) => {
          acc.count += o.count;
          acc.revenue += o.revenue;
          acc.attributedCost += o.attributedCost;
          return acc;
        },
        { count: 0, revenue: 0, attributedCost: 0 },
      );

      return {
        outcomes,
        totals: {
          ...totals,
          profit: totals.revenue - totals.attributedCost,
          costPerOutcome:
            totals.count > 0 ? totals.attributedCost / totals.count : 0,
        },
      };
    }),
});
