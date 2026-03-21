import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { ExternalLink } from "lucide-react";

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Users</h1>
          <p className="text-[#888888] text-sm mt-0.5">
            {totalCount.toLocaleString()} user{totalCount !== 1 ? "s" : ""}
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/admin/export/users"
            className="px-3 py-2 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#888888] hover:text-[#111111] text-xs font-semibold rounded-xl transition-colors shadow-card"
          >
            Export CSV
          </a>
          <form method="GET">
            {page > 0 && <input type="hidden" name="page" value="0" />}
            <input
              name="search"
              defaultValue={searchTerm}
              placeholder="Search username or name..."
              className="px-4 py-2 bg-white border border-[#E0E0D8] rounded-xl text-sm text-[#111111] placeholder-[#CCCCCC] focus:outline-none focus:border-[#111111] shadow-card w-56"
            />
          </form>
        </div>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card p-8 text-center">
          <p className="text-[#888888] text-sm">No users found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F0F0E8]">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wide">User</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wide">Hints</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wide">Claims</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wide">Views (30d)</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-[#888888] uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-[#F0F0E8] last:border-0 hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/for/${u.username}`} target="_blank" className="group flex items-center gap-1.5">
                        <div>
                          <p className="font-semibold text-[#111111] group-hover:text-[#C4824A] transition-colors">{u.name || u.username}</p>
                          <p className="text-xs text-[#888888]">@{u.username}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-[#CCCCCC] group-hover:text-[#C4824A] transition-colors flex-shrink-0" />
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-semibold ${Number(u.hint_count) >= 5 ? "text-[#4A7C59]" : Number(u.hint_count) >= 1 ? "text-[#C4824A]" : "text-[#CCCCCC]"}`}>
                        {Number(u.hint_count).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`text-sm font-semibold ${Number(u.claim_count) > 0 ? "text-[#111111]" : "text-[#CCCCCC]"}`}>
                        {Number(u.claim_count).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-[#888888]">{Number(u.visit_count).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-xs text-[#CCCCCC]">
                      {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-[#F0F0E8]">
            {users.map((u) => (
              <Link key={u.id} href={`/for/${u.username}`} target="_blank"
                className="flex items-center justify-between px-4 py-3 hover:bg-[#FAFAF8] transition-colors">
                <div>
                  <p className="font-semibold text-[#111111] text-sm">{u.name || u.username}</p>
                  <p className="text-xs text-[#888888]">@{u.username}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-[#888888]">
                    <span className={`font-semibold ${Number(u.hint_count) >= 5 ? "text-[#4A7C59]" : "text-[#C4824A]"}`}>{Number(u.hint_count)}</span> hints
                    {Number(u.claim_count) > 0 && <> · <span className="font-semibold text-[#111111]">{Number(u.claim_count)}</span> claims</>}
                  </p>
                  <p className="text-xs text-[#CCCCCC] mt-0.5">{new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[#888888]">
            Page {page + 1} of {totalPages} · {totalCount.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            {hasPrev ? (
              <Link href={pageUrl(page - 1)} className="px-3 py-1.5 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#111111] text-xs font-semibold rounded-xl transition-colors shadow-card">
                ← Prev
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-white border border-[#E0E0D8] text-[#CCCCCC] text-xs font-semibold rounded-xl">← Prev</span>
            )}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : page < 4 ? i : page > totalPages - 5 ? totalPages - 7 + i : page - 3 + i;
                return (
                  <Link
                    key={p}
                    href={pageUrl(p)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${p === page ? "bg-[#111111] text-white" : "bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#888888]"}`}
                  >
                    {p + 1}
                  </Link>
                );
              })}
            </div>
            {hasNext ? (
              <Link href={pageUrl(page + 1)} className="px-3 py-1.5 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#111111] text-xs font-semibold rounded-xl transition-colors shadow-card">
                Next →
              </Link>
            ) : (
              <span className="px-3 py-1.5 bg-white border border-[#E0E0D8] text-[#CCCCCC] text-xs font-semibold rounded-xl">Next →</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
