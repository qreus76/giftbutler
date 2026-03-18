import { supabaseAdmin } from "@/lib/supabase";

function parseReferrer(ref: string | null): string {
  if (!ref) return "Direct / Unknown";
  try {
    const url = new URL(ref);
    const host = url.hostname.replace(/^www\./, "");
    if (!host) return "Direct / Unknown";
    return host;
  } catch {
    return "Direct / Unknown";
  }
}

function Bar({ pct, color = "bg-amber-400" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-stone-800 rounded-full overflow-hidden flex-1">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
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

export default async function AdminAnalyticsPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    { count: totalVisits },
    { count: totalRecs },
    { count: totalClaims },
    { data: topVisitedRaw },
    { data: topClaimedRaw },
    { data: occasionData },
    { data: budgetData },
    { data: referrerData },
    { data: recentRecs },
  ] = await Promise.all([
    supabaseAdmin.from("profile_visits").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("recommend_logs").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("claims").select("*", { count: "exact", head: true }),

    // Top profiles by visits (30d)
    supabaseAdmin.from("profile_visits")
      .select("profile_user_id")
      .gte("created_at", thirtyDaysAgo),

    // Top profiles by claims
    supabaseAdmin.from("claims")
      .select("recipient_user_id"),

    // Occasion breakdown from claims
    supabaseAdmin.from("claims")
      .select("occasion"),

    // Budget breakdown from recommend_logs
    supabaseAdmin.from("recommend_logs")
      .select("budget"),

    // Referrer breakdown
    supabaseAdmin.from("profile_visits")
      .select("referrer")
      .gte("created_at", thirtyDaysAgo),

    // Recent recommend logs
    supabaseAdmin.from("recommend_logs")
      .select("profile_username, relationship, budget, occasion, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Funnel conversion rates
  const visits = totalVisits ?? 0;
  const recs = totalRecs ?? 0;
  const claims = totalClaims ?? 0;
  const visitsToRecs = visits > 0 ? ((recs / visits) * 100).toFixed(1) : "0";
  const recsToClaimsRate = recs > 0 ? ((claims / recs) * 100).toFixed(1) : "0";
  const visitsToClaims = visits > 0 ? ((claims / visits) * 100).toFixed(1) : "0";

  // Top visited profiles
  const visitCountMap: Record<string, number> = {};
  for (const v of topVisitedRaw || []) visitCountMap[v.profile_user_id] = (visitCountMap[v.profile_user_id] || 0) + 1;
  const topVisitedIds = Object.entries(visitCountMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const { data: topVisitedProfiles } = topVisitedIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, username, name").in("id", topVisitedIds)
    : { data: [] };
  const topVisited = topVisitedIds.map(id => ({
    profile: topVisitedProfiles?.find(p => p.id === id),
    count: visitCountMap[id],
  })).filter(x => x.profile);

  // Top claimed profiles
  const claimCountMap: Record<string, number> = {};
  for (const c of topClaimedRaw || []) claimCountMap[c.recipient_user_id] = (claimCountMap[c.recipient_user_id] || 0) + 1;
  const topClaimedIds = Object.entries(claimCountMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const { data: topClaimedProfiles } = topClaimedIds.length > 0
    ? await supabaseAdmin.from("profiles").select("id, username, name").in("id", topClaimedIds)
    : { data: [] };
  const topClaimed = topClaimedIds.map(id => ({
    profile: topClaimedProfiles?.find(p => p.id === id),
    count: claimCountMap[id],
  })).filter(x => x.profile);

  // Occasion breakdown
  const occasionMap: Record<string, number> = {};
  for (const c of occasionData || []) {
    const key = c.occasion || "No occasion";
    occasionMap[key] = (occasionMap[key] || 0) + 1;
  }
  const occasions = Object.entries(occasionMap).sort((a, b) => b[1] - a[1]);
  const maxOccasion = occasions[0]?.[1] || 1;

  // Budget breakdown
  const budgetMap: Record<string, number> = {};
  for (const r of budgetData || []) {
    const key = r.budget || "Unknown";
    budgetMap[key] = (budgetMap[key] || 0) + 1;
  }
  const budgets = Object.entries(budgetMap).sort((a, b) => b[1] - a[1]);
  const maxBudget = budgets[0]?.[1] || 1;

  // Referrer breakdown
  const referrerMap: Record<string, number> = {};
  for (const v of referrerData || []) {
    const key = parseReferrer(v.referrer);
    referrerMap[key] = (referrerMap[key] || 0) + 1;
  }
  const referrers = Object.entries(referrerMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxReferrer = referrers[0]?.[1] || 1;

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return mins <= 1 ? "just now" : `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-stone-500 text-sm mt-1">All time unless noted</p>
      </div>

      {/* Funnel */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 mb-6">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-5">Conversion Funnel</p>
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
        <div className="flex items-center gap-2">
          <div className="w-24 text-right text-xs text-stone-500">Visits</div>
          <div className="flex-1 h-3 bg-amber-400 rounded-full" />
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-24 text-right text-xs text-stone-500">Searches</div>
          <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400/70 rounded-full" style={{ width: `${visits > 0 ? (recs / visits) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="w-24 text-right text-xs text-stone-500">Claims</div>
          <div className="flex-1 h-3 bg-stone-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400/40 rounded-full" style={{ width: `${visits > 0 ? (claims / visits) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top profiles by views */}
        <Section title="Top Profiles by Views (30d)">
          {topVisited.length === 0 ? (
            <p className="text-stone-600 text-sm">No data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topVisited.map(({ profile, count }) => (
                <div key={profile!.id} className="flex items-center gap-3">
                  <div className="w-28 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">@{profile!.username}</p>
                  </div>
                  <Bar pct={(count / topVisited[0].count) * 100} />
                  <span className="text-xs text-stone-400 w-8 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Top profiles by claims */}
        <Section title="Top Profiles by Claims">
          {topClaimed.length === 0 ? (
            <p className="text-stone-600 text-sm">No data yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {topClaimed.map(({ profile, count }) => (
                <div key={profile!.id} className="flex items-center gap-3">
                  <div className="w-28 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">@{profile!.username}</p>
                  </div>
                  <Bar pct={(count / topClaimed[0].count) * 100} color="bg-green-400" />
                  <span className="text-xs text-stone-400 w-8 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Traffic sources */}
        <Section title="Traffic Sources (30d)">
          {referrers.length === 0 ? (
            <p className="text-stone-600 text-sm">No data yet — will populate as visitors arrive.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {referrers.map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">{source}</p>
                  </div>
                  <Bar pct={(count / maxReferrer) * 100} color="bg-blue-400" />
                  <span className="text-xs text-stone-400 w-8 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Occasions */}
        <Section title="Gift Occasions">
          {occasions.length === 0 ? (
            <p className="text-stone-600 text-sm">No claims yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {occasions.map(([occasion, count]) => (
                <div key={occasion} className="flex items-center gap-3">
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate capitalize">{occasion}</p>
                  </div>
                  <Bar pct={(count / maxOccasion) * 100} color="bg-pink-400" />
                  <span className="text-xs text-stone-400 w-8 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Budget ranges */}
        <Section title="Budget Ranges Searched">
          {budgets.length === 0 ? (
            <p className="text-stone-600 text-sm">No searches yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {budgets.map(([budget, count]) => (
                <div key={budget} className="flex items-center gap-3">
                  <div className="w-32 text-right flex-shrink-0">
                    <p className="text-xs font-medium text-white truncate">{budget}</p>
                  </div>
                  <Bar pct={(count / maxBudget) * 100} color="bg-purple-400" />
                  <span className="text-xs text-stone-400 w-8 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recent gift searches */}
        <Section title="Recent Gift Searches">
          {(recentRecs || []).length === 0 ? (
            <p className="text-stone-600 text-sm">No searches yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(recentRecs || []).map((r, i) => (
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
