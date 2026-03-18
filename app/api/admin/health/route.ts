import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const ADMIN_IDS = (process.env.ADMIN_USER_IDS || "").split(",").map(id => id.trim()).filter(Boolean);

async function checkSupabase(): Promise<{ ok: boolean; latency: number; message: string }> {
  const start = Date.now();
  try {
    const { error } = await supabaseAdmin.from("profiles").select("id").limit(1);
    const latency = Date.now() - start;
    if (error) return { ok: false, latency, message: error.message };
    return { ok: true, latency, message: "Connected" };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, message: String(e) };
  }
}

async function checkAnthropic(): Promise<{ ok: boolean; latency: number; message: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, latency: 0, message: "ANTHROPIC_API_KEY not set" };
  const start = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    const latency = Date.now() - start;
    if (!res.ok) return { ok: false, latency, message: `HTTP ${res.status}` };
    return { ok: true, latency, message: "Connected" };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, message: String(e) };
  }
}

async function checkResend(): Promise<{ ok: boolean; latency: number; message: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, latency: 0, message: "RESEND_API_KEY not set" };
  // Sending-only keys can't read account endpoints — verify by attempting a send
  // to a known-invalid address and treating any non-network-error as "key is valid"
  const start = Date.now();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "test@test.com", to: ["test@test.com"], subject: "ping", text: "ping" }),
    });
    const latency = Date.now() - start;
    // 401 = truly invalid key. Any other response (400, 422, 403) means key is valid
    // but the request itself was rejected (expected — we're not sending a real email)
    if (res.status === 401) return { ok: false, latency, message: "Invalid API key" };
    return { ok: true, latency, message: "Connected" };
  } catch (e) {
    return { ok: false, latency: Date.now() - start, message: String(e) };
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId || !ADMIN_IDS.includes(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [supabase, anthropic, resend] = await Promise.all([
    checkSupabase(),
    checkAnthropic(),
    checkResend(),
  ]);

  return NextResponse.json({ supabase, anthropic, resend, checkedAt: new Date().toISOString() });
}
