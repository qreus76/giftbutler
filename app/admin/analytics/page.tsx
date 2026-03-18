import { supabaseAdmin } from "@/lib/supabase";

function parseReferrer(ref: string | null): string {
  if (!ref) return "Direct / Unknown";
  try {
    const url = new URL(ref);
    const host = url.hostname.replace(/^www\./, "");
    return host || "Direct / Unknown";
  } catch {
    return "Direct / Unknown";
  }
}

function Bar({ pct, color = "bg-amber-400" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-stone-800 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">{title}</p>
      {children}
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
  return `${days}d ago`;
}

export default async function AdminAnalyticsPage() {
  const [
    funnelResult,
    topVisitedResult,
    topClaimedResult,
    occasionsResult,
    budgetsResult,
    referrersResult,
    recentRecsResult,
  ] = await Promise.all([
    supabaseAdmin.rpc("admin_funnel_stats", { days_back: 30 }),
    supabaseAdmin.rpc("admin_top_visited_profiles", { days_back: 30 }),
    supabaseAdmin.rpc("admin_top_claimed_profiles"),
    supabaseAdmin.rpc("admin_occasion_breakdown"),
    supabaseAdmin.rpc("admin_budget_breakdown"),
    supabaseAdmin.rpc("admin_referrer_breakdown", { days_back: 30 }),
    supabaseAdmin.from("recommend_logs")
      .select("profile_username, relationship, budget, occasion, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const funnel: { visits: number; recs: number; claims: number } = funnelResult.data ?? { visits: 0, recs: 0, claims: 0 };
  const topVisited: { username: string; name: string; visit_count: number }[] = topVisitedResult.data ?? [];
  const topClaimed: { username: string; name: string; claim_count: number }[] = topClaimedResult.data ?? [];
  const occasions: { occasion: string; count: number }[] = occasionsResult.data ?? [];
  const budgets: { budget: string; count: number }[] = budgetsResult.data ?? [];
  const referrersRaw: { referrer: string; count: number }[] = referrersResult.data ?? [];
  const recentRecs = recentRecsResult.data ?? [];

  // Parse referrer hostnames
  const referrerMap: Record<string, number> = {};
  for (const r of referrersRaw) {
    const key = parseReferrer(r.referrer);
    referrerMap[key] = (referrerMap[key] || 0) + Number(r.count);
  }
  const referrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const { visits, recs, claims } = funnel;
  const visitsToRecs = visits > 0 ? ((recs / visits) * 100).toFixed(1) : "0";
  const recsToClaimsRate = recs > 0 ? ((claims / recs) * 100).toFixed(1) : "0";
  const visitsToClaims = visits > 0 ? ((claims / visits) * 100).toFixed(1) : "0";

  const maxVisited = topVisited[0]?.visit_count || 1;
  const maxClaimed = topClaimed[0]?.claim_count || 1;
  const maxOccasion = occasions[0]?.count || 1;
  const maxBudget = budgets[0]?.count || 1;
  const maxReferrer = referrers[0]?.[1] || 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-stone-500 text-sm mt-1">Last 30 days unless noted</p>
      </div>

      {/* Funnel */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 mb-6">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-5">Conversion Funnel — Last 30 Days</p>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <p className="text-3xl font-bold text-white">{visits.toLocaleString()}</p>
            <p className="text-xs text-stone-500 mt-1">Profile visits</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{recs.toLocaleString()}</p>
            <p className="text-xs text-stone-500 mt-1">Gift searches</p>
            <p className="text-xs text-amber-400 mt-0.5">{visitsToRecs}% of visits</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{claims.toLocaleString()}</p>
            <p className="text-xs text-stone-500 mt-1">Gifts claimed</p>
            <p className="text-xs text-amber-400 mt-0.5">{recsToClaimsRate}% of searches · {visitsToClaims}% of visits</p>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="w-20 text-right text-xs text-stone-500">Visits</div>
            <div className="flex-1 h-3 bg-amber-400 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 text-right text-xs text-stone-500">Searches</div>
            <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400/70 rounded-full" style={{ width: `${visits > 0 ? (recs / visits) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 text-right text-xs text-stone-500">Claims</div>
            <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400/40 rounded-full" style={{ width: `${visits > 0 ? (claims / visits) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Section title="Top Profiles by Views (30d)">
          {topVisited.length === 0 ? <p className="text-stone-600 text-sm">No data yet.</p> : (
            <div className="flex flex-col gap-3">
              {topVisited.map((p) => (
                <div key={p.username} className="flex items-center gap-3">
                  <div className="w-28 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">@{p.username}</p>
                  </div>
                  <Bar pct={(p.visit_count / maxVisited) * 100} />
                  <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{Number(p.visit_count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Top Profiles by Claims">
          {topClaimed.length === 0 ? <p className="text-stone-600 text-sm">No data yet.</p> : (
            <div className="flex flex-col gap-3">
              {topClaimed.map((p) => (
                <div key={p.username} className="flex items-center gap-3">
                  <div className="w-28 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">@{p.username}</p>
                  </div>
                  <Bar pct={(p.claim_count / maxClaimed) * 100} color="bg-green-400" />
                  <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{Number(p.claim_count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Traffic Sources (30d)">
          {referrers.length === 0 ? <p className="text-stone-600 text-sm">No data yet — fills in as visitors arrive.</p> : (
            <div className="flex flex-col gap-3">
              {referrers.map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">{source}</p>
                  </div>
                  <Bar pct={(count / maxReferrer) * 100} color="bg-blue-400" />
                  <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Gift Occasions">
          {occasions.length === 0 ? <p className="text-stone-600 text-sm">No claims yet.</p> : (
            <div className="flex flex-col gap-3">
              {occasions.map((o) => (
                <div key={o.occasion} className="flex items-center gap-3">
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate capitalize">{o.occasion}</p>
                  </div>
                  <Bar pct={(o.count / maxOccasion) * 100} color="bg-pink-400" />
                  <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{Number(o.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Budget Ranges Searched">
          {budgets.length === 0 ? <p className="text-stone-600 text-sm">No searches yet.</p> : (
            <div className="flex flex-col gap-3">
              {budgets.map((b) => (
                <div key={b.budget} className="flex items-center gap-3">
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">{b.budget}</p>
                  </div>
                  <Bar pct={(b.count / maxBudget) * 100} color="bg-purple-400" />
                  <span className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{Number(b.count).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Recent Gift Searches">
          {recentRecs.length === 0 ? <p className="text-stone-600 text-sm">No searches yet.</p> : (
            <div className="flex flex-col gap-3">
              {recentRecs.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white">@{r.profile_username}</p>
                    <p className="text-xs text-stone-500">
                      {r.relationship} · {r.budget}{r.occasion ? ` · ${r.occasion}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-stone-600 flex-shrink-0">{timeAgo(r.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
