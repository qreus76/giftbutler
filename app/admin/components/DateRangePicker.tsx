"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const OPTIONS = [
  { label: "7d",  value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
  { label: "1y",  value: 365 },
];

export default function DateRangePicker({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(d: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", String(d));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1 bg-[#F0F0E8] border border-[#E0E0D8] rounded-xl p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => navigate(opt.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            days === opt.value
              ? "bg-[#111111] text-white"
              : "text-[#888888] hover:text-[#111111]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
