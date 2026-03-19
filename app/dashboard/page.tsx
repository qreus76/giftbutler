"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Eye, Clock, Users, UserPlus, MessageSquare, Pencil } from "lucide-react";
import type { Profile, Hint } from "@/lib/supabase";

const CATEGORIES = [
  { id: "general", label: "Into lately", placeholder: "I've been really into sourdough baking..." },
  { id: "love", label: "Love", placeholder: "Fresh flowers, especially tulips..." },
  { id: "like", label: "Like", placeholder: "I enjoy a good audiobook..." },
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
  const [recentVisits, setRecentVisits] = useState<{ created_at: string; device_type: string | null; referrer: string | null }[]>([]);
  const [newHint, setNewHint] = useState("");
  const [category, setCategory] = useState("general");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showVisitors, setShowVisitors] = useState(false);

  // Inline delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit hint state
  const [editingHintId, setEditingHintId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  // Follow requests
  const LABELS = ["Husband", "Wife", "Partner", "Dad", "Mom", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", "Grandson", "Granddaughter", "Uncle", "Aunt", "Nephew", "Niece", "Cousin", "Best Friend", "Friend", "Colleague", "Other"];
  const [followRequests, setFollowRequests] = useState<{ requester_id: string; name: string; username: string; avatar: string | null }[]>([]);
  const [requestLabels, setRequestLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      const res = await fetch("/api/me");
      const data = await res.json();
      if (data.redirect) { router.push("/onboarding"); return; }
      setProfile(data.profile);
      setHints(data.hints);
      setVisitCount(data.visitCount || 0);
      setClaimCount(data.claimCount || 0);
      setRecentVisits(data.recentVisits || []);

      // Load pending follow requests
      const reqRes = await fetch("/api/follows/requests");
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setFollowRequests(reqData.requests || []);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowRequest(requesterId: string, action: "accept" | "reject") {
    const label = requestLabels[requesterId] || null;
    await fetch("/api/follows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requester_id: requesterId, action, label }),
    });
    setFollowRequests(prev => prev.filter(r => r.requester_id !== requesterId));
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

  function startEditHint(hint: Hint) {
    setEditingHintId(hint.id);
    setEditContent(hint.content);
    setEditCategory(hint.category);
  }

  function cancelEdit() {
    setEditingHintId(null);
    setEditContent("");
    setEditCategory("general");
  }

  async function saveHint(id: string) {
    if (!editContent.trim()) return;
    setSaving(true);
    const prev = hints;
    setHints(hints.map(h => h.id === id ? { ...h, content: editContent.trim(), category: editCategory } : h));
    setEditingHintId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent.trim(), category: editCategory }),
      });
      if (!res.ok) setHints(prev);
    } catch {
      setHints(prev);
    } finally {
      setSaving(false);
    }
  }

  async function deleteHint(id: string) {
    const prev = hints;
    setHints(hints.filter((h) => h.id !== id));
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, { method: "DELETE" });
      if (!res.ok) setHints(prev);
    } catch {
      setHints(prev);
    }
  }

  function formatReferrer(referrer: string | null): string {
    if (!referrer) return "Direct visit";
    try {
      const host = new URL(referrer).hostname.replace("www.", "");
      if (host.includes("instagram")) return "From Instagram";
      if (host.includes("facebook") || host.includes("fb.")) return "From Facebook";
      if (host.includes("twitter") || host.includes("x.com")) return "From X / Twitter";
      if (host.includes("tiktok")) return "From TikTok";
      if (host.includes("snapchat")) return "From Snapchat";
      if (host.includes("pinterest")) return "From Pinterest";
      if (host.includes("giftbutler")) return "From GiftButler";
      return `From ${host}`;
    } catch {
      return "Shared link";
    }
  }

  function formatDevice(device: string | null): string {
    if (!device) return "";
    const map: Record<string, string> = { ios: "iPhone", android: "Android", tablet: "Tablet", mobile: "Mobile", desktop: "Desktop" };
    return map[device] || device;
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
      navigator.clipboard.writeText(url).catch(() => {
        alert("Unable to copy — please copy manually.");
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const profileUrl = profile ? `${typeof window !== "undefined" ? window.location.origin : "https://giftbutler.io"}/for/${profile.username}` : "";

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

  if (loadError) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-stone-600 font-medium mb-2">Something went wrong loading your dashboard.</p>
          <button onClick={() => { setLoadError(false); setLoading(true); loadProfile(); }} className="text-amber-600 font-semibold text-sm hover:text-amber-700">
            Try again →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-100 bg-white">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/my-people" className="text-base font-bold text-stone-900">GiftButler</a>
          <div className="flex items-center gap-2">
            <a href="/my-people" className="relative p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors">
              <Users className="w-5 h-5" />
              {followRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {followRequests.length}
                </span>
              )}
            </a>
            <button
              onClick={() => router.push("/dashboard/edit")}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Edit profile"
            >
              <Settings className="w-5 h-5" />
            </button>
            {profile?.username && (
              <a
                href={`/for/${profile.username}`}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs transition-colors"
              >
                My profile →
              </a>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">


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

        {/* Follow requests */}
        {followRequests.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl p-4 mb-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              People requests ({followRequests.length})
            </p>
            <div className="flex flex-col gap-4">
              {followRequests.map(req => (
                <div key={req.requester_id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {req.avatar ? (
                        <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-amber-400 flex items-center justify-center text-xs font-bold text-stone-900">
                          {req.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{req.name || req.username}</p>
                      <p className="text-xs text-stone-400">@{req.username} wants to join your people</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-stone-500 mb-2">Who are they to you?</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {LABELS.map(l => (
                      <button
                        key={l}
                        onClick={() => setRequestLabels(prev => ({ ...prev, [req.requester_id]: l }))}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${requestLabels[req.requester_id] === l ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFollowRequest(req.requester_id, "accept")}
                      disabled={!requestLabels[req.requester_id]}
                      className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-xl text-sm transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleFollowRequest(req.requester_id, "reject")}
                      className="px-4 py-2 border border-stone-200 text-stone-500 font-semibold rounded-xl text-sm hover:bg-stone-50 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                {recentVisits.map((v, i) => {
                  const source = formatReferrer(v.referrer);
                  const device = formatDevice(v.device_type);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-stone-800 truncate">
                          {source}{device ? ` · ${device}` : ""}
                        </p>
                        <p className="text-xs text-stone-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(v.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
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


        {/* Add hint form */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-stone-700 mb-3">Drop a hint</p>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${category === c.id ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
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
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">My Hints</p>
        <div className="flex flex-col gap-3">
          {hints.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <MessageSquare className="w-10 h-10 text-stone-300 mx-auto mb-3" />
              <p className="font-medium text-stone-600 mb-1">No hints yet</p>
              <p className="text-sm">Add your first hint above — what have you been into lately?</p>
            </div>
          ) : (
            hints.map((hint) => (
              <div key={hint.id} className="bg-white border border-stone-200 rounded-2xl px-4 py-3 group">
                {editingHintId === hint.id ? (
                  <div>
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {CATEGORIES.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setEditCategory(c.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${editCategory === c.id ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      maxLength={280}
                      autoFocus
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-amber-400 text-sm text-stone-900 focus:outline-none resize-none mb-2"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveHint(hint.id)}
                          disabled={!editContent.trim() || saving}
                          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 border border-stone-200 text-stone-500 font-semibold rounded-lg text-xs hover:bg-stone-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <span className={`text-xs ${editContent.length >= 260 ? "text-red-400" : "text-stone-400"}`}>
                        {280 - editContent.length} left
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-1 inline-block ${
                        hint.category === "avoid" ? "bg-red-100 text-red-600" :
                        hint.category === "love" ? "bg-pink-100 text-pink-600" :
                        hint.category === "like" ? "bg-sky-100 text-sky-600" :
                        hint.category === "want" ? "bg-blue-100 text-blue-600" :
                        hint.category === "need" ? "bg-green-100 text-green-600" :
                        hint.category === "dream" ? "bg-purple-100 text-purple-600" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {CATEGORIES.find(c => c.id === hint.category)?.label || hint.category}
                      </span>
                      <p className="text-stone-800 text-sm">{hint.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {confirmDeleteId === hint.id ? (
                        <>
                          <button
                            onClick={() => deleteHint(hint.id)}
                            className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 border border-stone-200 text-stone-400 text-xs font-semibold rounded-lg hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEditHint(hint)}
                            aria-label="Edit hint"
                            className="p-1 text-stone-300 hover:text-amber-500 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(hint.id)}
                            aria-label="Delete hint"
                            className="p-1 text-stone-300 hover:text-red-400 transition-colors text-lg leading-none"
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <a href="/my-people" className="relative text-xs text-stone-400 hover:text-stone-600 transition-colors">
            My People
            {followRequests.length > 0 && (
              <span className="absolute -top-1 -right-3 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {followRequests.length}
              </span>
            )}
          </a>
          <button
            onClick={() => window.open(`/for/${profile?.username}`, "_blank")}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
          >
            View my profile
          </button>
        </div>
      </div>
    </main>
  );
}
