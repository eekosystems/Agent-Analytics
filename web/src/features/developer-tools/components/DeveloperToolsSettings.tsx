import Header from "@/src/components/layouts/header";
import { Card } from "@/src/components/ui/card";
import { CodeBlock } from "@/src/components/ui/Codeblock";
import { Bot } from "lucide-react";
import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { env } from "@/src/env.mjs";

export function DeveloperToolsSettings() {
  const uiCustomization = useUiCustomization();
  const origin =
    uiCustomization?.hostname ??
    (typeof window !== "undefined" ? window.origin : "");
  const baseUrl = `${origin}${env.NEXT_PUBLIC_BASE_PATH ?? ""}`;

  return (
    <div>
      <Header title="MCP" />
      <p className="text-muted-foreground mb-6 text-sm">
        Bring Active Trace into your terminal and AI coding agents. These tools let
        you and your agents read and write Active Trace data—traces, prompts,
        datasets, scores, and more—without leaving your development environment.
      </p>
      <div className="space-y-6">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="text-foreground h-5 w-5" />
            <span className="font-semibold">MCP Server</span>
          </div>
          <p className="text-primary mb-4 text-sm">
            The Active Trace MCP server lets AI assistants and agents interact with
            your Active Trace data programmatically via the Model Context Protocol.
            It supports both read and write operations, and you can restrict it
            to read-only access with an allowlist. Authenticate with a
            project-scoped API key pair.
          </p>
          <CodeBlock
            language="shell"
            value={`claude mcp add --transport http active-trace \\
  ${baseUrl}/api/public/mcp \\
  --header "Authorization: Basic {your-base64-token}"`}
          />
        </Card>
      </div>
    </div>
  );
}
