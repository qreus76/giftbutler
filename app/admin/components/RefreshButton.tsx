"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-400 hover:text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
    >
      {refreshing ? "Refreshing..." : "↻ Refresh"}
    </button>
  );
}
