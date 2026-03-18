"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Eye, Copy, Check, Clock, Share2, ChevronDown, ChevronUp } from "lucide-react";
import type { Profile, Hint } from "@/lib/supabase";

const CATEGORIES = [
  { id: "general", label: "Into lately", placeholder: "I've been really into sourdough baking..." },
  { id: "love", label: "I love", placeholder: "I love fresh flowers, especially tulips..." },
  { id: "want", label: "Want", placeholder: "I've been wanting to try a standing desk..." },
  { id: "need", label: "Need", placeholder: "My headphones are finally dying..." },
  { id: "dream", label: "Dream", placeholder: "Someday I'd love to go to Japan..." },
  { id: "avoid", label: "Please no", placeholder: "No more candles or gift cards please..." },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} minutes ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function getCompletionItems(profile: Profile, hints: Hint[]) {
  return [
    { done: !!profile.name, label: "Add your display name", action: "/dashboard/edit" },
    { done: !!profile.bio, label: "Write a short bio", action: "/dashboard/edit" },
    { done: !!profile.birthday, label: "Add your birthday (so people know when to shop!)", action: "/dashboard/edit" },
    { done: hints.filter(h => h.category !== "avoid").length >= 3, label: "Add at least 3 hints", action: null },
    { done: hints.filter(h => h.category !== "avoid").length >= 8, label: "Add 8+ hints for the best recommendations", action: null },
  ];
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [recentVisits, setRecentVisits] = useState<{ created_at: string }[]>([]);
  const [newHint, setNewHint] = useState("");
  const [category, setCategory] = useState("general");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareKit, setShowShareKit] = useState(false);
  const [showVisitors, setShowVisitors] = useState(false);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    const res = await fetch("/api/me");
    const data = await res.json();
    if (data.redirect) { router.push("/onboarding"); return; }
    setProfile(data.profile);
    setHints(data.hints);
    setVisitCount(data.visitCount || 0);
    setClaimCount(data.claimCount || 0);
    setRecentVisits(data.recentVisits || []);
    setLoading(false);
  }

  async function addHint(e: React.FormEvent) {
    e.preventDefault();
    if (!newHint.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/hints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newHint.trim(), category }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add hint");
      setHints([data, ...hints]);
      setNewHint("");
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add — try again");
    } finally {
      setAdding(false);
    }
  }

  async function deleteHint(id: string) {
    if (!confirm("Delete this hint?")) return;
    await fetch(`/api/hints/${id}`, { method: "DELETE" });
    setHints(hints.filter((h) => h.id !== id));
  }

  async function copyLink() {
    if (!profile) return;
    const url = `${window.location.origin}/for/${profile.username}`;
    const isMobile = window.innerWidth < 768;
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: `${profile.name || profile.username}'s gift profile`,
          text: "Here's what I actually want — no more guessing!",
          url,
        });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function copyMessage(msg: string) {
    navigator.clipboard.writeText(msg);
    setCopiedMsg(msg);
    setTimeout(() => setCopiedMsg(null), 2000);
  }

  const profileUrl = profile ? `${typeof window !== "undefined" ? window.location.origin : "https://giftbutler.io"}/for/${profile.username}` : "";

  const shareMessages = profile ? [
    {
      label: "🎂 Birthday",
      msg: `My birthday is coming up! Here's what I actually want (I finally stopped saying 'anything is fine'): ${profileUrl}`,
    },
    {
      label: "🎄 Holidays",
      msg: `Holiday shopping for me just got easier — I made a gift profile with things I'll actually love: ${profileUrl}`,
    },
    {
      label: "💬 Anytime",
      msg: `Tired of getting asked 'what do you want?' — here's my actual answer: ${profileUrl}`,
    },
  ] : [];

  const completionItems = profile ? getCompletionItems(profile, hints) : [];
  const completionDone = completionItems.filter(i => i.done).length;
  const completionPct = Math.round((completionDone / completionItems.length) * 100);
  const nextStep = completionItems.find(i => !i.done);

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt="You" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-amber-400 flex items-center justify-center text-xs font-bold text-stone-900">
                  {profile?.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold text-stone-900">GiftButler</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/edit")}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
              aria-label="Edit profile"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : (
                <>
                  <Share2 className="w-4 h-4 md:hidden" />
                  <Copy className="w-4 h-4 hidden md:block" />
                </>
              )}
              {copied ? "Copied!" : "Share link"}
            </button>
          </div>
        </div>


        {/* Profile completion nudge */}
        {completionPct < 100 && nextStep && (
          <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-xs font-semibold text-stone-400 flex-shrink-0">{completionPct}%</span>
              </div>
              <p className="text-sm text-stone-600 truncate">
                Next: <span className="font-medium text-stone-800">{nextStep.label}</span>
              </p>
            </div>
            {nextStep.action && (
              <button
                onClick={() => router.push(nextStep.action!)}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex-shrink-0"
              >
                Add →
              </button>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <button
            onClick={() => setShowVisitors(!showVisitors)}
            className="bg-white border border-stone-200 rounded-2xl p-4 text-left hover:border-stone-300 transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Views</span>
            </div>
            <p className="text-2xl font-bold text-stone-900">{visitCount}</p>
            <p className="text-xs text-stone-400">30 days</p>
          </button>
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Hints</span>
            </div>
            <p className="text-2xl font-bold text-stone-900">{hints.length}</p>
            <p className="text-xs text-stone-400">on profile</p>
          </div>
          <div className={`rounded-2xl p-4 border ${claimCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-stone-200"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Gifts</span>
            </div>
            <p className={`text-2xl font-bold ${claimCount > 0 ? "text-amber-600" : "text-stone-900"}`}>{claimCount}</p>
            <p className="text-xs text-stone-400">claimed</p>
          </div>
        </div>

        {/* Recent visitors */}
        {showVisitors && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Recent visitors</p>
            {recentVisits.length === 0 ? (
              <p className="text-stone-400 text-sm">No visits yet — share your link to get started.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {recentVisits.map((v, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">A visitor</p>
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(v.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile link */}
        {profile && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-stone-400 mb-0.5">Your gift profile</p>
              <p className="text-stone-900 font-medium text-sm truncate">giftbutler.io/for/{profile.username}</p>
            </div>
            <button onClick={copyLink} className="text-xs text-amber-600 font-semibold hover:text-amber-700 flex-shrink-0 ml-2">
              {copied ? "Copied!" : <><span className="md:hidden">Share</span><span className="hidden md:inline">Copy</span></>}
            </button>
          </div>
        )}

        {/* Share kit */}
        <div className="bg-white border border-stone-200 rounded-2xl mb-6 overflow-hidden">
          <button
            onClick={() => setShowShareKit(!showShareKit)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-stone-800">Share kit — ready-to-send messages</span>
            </div>
            {showShareKit ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
          </button>
          {showShareKit && (
            <div className="px-4 pb-4 flex flex-col gap-3 border-t border-stone-100 pt-3">
              {shareMessages.map((item) => (
                <div key={item.label} className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1.5">{item.label}</p>
                  <p className="text-sm text-stone-700 leading-relaxed mb-2">{item.msg}</p>
                  <button
                    onClick={() => copyMessage(item.msg)}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                  >
                    {copiedMsg === item.msg ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy message</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add hint form */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-stone-700 mb-3">Drop a hint</p>
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
          <form onSubmit={addHint} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={newHint}
                onChange={(e) => setNewHint(e.target.value)}
                maxLength={280}
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
            </div>
            <div className="flex items-center justify-between px-1">
              {addError
                ? <p className="text-red-500 text-xs">{addError}</p>
                : <span />
              }
              {newHint.length > 0 && (
                <p className={`text-xs ml-auto ${newHint.length >= 260 ? "text-red-400" : "text-stone-400"}`}>
                  {280 - newHint.length} left
                </p>
              )}
            </div>
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
                <div className="min-w-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-1 inline-block ${
                    hint.category === "avoid" ? "bg-red-100 text-red-600" :
                    hint.category === "love" ? "bg-pink-100 text-pink-600" :
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
                  className="text-stone-300 hover:text-red-400 active:text-red-400 transition-colors flex-shrink-0 text-lg leading-none mt-0.5 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            onClick={() => window.open(`/for/${profile?.username}`, "_blank")}
            className="text-xs text-stone-400 hover:text-stone-600 underline"
          >
            Preview my public profile
          </button>
        </div>
      </div>
    </main>
  );
}
