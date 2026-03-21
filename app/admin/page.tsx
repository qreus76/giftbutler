import { supabaseAdmin } from "@/lib/supabase";
import { Suspense } from "react";
import DateRangePicker from "./components/DateRangePicker";
import LineChart from "./components/LineChart";
import RefreshButton from "./components/RefreshButton";

const VALID_DAYS = [7, 30, 90, 365];

function pct(current: number, previous: number): string | null {
  if (previous === 0) return current > 0 ? "+100%" : null;
  const change = ((current - previous) / previous) * 100;
  return (change >= 0 ? "+" : "") + change.toFixed(0) + "%";
}

function StatCard({
  label, value, sub, trend, trendPositive,
}: {
  label: string; value: string | number; sub?: string; trend?: string | null; trendPositive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5">
      <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-[#111111]">{value}</p>
        {trend && (
          <span className={`text-xs font-semibold mb-1 ${trendPositive ? "text-emerald-600" : "text-red-500"}`}>
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="text-xs text-[#888888] mt-1">{sub}</p>}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

interface OverviewStats {
  total_users: number; signups_today: number; signups_week: number;
  signups_month: number; total_hints: number; total_claims: number; visits_month: number;
}
interface PeriodComparison {
  signups_current: number; signups_previous: number;
  visits_current: number; visits_previous: number;
  claims_current: number; claims_previous: number;
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = VALID_DAYS.includes(Number(daysParam)) ? Number(daysParam) : 30;

  const [
    statsResult,
    comparisonResult,
    activeUsersResult,
    signupsSeriesResult,
    visitsSeriesResult,
    claimsSeriesResult,
    recentSignupsResult,
    recentClaimsResult,
  ] = await Promise.all([
    supabaseAdmin.rpc("admin_overview_stats"),
    supabaseAdmin.rpc("admin_period_comparison", { days_back: days }),
    supabaseAdmin.rpc("admin_active_users", { days_back: days }),
    supabaseAdmin.rpc("admin_signups_timeseries", { days_back: days }),
    supabaseAdmin.rpc("admin_visits_timeseries", { days_back: days }),
    supabaseAdmin.rpc("admin_claims_timeseries", { days_back: days }),
    supabaseAdmin.rpc("admin_recent_signups", { limit_count: 8 }),
    supabaseAdmin.rpc("admin_recent_claims", { limit_count: 8 }),
  ]);

  const stats: OverviewStats = statsResult.data ?? {
    total_users: 0, signups_today: 0, signups_week: 0,
    signups_month: 0, total_hints: 0, total_claims: 0, visits_month: 0,
  };
  const comparison: PeriodComparison = comparisonResult.data ?? {
    signups_current: 0, signups_previous: 0,
    visits_current: 0, visits_previous: 0,
    claims_current: 0, claims_previous: 0,
  };
  const activeUsers = Number(activeUsersResult.data ?? 0);
  const signupsSeries: { date: string; count: number }[] = (signupsSeriesResult.data ?? []).map(
    (d: { date: string; count: number }) => ({ date: d.date, count: Number(d.count) })
  );
  const visitsSeries: { date: string; count: number }[] = (visitsSeriesResult.data ?? []).map(
    (d: { date: string; count: number }) => ({ date: d.date, count: Number(d.count) })
  );
  const claimsSeries: { date: string; count: number }[] = (claimsSeriesResult.data ?? []).map(
    (d: { date: string; count: number }) => ({ date: d.date, count: Number(d.count) })
  );
  const recentSignups: { username: string; name: string; created_at: string }[] = recentSignupsResult.data ?? [];
  const recentClaims: { gift_description: string; occasion: string | null; created_at: string; recipient_username: string }[] = recentClaimsResult.data ?? [];

  const avgHints = stats.total_users > 0 ? (stats.total_hints / stats.total_users).toFixed(1) : "—";
  const periodLabel = days === 365 ? "this year" : days === 7 ? "this week" : `last ${days}d`;
  const signupsTrend = pct(comparison.signups_current, comparison.signups_previous);
  const visitsTrend = pct(comparison.visits_current, comparison.visits_previous);
  const claimsTrend = pct(comparison.claims_current, comparison.claims_previous);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Overview</h1>
          <p className="text-[#888888] text-sm mt-0.5">Trends vs. previous {days === 365 ? "year" : `${days} days`}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Suspense>
            <DateRangePicker days={days} />
          </Suspense>
          <RefreshButton />
        </div>
      </div>

      {/* All-time totals */}
      <div>
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">All Time</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Users"      value={stats.total_users.toLocaleString()} />
          <StatCard label="Total Hints"      value={stats.total_hints.toLocaleString()} sub={`${avgHints} per user`} />
          <StatCard label="Total Claims"     value={stats.total_claims.toLocaleString()} />
          <StatCard label="Avg Hints / User" value={avgHints} />
        </div>
      </div>

      {/* Period stats */}
      <div>
        <p className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-3">
          {periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1)} vs previous period
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="New Signups"
            value={comparison.signups_current.toLocaleString()}
            trend={signupsTrend}
            trendPositive={comparison.signups_current >= comparison.signups_previous}
          />
          <StatCard
            label="Active Users"
            value={activeUsers.toLocaleString()}
            sub="added a hint"
          />
          <StatCard
            label="Profile Views"
            value={comparison.visits_current.toLocaleString()}
            trend={visitsTrend}
            trendPositive={comparison.visits_current >= comparison.visits_previous}
          />
          <StatCard
            label="Gifts Claimed"
            value={comparison.claims_current.toLocaleString()}
            trend={claimsTrend}
            trendPositive={comparison.claims_current >= comparison.claims_previous}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: "New Signups", data: signupsSeries, color: "#111111", id: "signups-grad" },
          { title: "Profile Views", data: visitsSeries, color: "#C4824A", id: "visits-grad" },
          { title: "Gifts Claimed", data: claimsSeries, color: "#4A7C59", id: "claims-grad" },
        ].map(({ title, data, color, id }) => (
          <div key={id} className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-4">
              {title} — {periodLabel}
            </p>
            <LineChart data={data} color={color} gradientId={id} />
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-4">Recent Signups</p>
          {recentSignups.length === 0 ? (
            <p className="text-[#CCCCCC] text-sm">No signups yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#F0F0E8]">
              {recentSignups.map((u) => (
                <div key={u.username} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-[#111111]">{u.name || u.username}</p>
                    <p className="text-xs text-[#888888]">@{u.username}</p>
                  </div>
                  <p className="text-xs text-[#CCCCCC]">{timeAgo(u.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5">
          <p className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-4">Recent Claims</p>
          {recentClaims.length === 0 ? (
            <p className="text-[#CCCCCC] text-sm">No claims yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-[#F0F0E8]">
              {recentClaims.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm text-[#111111] truncate">{c.gift_description}</p>
                    <p className="text-xs text-[#888888]">
                      for @{c.recipient_username}{c.occasion ? ` · ${c.occasion}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-[#CCCCCC] flex-shrink-0">{timeAgo(c.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
