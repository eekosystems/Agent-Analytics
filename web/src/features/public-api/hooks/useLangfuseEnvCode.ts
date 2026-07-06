import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { env } from "@/src/env.mjs";

export function useLangfuseEnvCode(keys?: {
  secretKey: string;
  publicKey: string;
}): string {
  const uiCustomization = useUiCustomization();
  const baseUrl = `${uiCustomization?.hostname ?? window.origin}${env.NEXT_PUBLIC_BASE_PATH ?? ""}`;

  if (keys) {
    return `ACTIVETRACE_SECRET_KEY="${keys.secretKey}"
ACTIVETRACE_PUBLIC_KEY="${keys.publicKey}"
ACTIVETRACE_BASE_URL="${baseUrl}"`;
  }

  return `ACTIVETRACE_SECRET_KEY="sk-at-..."
ACTIVETRACE_PUBLIC_KEY="pk-at-..."
ACTIVETRACE_BASE_URL="${baseUrl}"`;
}
