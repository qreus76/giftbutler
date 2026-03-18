import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

const PAGE_SIZE = 50;

interface SearchParams { search?: string; page?: string }

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { search, page: pageParam } = await searchParams;
  const page = Math.max(0, parseInt(pageParam || "0") || 0);
  const searchTerm = search?.trim() || "";

  const [usersResult, countResult] = await Promise.all([
    supabaseAdmin.rpc("admin_user_list", {
      search_term: searchTerm,
      page_num: page,
      page_size: PAGE_SIZE,
    }),
    supabaseAdmin.rpc("admin_user_count", { search_term: searchTerm }),
  ]);

  const users: {
    id: string; username: string; name: string; created_at: string;
    hint_count: number; claim_count: number; visit_count: number;
  }[] = usersResult.data ?? [];

  const totalCount = Number(countResult.data ?? 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (p > 0) params.set("page", String(p));
    const qs = params.toString();
    return `/admin/users${qs ? `?${qs}` : ""}`;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-stone-500 text-sm mt-1">
            {totalCount.toLocaleString()} user{totalCount !== 1 ? "s" : ""}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
        <form method="GET">
          {page > 0 && <input type="hidden" name="page" value="0" />}
          <input
            name="search"
            defaultValue={searchTerm}
            placeholder="Search username or name..."
            className="px-4 py-2 bg-stone-800 border border-stone-700 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 w-64"
          />
        </form>
      </div>

      {/* Table */}
      {users.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 text-center">
          <p className="text-stone-500 text-sm">No users found.</p>
        </div>
      ) : (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden mb-4">
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
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors ${i % 2 === 0 ? "" : "bg-stone-950/30"}`}>
                  <td className="px-4 py-3">
                    <Link href={`/for/${u.username}`} target="_blank" className="hover:text-amber-400 transition-colors group">
                      <p className="font-medium text-white group-hover:text-amber-400">{u.name || u.username}</p>
                      <p className="text-xs text-stone-500">@{u.username}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${Number(u.hint_count) >= 3 ? "text-green-400" : "text-stone-400"}`}>
                      {Number(u.hint_count).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${Number(u.claim_count) > 0 ? "text-amber-400" : "text-stone-400"}`}>
                      {Number(u.claim_count).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-300 text-sm">{Number(u.visit_count).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-stone-500 text-xs">
                    {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-500">
            Page {page + 1} of {totalPages} · {totalCount.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            {hasPrev ? (
              <Link href={pageUrl(page - 1)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white text-xs font-semibold rounded-lg transition-colors">
                ← Previous
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-stone-900 border border-stone-800 text-stone-600 text-xs font-semibold rounded-lg">
                ← Previous
              </span>
            )}

            {/* Page number pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : page < 4 ? i : page > totalPages - 5 ? totalPages - 7 + i : page - 3 + i;
                return (
                  <Link
                    key={p}
                    href={pageUrl(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-amber-400 text-stone-900" : "bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700"}`}
                  >
                    {p + 1}
                  </Link>
                );
              })}
            </div>

            {hasNext ? (
              <Link href={pageUrl(page + 1)} className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white text-xs font-semibold rounded-lg transition-colors">
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-stone-900 border border-stone-800 text-stone-600 text-xs font-semibold rounded-lg">
                Next →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
