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

export default async function AdminOverviewPage() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { count: totalUsers },
    { count: signupsToday },
    { count: signupsWeek },
    { count: signupsMonth },
    { count: totalHints },
    { count: totalClaims },
    { count: visitsMonth },
    { data: recentSignups },
    { data: recentClaims },
  ] = await Promise.all([
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", startOfToday),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("hints").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("claims").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("profile_visits").select("*", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    supabaseAdmin.from("profiles").select("username, name, created_at").order("created_at", { ascending: false }).limit(8),
    supabaseAdmin.from("claims").select("gift_description, occasion, created_at, recipient_user_id").order("created_at", { ascending: false }).limit(8),
  ]);

  // Enrich recent claims with recipient usernames
  const recipientIds = [...new Set((recentClaims || []).map(c => c.recipient_user_id))];
  const { data: claimProfiles } = recipientIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, username").in("id", recipientIds)
    : { data: [] };
  const profileMap = Object.fromEntries((claimProfiles || []).map(p => [p.id, p.username]));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-stone-500 text-sm mt-1">All time unless noted</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users" value={totalUsers ?? 0} />
        <StatCard label="Signups Today" value={signupsToday ?? 0} />
        <StatCard label="Signups This Week" value={signupsWeek ?? 0} />
        <StatCard label="Signups This Month" value={signupsMonth ?? 0} />
        <StatCard label="Total Hints" value={totalHints ?? 0} sub={totalUsers ? `${((totalHints ?? 0) / totalUsers).toFixed(1)} per user` : undefined} />
        <StatCard label="Total Claims" value={totalClaims ?? 0} />
        <StatCard label="Profile Views" value={visitsMonth ?? 0} sub="last 30 days" />
        <StatCard label="Avg Hints/User" value={totalUsers ? ((totalHints ?? 0) / totalUsers).toFixed(1) : "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent signups */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Recent Signups</p>
          {(recentSignups || []).length === 0 ? (
            <p className="text-stone-600 text-sm">No signups yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(recentSignups || []).map((u) => (
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

        {/* Recent claims */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Recent Claims</p>
          {(recentClaims || []).length === 0 ? (
            <p className="text-stone-600 text-sm">No claims yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(recentClaims || []).map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{c.gift_description}</p>
                    <p className="text-xs text-stone-500">
                      for @{profileMap[c.recipient_user_id] || "unknown"}{c.occasion ? ` · ${c.occasion}` : ""}
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
