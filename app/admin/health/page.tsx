"use client";

import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface ServiceStatus {
  ok: boolean;
  latency: number;
  message: string;
}

interface HealthData {
  supabase: ServiceStatus;
  anthropic: ServiceStatus;
  resend: ServiceStatus;
  checkedAt: string;
}

function ServiceRow({ name, status }: { name: string; status: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[#F0F0E8] last:border-0">
      <div className="flex items-center gap-3">
        {status.ok
          ? <CheckCircle className="w-5 h-5 text-[#4A7C59] flex-shrink-0" />
          : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
        }
        <div>
          <p className="font-semibold text-[#111111] text-sm">{name}</p>
          <p className="text-xs text-[#888888] mt-0.5">{status.message}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        {status.latency > 0 && (
          <p className="text-xs text-[#888888]">{status.latency}ms</p>
        )}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.ok ? "bg-[#C4D4B4] text-[#2D4A1E]" : "bg-red-100 text-red-700"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.ok ? "bg-[#4A7C59]" : "bg-red-500"}`} />
          {status.ok ? "Operational" : "Down"}
        </span>
      </div>
    </div>
  );
}

export default function AdminHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function check() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/health");
      if (!res.ok) throw new Error("Failed to fetch health status");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { check(); }, []);

  const allOk = data ? data.supabase.ok && data.anthropic.ok && data.resend.ok : false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Health</h1>
          {data && (
            <p className="text-[#888888] text-sm mt-0.5">
              Last checked {new Date(data.checkedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {data && (
            <span className={`text-sm font-semibold hidden sm:block ${allOk ? "text-[#4A7C59]" : "text-red-500"}`}>
              {allOk ? "All systems operational" : "Issues detected"}
            </span>
          )}
          <button
            onClick={check}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white text-sm font-semibold rounded-full transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Checking..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="bg-white rounded-2xl shadow-card p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <>
          {/* Status banner */}
          <div className={`rounded-2xl p-4 flex items-center gap-3 ${allOk ? "bg-[#C4D4B4]/40 border border-[#C4D4B4]" : "bg-red-50 border border-red-200"}`}>
            {allOk
              ? <CheckCircle className="w-5 h-5 text-[#4A7C59] flex-shrink-0" />
              : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            }
            <p className={`font-semibold text-sm ${allOk ? "text-[#2D4A1E]" : "text-red-700"}`}>
              {allOk ? "All systems operational" : "One or more services are down"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card px-5">
            <ServiceRow name="Supabase (Database)"  status={data.supabase} />
            <ServiceRow name="Anthropic (Claude AI)" status={data.anthropic} />
            <ServiceRow name="Resend (Email)"        status={data.resend} />
          </div>
        </>
      )}
    </div>
  );
}
