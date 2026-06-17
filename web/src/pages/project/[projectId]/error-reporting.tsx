import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import Link from "next/link";
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

const int = (n: number) => (n ?? 0).toLocaleString();
const usd = (n: number) =>
  `$${(n ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const pct = (n: number) => `${((n ?? 0) * 100).toFixed(1)}%`;
const when = (s: string) => {
  const d = new Date(s.includes("Z") ? s : s.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? s : d.toLocaleString();
};

function Kpi({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs font-medium">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-semibold tabular-nums ${
            danger ? "text-destructive" : ""
          }`}
        >
          {value}
        </div>
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
    <td className={`border-b px-3 py-2 align-top text-sm ${num ? "tabular-nums" : ""}`}>
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
            {emptyHint ?? "No errors in this time range. 🎉"}
          </p>
        ) : (
          <div className="overflow-x-auto">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ErrorReportingPage() {
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

  const summary = api.errorReporting.getSummary.useQuery(queryInput, {
    enabled,
  });
  const overTime = api.errorReporting.getErrorsOverTime.useQuery(queryInput, {
    enabled,
  });
  const messages = api.errorReporting.getTopMessages.useQuery(queryInput, {
    enabled,
  });
  const operations = api.errorReporting.getByOperation.useQuery(queryInput, {
    enabled,
  });
  const models = api.errorReporting.getByModel.useQuery(queryInput, {
    enabled,
  });
  const recent = api.errorReporting.getRecentErrors.useQuery(queryInput, {
    enabled,
  });

  const s = summary.data;
  const maxDay = useMemo(
    () => Math.max(1, ...(overTime.data?.map((d) => d.count) ?? [])),
    [overTime.data],
  );

  const traceHref = (traceId: string | null) =>
    traceId ? `/project/${projectId}/traces/${traceId}` : undefined;

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: "Error Reporting",
        help: {
          description:
            "Errors across your agent traces (observations with level=ERROR): " +
            "error rate, the most common messages, which operations and models " +
            "fail, volume over time, and a recent-errors feed that links to the trace.",
        },
      }}
    >
      <div className="flex flex-col gap-4">
        {/* Time range */}
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Kpi label="Errors" value={int(s?.errorCount ?? 0)} danger />
          <Kpi label="Error rate" value={pct(s?.errorRate ?? 0)} danger />
          <Kpi label="Affected traces" value={int(s?.affectedTraces ?? 0)} />
          <Kpi label="Distinct messages" value={int(s?.distinctMessages ?? 0)} />
          <Kpi label="Cost on errors" value={usd(s?.errorCost ?? 0)} />
        </div>

        {/* Errors over time */}
        <SectionCard
          title="Errors over time"
          description="Daily error volume."
          isLoading={overTime.isLoading}
          isEmpty={(overTime.data?.length ?? 0) === 0}
        >
          <div className="flex flex-col gap-1">
            {overTime.data?.map((d) => (
              <div key={d.day} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
                  {d.day}
                </span>
                <div className="bg-muted h-4 flex-1 overflow-hidden rounded">
                  <div
                    className="bg-destructive h-full"
                    style={{ width: `${(d.count / maxDay) * 100}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right tabular-nums">
                  {int(d.count)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Top error messages */}
        <SectionCard
          title="Top error messages"
          description="Most frequent error text, with a sample trace to drill into."
          isLoading={messages.isLoading}
          isEmpty={(messages.data?.length ?? 0) === 0}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Message</Th>
                <Th>Count</Th>
                <Th>Last seen</Th>
                <Th>Sample</Th>
              </tr>
            </thead>
            <tbody>
              {messages.data?.map((m, i) => (
                <tr key={i}>
                  <Td>
                    <span className="font-mono text-xs break-words">
                      {m.message}
                    </span>
                  </Td>
                  <Td num>{int(m.count)}</Td>
                  <Td num>{when(m.lastSeen)}</Td>
                  <Td>
                    {traceHref(m.sampleTraceId) ? (
                      <Link
                        href={traceHref(m.sampleTraceId)!}
                        className="text-primary underline"
                      >
                        View trace
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        {/* By operation + by model */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard
            title="Errors by operation"
            description="Which steps / tools fail most."
            isLoading={operations.isLoading}
            isEmpty={(operations.data?.length ?? 0) === 0}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Operation</Th>
                  <Th>Type</Th>
                  <Th>Errors</Th>
                </tr>
              </thead>
              <tbody>
                {operations.data?.map((o, i) => (
                  <tr key={i}>
                    <Td>{o.operation}</Td>
                    <Td>{o.type}</Td>
                    <Td num>{int(o.count)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>

          <SectionCard
            title="Errors by model"
            description="Which models produce the most errors."
            isLoading={models.isLoading}
            isEmpty={(models.data?.length ?? 0) === 0}
          >
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Model</Th>
                  <Th>Errors</Th>
                </tr>
              </thead>
              <tbody>
                {models.data?.map((m, i) => (
                  <tr key={i}>
                    <Td>{m.model}</Td>
                    <Td num>{int(m.count)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionCard>
        </div>

        {/* Recent errors */}
        <SectionCard
          title="Recent errors"
          description="Newest errors first — click through to the full trace."
          isLoading={recent.isLoading}
          isEmpty={(recent.data?.length ?? 0) === 0}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Time</Th>
                <Th>Operation</Th>
                <Th>Message</Th>
                <Th>Model</Th>
                <Th>Trace</Th>
              </tr>
            </thead>
            <tbody>
              {recent.data?.map((e) => (
                <tr key={e.id}>
                  <Td num>{when(e.startTime)}</Td>
                  <Td>{e.name}</Td>
                  <Td>
                    <span className="font-mono text-xs break-words">
                      {e.message || "—"}
                    </span>
                  </Td>
                  <Td>{e.model || "—"}</Td>
                  <Td>
                    {traceHref(e.traceId) ? (
                      <Link
                        href={traceHref(e.traceId)!}
                        className="text-primary underline"
                      >
                        Open
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </Page>
  );
}
