import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { endpoints } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import {
  Badge,
  Card,
  EmptyState,
  SectionHeader,
  Spinner,
  Stat,
  StatusDot,
} from "@/components/ui/Primitives";
import { priorityTone, triageBarColor, cn } from "@/lib/utils";

const PIE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#38bdf8", "#64748b"];

const tooltipStyle = {
  contentStyle: {
    background: "#0a0f1a",
    border: "1px solid #1e293b",
    borderRadius: 10,
    fontSize: 12,
  },
  labelStyle: { color: "#94a3b8" },
};

export default function Dashboard() {
  const { data, loading, error } = useAsync(endpoints.overview, []);

  if (loading) return <Spinner />;
  if (error) return <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-4 text-sm text-red-400">{error}</div>;

  const dist = (data.priorityDistribution || []).map((d: any) => ({
    name: d._id || "pending",
    value: d.count,
  }));

  const metrics = [...(data.recentMetrics || [])].reverse().map((m: any) => ({
    time: new Date(m.measuredAt).getHours() + ":00",
    wait: m.averageWaitMinutes,
    capacity: m.capacityUtilization,
  }));

  return (
    <div className="grid gap-5">
      <SectionHeader
        title="Command Center"
        subtitle="Real-time operational status — patient flow, EMS traffic, capacity, and ACUITY activity."
        action={
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs">
            <StatusDot status="live" />
            <span className="font-semibold text-slate-400">Live data</span>
          </div>
        }
      />

      {/* KPI row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Active Patients"  value={data.activePatients ?? 0}      accent="sky"    />
        <Stat label="In Queue"         value={data.queueLength ?? 0}          accent="orange" />
        <Stat label="EMS Inbound"      value={data.incomingAmbulances ?? 0}   accent="red"    />
        <Stat label="Open Beds"        value={data.bedAvailability ?? 0}       accent="green"  />
        <Stat label="Avg Wait (min)"   value={data.averageWaitMinutes ?? 0}    accent="slate"  />
      </section>

      {/* Charts row */}
      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-200">Operational Trends</h2>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Last 24h</span>
          </div>
          <div className="h-64">
            {metrics.length === 0 ? (
              <EmptyState title="No trend data yet" body="Metrics will appear as the system collects operational data." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics}>
                  <defs>
                    <linearGradient id="gWait" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="time"    stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis                   stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="wait"     name="Avg wait (min)" stroke="#38bdf8" fill="url(#gWait)" strokeWidth={2} />
                  <Area type="monotone" dataKey="capacity" name="Capacity %"     stroke="#f59e0b" fill="url(#gCap)"  strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-sm font-black text-slate-200">Priority Distribution</h2>
          </div>
          <div className="h-64">
            {dist.length === 0 ? (
              <EmptyState title="No triage data" body="Priority distribution will appear as patients are triaged." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dist} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} strokeWidth={2} stroke="transparent">
                    {dist.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </section>

      {/* Queue + Alerts */}
      <section className="grid gap-5 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-black text-slate-200">Active Queue</h2>
          {!data.queue?.length ? (
            <EmptyState title="No active queue" body="Queue entries will appear here as patients arrive." />
          ) : (
            <div className="grid gap-2">
              {data.queue.map((e: any, idx: number) => (
                <div
                  key={e._id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/30 p-3 transition-colors hover:border-slate-700"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 font-black text-xs text-slate-400 tabular-nums">
                    {idx + 1}
                  </div>
                  <div className={cn("h-8 w-0.5 shrink-0 rounded-full", triageBarColor(e.patient?.triageStatus))} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-200">{e.patient?.fullName}</div>
                    <div className="font-mono text-[10px] text-slate-500">{e.patient?.mrn}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums text-slate-300">{e.estimatedWaitMinutes}m</div>
                    <Badge className={priorityTone(e.patient?.triageStatus)}>
                      {e.patient?.triageStatus?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-black text-slate-200">Operational Alerts</h2>
          {!data.alerts?.length ? (
            <EmptyState title="No active alerts" body="Operational alerts will appear here when triggered." />
          ) : (
            <div className="grid gap-2">
              {data.alerts.map((a: any) => {
                const isCritical = a.severity === "critical";
                return (
                  <div
                    key={a._id}
                    className={cn(
                      "rounded-xl border p-3.5 transition-colors",
                      isCritical
                        ? "border-red-500/25 bg-red-500/5"
                        : "border-amber-500/20 bg-amber-500/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className={cn("mt-px h-1.5 w-1.5 shrink-0 rounded-full", isCritical ? "bg-red-400" : "bg-amber-400")} />
                        <b className="text-sm text-slate-200">{a.title}</b>
                      </div>
                      <Badge className={priorityTone(isCritical ? "critical" : "urgent")}>{a.severity}</Badge>
                    </div>
                    <p className="mt-1.5 pl-3.5 text-xs leading-relaxed text-slate-500">{a.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
