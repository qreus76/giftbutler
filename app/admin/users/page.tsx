import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

interface SearchParams { search?: string }

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { search } = await searchParams;

  // Get all profiles
  let query = supabaseAdmin
    .from("profiles")
    .select("id, username, name, bio, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (search?.trim()) {
    query = query.or(`username.ilike.%${search.trim()}%,name.ilike.%${search.trim()}%`);
  }

  const { data: profiles } = await query;

  if (!profiles || profiles.length === 0) {
    return (
      <div>
        <AdminUsersHeader search={search} />
        <p className="text-stone-500 text-sm mt-8">No users found.</p>
      </div>
    );
  }

  const ids = profiles.map(p => p.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Get hint counts, claim counts, and visit counts in parallel
  const [{ data: hints }, { data: claims }, { data: visits }] = await Promise.all([
    supabaseAdmin.from("hints").select("user_id").in("user_id", ids),
    supabaseAdmin.from("claims").select("recipient_user_id").in("recipient_user_id", ids),
    supabaseAdmin.from("profile_visits").select("profile_user_id").in("profile_user_id", ids).gte("created_at", thirtyDaysAgo),
  ]);

  const hintMap: Record<string, number> = {};
  const claimMap: Record<string, number> = {};
  const visitMap: Record<string, number> = {};

  for (const h of hints || []) hintMap[h.user_id] = (hintMap[h.user_id] || 0) + 1;
  for (const c of claims || []) claimMap[c.recipient_user_id] = (claimMap[c.recipient_user_id] || 0) + 1;
  for (const v of visits || []) visitMap[v.profile_user_id] = (visitMap[v.profile_user_id] || 0) + 1;

  return (
    <div>
      <AdminUsersHeader search={search} />

      <p className="text-stone-500 text-sm mb-4">{profiles.length} user{profiles.length !== 1 ? "s" : ""}</p>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800">
              <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">User</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Hints</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Claims</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Views (30d)</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Joined</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={p.id} className={`border-b border-stone-800 last:border-0 ${i % 2 === 0 ? "" : "bg-stone-900/50"}`}>
                <td className="px-4 py-3">
                  <Link href={`/for/${p.username}`} target="_blank" className="hover:text-amber-400 transition-colors">
                    <p className="font-medium text-white">{p.name || p.username}</p>
                    <p className="text-xs text-stone-500">@{p.username}</p>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-stone-300">{hintMap[p.id] || 0}</td>
                <td className="px-4 py-3 text-right text-stone-300">{claimMap[p.id] || 0}</td>
                <td className="px-4 py-3 text-right text-stone-300">{visitMap[p.id] || 0}</td>
                <td className="px-4 py-3 text-right text-stone-500 text-xs">
                  {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminUsersHeader({ search }: { search?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>
      <form method="GET">
        <input
          name="search"
          defaultValue={search || ""}
          placeholder="Search username or name..."
          className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 w-64"
        />
      </form>
    </div>
  );
}
