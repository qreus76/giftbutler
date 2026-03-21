"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function RefreshButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 1200);
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#888888] hover:text-[#111111] text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-card"
    >
      <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
      {refreshing ? "Refreshing..." : "Refresh"}
    </button>
  );
}
