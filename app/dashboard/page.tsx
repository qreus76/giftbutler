"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, Hint } from "@/lib/supabase";

const CATEGORIES = [
  { id: "general", label: "Into lately", placeholder: "I've been really into sourdough baking..." },
  { id: "want", label: "Want", placeholder: "I've been wanting to try a standing desk..." },
  { id: "need", label: "Need", placeholder: "My headphones are finally dying..." },
  { id: "dream", label: "Dream", placeholder: "Someday I'd love to go to Japan..." },
  { id: "avoid", label: "Please no", placeholder: "No more candles or gift cards please..." },
];

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [newHint, setNewHint] = useState("");
  const [category, setCategory] = useState("general");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.redirect) { router.push("/onboarding"); return; }
    setProfile(data.profile);
    setHints(data.hints);
    setLoading(false);
  }

  async function addHint(e: React.FormEvent) {
    e.preventDefault();
    if (!newHint.trim()) return;
    setAdding(true);
    const res = await fetch("/api/hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newHint.trim(), category }),
    });
    const hint = await res.json();
    setHints([hint, ...hints]);
    setNewHint("");
    setAdding(false);
  }

  async function deleteHint(id: string) {
    await fetch(`/api/hints/${id}`, { method: "DELETE" });
    setHints(hints.filter((h) => h.id !== id));
  }

  function copyLink() {
    if (!profile) return;
    navigator.clipboard.writeText(`${window.location.origin}/for/${profile.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const profileUrl = profile ? `giftbutler.io/for/${profile.username}` : "";

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold text-stone-900">GiftButler</h1>
          <button
            onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors"
          >
            {copied ? "✓ Copied!" : `Share my link`}
          </button>
        </div>

        {/* Profile link banner */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-stone-400 mb-0.5">Your gift profile</p>
            <p className="text-stone-900 font-medium text-sm">{profileUrl}</p>
          </div>
          <button
            onClick={copyLink}
            className="text-xs text-amber-600 font-semibold hover:text-amber-700"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        {/* Add hint form */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-stone-700 mb-3">Drop a hint</p>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap mb-3">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${category === c.id ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <form onSubmit={addHint} className="flex gap-2">
            <input
              value={newHint}
              onChange={(e) => setNewHint(e.target.value)}
              placeholder={CATEGORIES.find(c => c.id === category)?.placeholder || "Add a hint..."}
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              disabled={!newHint.trim() || adding}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 text-stone-900 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              {adding ? "..." : "Add"}
            </button>
          </form>
        </div>

        {/* Hints feed */}
        <div className="flex flex-col gap-3">
          {hints.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <p className="text-4xl mb-3">💬</p>
              <p className="font-medium text-stone-600 mb-1">No hints yet</p>
              <p className="text-sm">Add your first hint above — what have you been into lately?</p>
            </div>
          ) : (
            hints.map((hint) => (
              <div key={hint.id} className="bg-white border border-stone-200 rounded-2xl px-4 py-3 flex items-start justify-between gap-3 group">
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-1 inline-block ${
                    hint.category === "avoid" ? "bg-red-100 text-red-600" :
                    hint.category === "want" ? "bg-blue-100 text-blue-600" :
                    hint.category === "need" ? "bg-green-100 text-green-600" :
                    hint.category === "dream" ? "bg-purple-100 text-purple-600" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {CATEGORIES.find(c => c.id === hint.category)?.label || hint.category}
                  </span>
                  <p className="text-stone-800 text-sm">{hint.content}</p>
                </div>
                <button
                  onClick={() => deleteHint(hint.id)}
                  className="text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-lg leading-none mt-0.5"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
