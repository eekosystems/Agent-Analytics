import { ArrowUp10, BadgeCheck } from "lucide-react";
import { VERSION } from "@/src/constants";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/src/components/ui/dropdown-menu";
import { api } from "@/src/utils/api";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/utils/tailwind";
import { usePlan } from "@/src/features/entitlements/hooks";
import { isSelfHostedPlan, planLabels } from "@langfuse/shared";
import { StatusBadge } from "@/src/components/layouts/status-badge";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";

export const VersionLabel = ({ className }: { className?: string }) => {
  const { isLangfuseCloud } = useLangfuseCloudRegion();

  const backgroundMigrationStatus = api.backgroundMigrations.status.useQuery(
    undefined,
    {
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !isLangfuseCloud, // do not check on Langfuse Cloud
      throwOnError: false, // do not render default error message
    },
  );

  const plan = usePlan();

  const selfHostedPlanLabel = !isLangfuseCloud
    ? plan && isSelfHostedPlan(plan)
      ? // self-host plan
        // TODO: clean up to use planLabels in packages/shared/src/features/entitlements/plans.ts
        {
          short: plan === "self-hosted:pro" ? "Pro" : "EE",
          long: planLabels[plan],
        }
      : // no plan, oss
        {
          short: "OSS",
          long: "Open Source",
        }
    : // null on cloud
      null;

  const showBackgroundMigrationStatus =
    !isLangfuseCloud &&
    backgroundMigrationStatus.data &&
    backgroundMigrationStatus.data.status !== "FINISHED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className={cn("mt-[0.2px] text-[0.625rem]", className)}
        >
          {VERSION}
          {selfHostedPlanLabel ? <> {selfHostedPlanLabel.short}</> : null}
          {showBackgroundMigrationStatus && (
            <StatusBadge
              type={backgroundMigrationStatus.data?.status.toLowerCase()}
              showText={false}
              className="bg-transparent"
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {selfHostedPlanLabel && (
          <>
            <DropdownMenuLabel className="flex items-center font-normal">
              <BadgeCheck size={16} className="mr-2" />
              {selfHostedPlanLabel.long}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        {!isLangfuseCloud && (
          <DropdownMenuItem asChild>
            <Link href="/background-migrations">
              <ArrowUp10 size={16} className="mr-2" />
              Background Migrations
              {showBackgroundMigrationStatus && (
                <StatusBadge
                  type={backgroundMigrationStatus.data?.status.toLowerCase()}
                  showText={false}
                  className="bg-transparent"
                />
              )}
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
