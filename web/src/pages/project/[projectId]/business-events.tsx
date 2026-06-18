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
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";

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

function ManageEventTypes({ projectId }: { projectId: string }) {
  const utils = api.useUtils();
  const configs = api.businessEvents.getConfigs.useQuery(
    { projectId, includeArchived: false },
    { enabled: !!projectId },
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = api.businessEvents.createConfig.useMutation({
    onSuccess: async () => {
      setName("");
      setDescription("");
      await utils.businessEvents.getConfigs.invalidate();
      await utils.businessEvents.getOutcomeAnalytics.invalidate();
    },
  });
  const update = api.businessEvents.updateConfig.useMutation({
    onSuccess: async () => {
      await utils.businessEvents.getConfigs.invalidate();
      await utils.businessEvents.getOutcomeAnalytics.invalidate();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Custom event types</CardTitle>
        <p className="text-muted-foreground text-sm">
          Define the business outcomes you want to attribute cost to, e.g.{" "}
          <code>qualified_lead</code>, <code>booked_call</code>,{" "}
          <code>signed_contract</code>. Record occurrences via{" "}
          <code>POST /api/public/business-events</code> with the event{" "}
          <code>name</code> and an optional <code>traceId</code> and{" "}
          <code>value</code>.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate({
              projectId,
              name: name.trim(),
              description: description.trim() || null,
            });
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">Event name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="qualified_lead"
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Lead met qualification criteria"
              className="w-80"
            />
          </div>
          <Button type="submit" loading={create.isPending} disabled={!name.trim()}>
            Add event type
          </Button>
        </form>
        {create.error ? (
          <p className="text-destructive text-sm">{create.error.message}</p>
        ) : null}

        <div className="overflow-x-auto">
          {configs.isLoading ? (
            <p className="text-muted-foreground py-4 text-sm">Loading…</p>
          ) : (configs.data?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground py-4 text-sm">
              No event types yet. Add one above to start attributing outcomes.
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {configs.data?.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <code>{c.name}</code>
                    </Td>
                    <Td>{c.description ?? "—"}</Td>
                    <Td>
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={update.isPending}
                        onClick={() =>
                          update.mutate({
                            projectId,
                            id: c.id,
                            isArchived: true,
                          })
                        }
                      >
                        Archive
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function BusinessEventsPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [days, setDays] = useState<number>(30);

  const { fromTimestamp, toTimestamp } = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return { fromTimestamp: from, toTimestamp: to };
  }, [days]);

  const enabled = !!projectId;
  const analytics = api.businessEvents.getOutcomeAnalytics.useQuery(
    { projectId, fromTimestamp, toTimestamp },
    { enabled },
  );

  const t = analytics.data?.totals;
  const outcomes = analytics.data?.outcomes ?? [];
  const hasOutcomes = outcomes.some((o) => o.count > 0);

  return (
    <Page
      withPadding
      scrollable
      headerProps={{
        title: "Business Outcomes",
        help: {
          description:
            "Attribute LLM cost and revenue to the business outcomes your agents " +
            "produce. Define custom event types, record occurrences against a " +
            "traceId via the public API, and see cost-per-outcome, profit and ROI.",
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Total outcomes" value={int(t?.count ?? 0)} />
          <Kpi label="Revenue" value={usd(t?.revenue ?? 0)} />
          <Kpi label="Attributed cost" value={usd(t?.attributedCost ?? 0)} />
          <Kpi
            label="Blended cost / outcome"
            value={usd(t?.costPerOutcome ?? 0)}
          />
        </div>

        {/* Cost per outcome */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cost per outcome</CardTitle>
            <p className="text-muted-foreground text-sm">
              Cost is attributed from the trace each outcome references. Revenue
              is the sum of recorded outcome values.
            </p>
          </CardHeader>
          <CardContent>
            {analytics.isLoading ? (
              <p className="text-muted-foreground py-6 text-sm">Loading…</p>
            ) : !hasOutcomes ? (
              <p className="text-muted-foreground py-6 text-sm">
                No outcomes recorded in this time range. Record one with{" "}
                <code>POST /api/public/business-events</code>.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <Th>Outcome</Th>
                      <Th>Count</Th>
                      <Th>Revenue</Th>
                      <Th>Attributed cost</Th>
                      <Th>Cost / outcome</Th>
                      <Th>Profit</Th>
                      <Th>ROI</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {outcomes
                      .filter((o) => o.count > 0)
                      .map((o) => (
                        <tr key={o.configId}>
                          <Td>
                            <code>{o.name}</code>
                          </Td>
                          <Td num>{int(o.count)}</Td>
                          <Td num>{usd(o.revenue)}</Td>
                          <Td num>{usd(o.attributedCost)}</Td>
                          <Td num>{usd(o.costPerOutcome)}</Td>
                          <Td num>{usd(o.profit)}</Td>
                          <Td num>
                            {o.roi === null ? "—" : `${o.roi.toFixed(1)}×`}
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manage event types */}
        <ManageEventTypes projectId={projectId} />
      </div>
    </Page>
  );
}
