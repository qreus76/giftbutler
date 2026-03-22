"use client";

import { useState } from "react";
import { Lock, ArrowRight, Check, Clock } from "lucide-react";

const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];

interface Props {
  displayName: string;
  username: string;
  avatarUrl: string | null;
  hintCount: number;
  connectionStatus: "unauthenticated" | "none" | "pending";
}

export default function LockedProfile({ displayName, username, avatarUrl, hintCount, connectionStatus }: Props) {
  const [selectedLabel, setSelectedLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(connectionStatus === "pending");
  const [requestError, setRequestError] = useState("");

  async function requestAccess() {
    if (!selectedLabel) return;
    setSending(true);
    setRequestError("");
    const res = await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, label: selectedLabel }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setRequestError(data.error || "Failed to send request — try again");
    }
  }

  return (
    <main className="min-h-screen bg-[#EAEAE0] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5">

        {/* Profile teaser */}
        <div className="bg-white rounded-2xl shadow-card p-6 text-center">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-4 flex-shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[#2D4A1E] bg-[#C4D4B4]">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#111111] mb-1">{displayName}</h1>
          <div className="inline-flex items-center gap-1.5 bg-[#F0F0E8] px-3 py-1 rounded-full mb-4">
            <Lock className="w-3.5 h-3.5 text-[#888888]" />
            <span className="text-xs font-semibold text-[#888888]">Private wishlist</span>
          </div>
          <p className="text-[#888888] text-sm leading-relaxed">
            {displayName} has <span className="font-bold text-[#111111]">{hintCount} {hintCount === 1 ? "hint" : "hints"}</span> on their wishlist — but only their connections can see them.
          </p>
        </div>

        {/* CTA */}
        {connectionStatus === "unauthenticated" ? (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-sm font-bold text-[#111111] text-center">Create a free account to request access</p>
            <a
              href={`/sign-up?redirect_url=/for/${username}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors"
            >
              Get started — it&apos;s free <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href={`/sign-in?redirect_url=/for/${username}`}
              className="w-full flex items-center justify-center py-2.5 text-[#888888] text-sm font-semibold hover:text-[#111111] transition-colors"
            >
              Already have an account? Sign in
            </a>
          </div>
        ) : sent ? (
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#888888]">
              <Clock className="w-4 h-4" />
              Request sent — waiting for {displayName} to confirm
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-4">
            <p className="text-sm font-bold text-[#111111]">Who is {displayName} to you?</p>
            <div className="flex flex-wrap gap-1.5">
              {LABELS.map(l => (
                <button key={l} onClick={() => setSelectedLabel(l)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-[#111111] border-[#111111] text-white" : "bg-white border-[#E0E0D8] text-[#111111] hover:border-[#111111]"}`}>
                  {l}
                </button>
              ))}
            </div>
            <button
              onClick={requestAccess}
              disabled={!selectedLabel || sending}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] disabled:text-[#888888] text-white font-bold rounded-full text-sm transition-colors"
            >
              {sending ? "Sending..." : <><Check className="w-4 h-4" /> Request access</>}
            </button>
            {requestError && <p className="text-red-500 text-xs text-center">{requestError}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
