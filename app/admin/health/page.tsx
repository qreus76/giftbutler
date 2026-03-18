"use client";

import { useEffect, useState } from "react";

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

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ok ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-green-400" : "bg-red-400"}`} />
      {ok ? "Operational" : "Down"}
    </span>
  );
}

function ServiceRow({ name, status }: { name: string; status: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-stone-800 last:border-0">
      <div>
        <p className="font-medium text-white">{name}</p>
        <p className="text-xs text-stone-500 mt-0.5">{status.message}</p>
      </div>
      <div className="flex items-center gap-4">
        {status.latency > 0 && (
          <p className="text-xs text-stone-500">{status.latency}ms</p>
        )}
        <StatusBadge ok={status.ok} />
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
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Health</h1>
          {data && (
            <p className="text-stone-500 text-sm mt-1">
              Last checked {new Date(data.checkedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className={`text-sm font-semibold ${allOk ? "text-green-400" : "text-red-400"}`}>
              {allOk ? "All systems operational" : "Issues detected"}
            </span>
          )}
          <button
            onClick={check}
            disabled={loading}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Checking..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && !data && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl px-6">
          <ServiceRow name="Supabase (Database)" status={data.supabase} />
          <ServiceRow name="Anthropic (Claude AI)" status={data.anthropic} />
          <ServiceRow name="Resend (Email)" status={data.resend} />
        </div>
      )}
    </div>
  );
}
