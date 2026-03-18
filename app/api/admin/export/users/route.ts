import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);

export async function GET() {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.rpc("admin_user_list", {
    search_term: "",
    page_num: 0,
    page_size: 100000,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const header = ["id", "username", "name", "hint_count", "claim_count", "visit_count", "created_at"];

  function csvEscape(val: unknown): string {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  const lines = [
    header.join(","),
    ...rows.map((u: Record<string, unknown>) =>
      header.map((col) => csvEscape(u[col])).join(",")
    ),
  ];

  const csv = lines.join("\n");
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="giftbutler-users-${date}.csv"`,
    },
  });
}
