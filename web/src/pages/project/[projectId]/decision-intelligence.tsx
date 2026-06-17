import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import Page from "@/src/components/layouts/page";
import { api } from "@/src/utils/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

const usd = (n: number) =>
  `$${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const int = (n: number) => (n ?? 0).toLocaleString();
const ms = (n: number) => `${Math.round(n ?? 0).toLocaleString()} ms`;
const pct = (n: number | null) =>
  n === null || n === undefined ? "—" : `${Math.round(n * 100)}%`;

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-muted-foreground border-b px-3 py-2 text-left text-xs font-medium">
      {children}
    </th>
  );
}
function Td({
  children,
  num = false,
}: {
  children: React.ReactNode;
  num?: boolean;
}) {
  return (
    <td className={`border-b px-3 py-2 text-sm ${num ? "tabular-nums" : ""}`}>
      {children}
    </td>
  );
}

function SectionCard({
  title,
  description,
  isLoading,
  isEmpty,
  emptyHint,
  children,
}: {
  title: string;
  description?: string;
  isLoading: boolean;
  isEmpty: boolean;
  emptyHint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground py-6 text-sm">Loading…</p>
        ) : isEmpty ? (
          <p className="text-muted-foreground py-6 text-sm">
            {emptyHint ?? "No data in this time range."}
          </p>
        ) : (
          <div className="overflow-x-auto">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DecisionIntelligencePage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [days, setDays] = useState<number>(30);

  const { fromTimestamp, toTimestamp } = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { fromTimestamp: from, toTimestamp: to };
  }, [days]);

  const enabled = !!projectId;
  const queryInput = { projectId, fromTimestamp, toTimestamp };

  const summary = api.decisionIntelligence.getSummary.useQuery(queryInput, {
    enabled,
  });
  const models = api.decisionIntelligence.getModelBreakdown.useQuery(
    queryInput,
    { enabled },
  );
  const capabilities = api.decisionIntelligence.getCapabilitySpend.useQuery(
    queryInput,
    { enabled },
  );
  const decisions = api.decisionIntelligence.getDecisionMap.useQuery(
    queryInput,
    { enabled },
  );
  const clients = api.decisionIntelligence.getClientProfitability.useQuery(
    queryInput,
    { enabled },
  );

  const s = summary.data;

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: "Decision Intelligence",
        help: {
          description:
            "Cost, token and decision analytics across your agent traces. " +
            "Capability, decision and client breakdowns read the observation " +
            "metadata keys 'capability', 'decision_label', 'confidence' and 'client_id'.",
        },
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Time range selector */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Time range:</span>
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setDays(r.days)}
              className={`rounded-md border px-3 py-1 text-sm ${
                days === r.days
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi label="Total cost" value={usd(s?.totalCost ?? 0)} />
          <Kpi label="Total tokens" value={int(s?.totalTokens ?? 0)} />
          <Kpi label="Observations" value={int(s?.observations ?? 0)} />
          <Kpi label="LLM calls" value={int(s?.llmCalls ?? 0)} />
          <Kpi label="Errors" value={int(s?.errorCount ?? 0)} />
          <Kpi label="Avg latency" value={ms(s?.avgLatencyMs ?? 0)} />
        </div>

        {/* Model breakdown */}
        <SectionCard
          title="Model breakdown"
          description="Cost, tokens and latency per model (LLM generations)."
          isLoading={models.isLoading}
          isEmpty={(models.data?.length ?? 0) === 0}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Model</Th>
                <Th>Calls</Th>
                <Th>Cost</Th>
                <Th>Input tokens</Th>
                <Th>Output tokens</Th>
                <Th>Avg latency</Th>
              </tr>
            </thead>
            <tbody>
              {models.data?.map((m) => (
                <tr key={m.model}>
                  <Td>{m.model}</Td>
                  <Td num>{int(m.calls)}</Td>
                  <Td num>{usd(m.cost)}</Td>
                  <Td num>{int(m.inputTokens)}</Td>
                  <Td num>{int(m.outputTokens)}</Td>
                  <Td num>{ms(m.avgLatencyMs)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* Capability spend */}
        <SectionCard
          title="Capability spend"
          description="Spend grouped by the metadata 'capability' field."
          isLoading={capabilities.isLoading}
          isEmpty={(capabilities.data?.length ?? 0) === 0}
          emptyHint="No observations carry a metadata['capability'] value yet. Add it via your SDK to populate this."
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Capability</Th>
                <Th>Calls</Th>
                <Th>Cost</Th>
                <Th>Tokens</Th>
              </tr>
            </thead>
            <tbody>
              {capabilities.data?.map((c) => (
                <tr key={c.capability}>
                  <Td>{c.capability}</Td>
                  <Td num>{int(c.calls)}</Td>
                  <Td num>{usd(c.cost)}</Td>
                  <Td num>{int(c.tokens)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* Decision map */}
        <SectionCard
          title="Decision map"
          description="Cost & confidence grouped by the metadata 'decision_label' field."
          isLoading={decisions.isLoading}
          isEmpty={(decisions.data?.length ?? 0) === 0}
          emptyHint="No observations carry a metadata['decision_label'] value yet."
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Decision</Th>
                <Th>Count</Th>
                <Th>Avg cost</Th>
                <Th>Avg confidence</Th>
                <Th>Avg latency</Th>
              </tr>
            </thead>
            <tbody>
              {decisions.data?.map((d) => (
                <tr key={d.decisionLabel}>
                  <Td>{d.decisionLabel}</Td>
                  <Td num>{int(d.count)}</Td>
                  <Td num>{usd(d.avgCost)}</Td>
                  <Td num>{pct(d.avgConfidence)}</Td>
                  <Td num>{ms(d.avgLatencyMs)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* Client profitability */}
        <SectionCard
          title="Client profitability"
          description="Infra cost vs. billable usage (cost × 3.5 markup) by metadata 'client_id'."
          isLoading={clients.isLoading}
          isEmpty={(clients.data?.length ?? 0) === 0}
          emptyHint="No observations carry a metadata['client_id'] value yet."
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Client</Th>
                <Th>Calls</Th>
                <Th>Infra cost</Th>
                <Th>Billable</Th>
                <Th>Gross margin</Th>
              </tr>
            </thead>
            <tbody>
              {clients.data?.map((c) => (
                <tr key={c.clientId}>
                  <Td>{c.clientId}</Td>
                  <Td num>{int(c.calls)}</Td>
                  <Td num>{usd(c.infraCost)}</Td>
                  <Td num>{usd(c.billableUsage)}</Td>
                  <Td num>{usd(c.grossMargin)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </Page>
  );
}
