import { env } from "@/src/env.mjs";
import {
  createTRPCRouter,
  protectedProjectProcedure,
  publicProcedure,
} from "@/src/server/api/trpc";
import { z } from "zod";

export const publicRouter = createTRPCRouter({
  tracingSearchConfig: protectedProjectProcedure
    .input(z.object({ projectId: z.string() }))
    .query(() => ({
      legacyTracingIoSearchEnabled:
        env.LANGFUSE_DISABLE_LEGACY_TRACING_IO_SEARCH !== "true",
    })),
  // Update check is disabled in this white-label deployment.
  checkUpdate: publicProcedure.query(async () => null),
});
