import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("occasions").delete().eq("id", id).eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ success: true });
}
