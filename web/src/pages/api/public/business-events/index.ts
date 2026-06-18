import { createAuthedProjectAPIRoute } from "@/src/features/public-api/server/createAuthedProjectAPIRoute";
import { withMiddlewares } from "@/src/features/public-api/server/withMiddlewares";
import { ForbiddenError } from "@langfuse/shared";
import { prisma } from "@langfuse/shared/src/db";
import { z } from "zod";
import { randomUUID } from "crypto";

/**
 * Public API for business event attribution.
 *
 * POST records an outcome occurrence. The custom event type is referenced by
 * `name`; if no matching type exists yet for the project it is created on the
 * fly, so callers can introduce new outcome names without a separate setup
 * call.
 *
 * GET lists recorded outcomes for the project.
 */

const eventNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_\- ]+$/);

const PostBusinessEventBody = z.object({
  name: eventNameSchema,
  value: z.number().nullish(),
  traceId: z.string().trim().min(1).nullish(),
  observationId: z.string().trim().min(1).nullish(),
  clientId: z.string().trim().min(1).nullish(),
  timestamp: z.coerce.date().optional(),
  metadata: z.record(z.string(), z.any()).nullish(),
});

const PostBusinessEventResponse = z.object({ id: z.string() });

const GetBusinessEventsQuery = z.object({
  name: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().lte(100).default(50),
  fromTimestamp: z.coerce.date().optional(),
  toTimestamp: z.coerce.date().optional(),
});

const GetBusinessEventsResponse = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      value: z.number().nullable(),
      traceId: z.string().nullable(),
      observationId: z.string().nullable(),
      clientId: z.string().nullable(),
      timestamp: z.string(),
    }),
  ),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});

export default withMiddlewares({
  POST: createAuthedProjectAPIRoute({
    name: "Create Business Event",
    bodySchema: PostBusinessEventBody,
    responseSchema: PostBusinessEventResponse,
    fn: async ({ body, auth }) => {
      if (auth.scope.isIngestionSuspended) {
        throw new ForbiddenError(
          "Ingestion suspended: Usage threshold exceeded. Please upgrade your plan.",
        );
      }
      const projectId = auth.scope.projectId;

      // Resolve the custom event type by name, creating it if absent.
      const config = await prisma.businessEventConfig.upsert({
        where: { projectId_name: { projectId, name: body.name } },
        update: {},
        create: { projectId, name: body.name },
      });

      const event = await prisma.businessEvent.create({
        data: {
          id: randomUUID(),
          projectId,
          configId: config.id,
          name: config.name,
          value: body.value ?? null,
          traceId: body.traceId ?? null,
          observationId: body.observationId ?? null,
          clientId: body.clientId ?? null,
          timestamp: body.timestamp ?? undefined,
          metadata: body.metadata ?? undefined,
        },
      });

      return { id: event.id };
    },
  }),
  GET: createAuthedProjectAPIRoute({
    name: "Get Business Events",
    querySchema: GetBusinessEventsQuery,
    responseSchema: GetBusinessEventsResponse,
    fn: async ({ query, auth }) => {
      const projectId = auth.scope.projectId;
      const where = {
        projectId,
        ...(query.name ? { name: query.name } : {}),
        ...(query.fromTimestamp || query.toTimestamp
          ? {
              timestamp: {
                ...(query.fromTimestamp ? { gte: query.fromTimestamp } : {}),
                ...(query.toTimestamp ? { lte: query.toTimestamp } : {}),
              },
            }
          : {}),
      };

      const [items, totalItems] = await Promise.all([
        prisma.businessEvent.findMany({
          where,
          orderBy: { timestamp: "desc" },
          take: query.limit,
          skip: (query.page - 1) * query.limit,
        }),
        prisma.businessEvent.count({ where }),
      ]);

      return {
        data: items.map((e) => ({
          id: e.id,
          name: e.name,
          value: e.value,
          traceId: e.traceId,
          observationId: e.observationId,
          clientId: e.clientId,
          timestamp: e.timestamp.toISOString(),
        })),
        meta: {
          page: query.page,
          limit: query.limit,
          totalItems,
          totalPages: Math.ceil(totalItems / query.limit),
        },
      };
    },
  }),
});
