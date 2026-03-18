import { supabaseAdmin } from "@/lib/supabase";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-stone-500 mt-1">{sub}</p>}
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
  total_users: number;
  signups_today: number;
  signups_week: number;
  signups_month: number;
  total_hints: number;
  total_claims: number;
  visits_month: number;
}

export default async function AdminOverviewPage() {
  const [statsResult, signupsResult, claimsResult] = await Promise.all([
    supabaseAdmin.rpc("admin_overview_stats"),
    supabaseAdmin.rpc("admin_recent_signups", { limit_count: 8 }),
    supabaseAdmin.rpc("admin_recent_claims", { limit_count: 8 }),
  ]);

  const stats: OverviewStats = statsResult.data ?? {
    total_users: 0, signups_today: 0, signups_week: 0, signups_month: 0,
    total_hints: 0, total_claims: 0, visits_month: 0,
  };

  const recentSignups: { username: string; name: string; created_at: string }[] = signupsResult.data ?? [];
  const recentClaims: { gift_description: string; occasion: string | null; created_at: string; recipient_username: string }[] = claimsResult.data ?? [];

  const avgHints = stats.total_users > 0 ? (stats.total_hints / stats.total_users).toFixed(1) : "—";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-stone-500 text-sm mt-1">All time unless noted</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={stats.total_users.toLocaleString()} />
        <StatCard label="Signups Today" value={stats.signups_today.toLocaleString()} />
        <StatCard label="Signups This Week" value={stats.signups_week.toLocaleString()} />
        <StatCard label="Signups This Month" value={stats.signups_month.toLocaleString()} />
        <StatCard label="Total Hints" value={stats.total_hints.toLocaleString()} sub={`${avgHints} per user`} />
        <StatCard label="Total Claims" value={stats.total_claims.toLocaleString()} />
        <StatCard label="Profile Views" value={stats.visits_month.toLocaleString()} sub="last 30 days" />
        <StatCard label="Avg Hints / User" value={avgHints} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Recent Signups</p>
          {recentSignups.length === 0 ? (
            <p className="text-stone-600 text-sm">No signups yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentSignups.map((u) => (
                <div key={u.username} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{u.name || u.username}</p>
                    <p className="text-xs text-stone-500">@{u.username}</p>
                  </div>
                  <p className="text-xs text-stone-600">{timeAgo(u.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Recent Claims</p>
          {recentClaims.length === 0 ? (
            <p className="text-stone-600 text-sm">No claims yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentClaims.map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{c.gift_description}</p>
                    <p className="text-xs text-stone-500">
                      for @{c.recipient_username}{c.occasion ? ` · ${c.occasion}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-stone-600 flex-shrink-0">{timeAgo(c.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
