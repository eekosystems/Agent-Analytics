import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import { LibraryBig, LifeBuoy } from "lucide-react";
import { Separator } from "@/src/components/ui/separator";
import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";

type SupportType = "in-app-support" | "custom" | "community";

export function IntroSection({ onStartForm }: { onStartForm: () => void }) {
  const uiCustomization = useUiCustomization();
  const { isLangfuseCloud } = useLangfuseCloudRegion();

  // Note: We previously added an entitlement for in-app support, but removed it for now.
  //       The issue was that on global routes the entitlement hook would not have access
  //       to an org or project an therefore no plan, always returning false if asked.
  //       However on these pages, the in-app-chat should be available.
  //       Therefore we now check for whether wer are in a cloud deployment instead.
  // const hasInAppSupportEntitlement = useHasEntitlement("in-app-support");
  const hasInAppSupportEntitlement = !!isLangfuseCloud;

  const supportType: SupportType = useMemo(() => {
    if (uiCustomization?.supportHref) {
      return "custom";
    }
    if (hasInAppSupportEntitlement) {
      return "in-app-support";
    }
    return "community";
  }, [hasInAppSupportEntitlement, uiCustomization]);

  return (
    <div className="mt-1 flex flex-col gap-6">
      {uiCustomization?.documentationHref && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <LibraryBig className="h-4 w-4" /> Docs
            </div>
            <p className="text-muted-foreground text-sm">
              Dive into guides, concepts, and API reference — clear steps and
              examples to move quickly.
            </p>

            <Button asChild variant="outline">
              <a
                href={uiCustomization.documentationHref}
                target="_blank"
                rel="noopener"
              >
                View documentation
              </a>
            </Button>
          </div>

          <Separator />
        </>
      )}

      {supportType === "custom" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <LifeBuoy className="h-4 w-4" /> Support
          </div>
          <p className="text-muted-foreground text-sm">
            Need help? Get in touch with the support team.
          </p>
          <Button variant="outline" asChild>
            <a
              href={uiCustomization?.supportHref}
              target="_blank"
              rel="noopener"
            >
              Open Support
            </a>
          </Button>
          {uiCustomization?.feedbackHref && (
            <Button variant="outline" asChild>
              <a
                href={uiCustomization?.feedbackHref}
                target="_blank"
                rel="noopener"
              >
                Submit Feedback
              </a>
            </Button>
          )}
        </div>
      )}

      {supportType === "in-app-support" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <LifeBuoy className="h-4 w-4" /> Email a Support Engineer
          </div>
          <p className="text-muted-foreground text-sm">
            One of our support engineers will help you get unblocked.
          </p>
          <Button variant="outline" onClick={onStartForm}>
            Email a Support Engineer
          </Button>
        </div>
      )}

      {supportType === "community" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-base font-semibold">
            <LifeBuoy className="h-4 w-4" /> Support
          </div>
          <p className="text-muted-foreground text-sm">
            Contact your administrator for support.
          </p>
        </div>
      )}
    </div>
  );
}
