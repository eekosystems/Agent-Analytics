import { createTRPCRouter, publicProcedure } from "@/src/server/api/trpc";
import { CloudStatus } from "@/src/features/cloud-status-notification/types";
import { z } from "zod";

export const cloudStatusRouter = createTRPCRouter({
  getStatus: publicProcedure
    .output(
      z.object({
        status: CloudStatus,
      }),
    )
    .query(async () => {
      // Status page integration is disabled in this deployment.
      return { status: null };
    }),
});
