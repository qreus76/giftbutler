"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Share, Cake, Pencil, X, ArrowRight } from "lucide-react";
import BottomTabBar from "@/app/components/BottomTabBar";
import { useUser } from "@clerk/nextjs";
import type { Profile, Hint } from "@/lib/supabase";
import { getDaysUntilBirthday } from "@/lib/utils";

interface GiftRecommendation {
  title: string;
  why: string;
  priceRange: string;
  searchUrl: string;
  category: "product" | "experience" | "subscription" | "consumable";
}

const GIFT_CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  product: "Products",
  experience: "Experiences",
  subscription: "Subscriptions",
  consumable: "Consumables",
};

interface ClaimRecord { description: string; occasion: string | null; }

const CATEGORIES = {
  general: { label: "Into lately",  color: "bg-[#C4D4B4] text-[#2D4A1E]" },
  love:    { label: "Love",          color: "bg-red-100 text-red-700" },
  like:    { label: "Like",          color: "bg-[#B8CED0] text-[#1A3D42]" },
  want:    { label: "Want",          color: "bg-blue-100 text-blue-700" },
  need:    { label: "Need",          color: "bg-emerald-100 text-emerald-700" },
  dream:   { label: "Dream",         color: "bg-purple-100 text-purple-700" },
  style:   { label: "My Style",      color: "bg-[#ECC8AE] text-[#5C3118]" },
  avoid:   { label: "Please no",     color: "bg-red-100 text-red-700" },
};

const HINT_CATEGORIES = [
  { id: "general", label: "Into lately",  placeholder: "I've been really into sourdough baking..." },
  { id: "love",    label: "Love",          placeholder: "Fresh flowers, especially tulips..." },
  { id: "like",    label: "Like",          placeholder: "I enjoy a good audiobook..." },
  { id: "want",    label: "Want",          placeholder: "I've been wanting to try a standing desk..." },
  { id: "need",    label: "Need",          placeholder: "My headphones are finally dying..." },
  { id: "dream",   label: "Dream",         placeholder: "Someday I'd love to go to Japan..." },
  { id: "style",   label: "My Style",      placeholder: "I wear a medium, prefer minimalist design..." },
  { id: "avoid",   label: "Please no",     placeholder: "No more candles or gift cards please..." },
];

const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];

interface Props {
  username: string;
  initialProfile: Profile;
  initialHints: Hint[];
  initialClaims: ClaimRecord[];
  avatarUrl: string | null;
}

export default function ProfileClient({ username, initialProfile, initialHints, initialClaims, avatarUrl }: Props) {
  const { user, isLoaded } = useUser();
  const isOwner = !!user && user.id === initialProfile.id;

  const [profile] = useState<Profile>(initialProfile);
  const [hints, setHints] = useState<Hint[]>(initialHints);

  const STORAGE_KEY = `gb_recs_${username}`;
  const relationshipRef = useRef<HTMLSelectElement>(null);

  const [showFinder, setShowFinder] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [budget, setBudget] = useState("");
  const [occasion, setOccasion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [recommendations, setRecommendations] = useState<GiftRecommendation[]>([]);
  const [myClaims, setMyClaims] = useState<string[]>([]);
  const [existingClaims, setExistingClaims] = useState<ClaimRecord[]>(initialClaims);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [notifyPromptTitle, setNotifyPromptTitle] = useState<string | null>(null);
  const [notifySent, setNotifySent] = useState<Set<string>>(new Set());
  const [myUsername, setMyUsername] = useState("");

  const [newHint, setNewHint] = useState("");
  const [hintCategory, setHintCategory] = useState("general");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [editingHintId, setEditingHintId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [hintSaving, setHintSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [followLoading, setFollowLoading] = useState(false);

  async function shareProfile() {
    const url = `${window.location.origin}/for/${username}`;
    const shareText = isOwner ? `Check out my gift profile on GiftButler!` : `Check out ${displayName}'s gift profile on GiftButler!`;
    if (navigator.share && navigator.maxTouchPoints > 0) {
      try { await navigator.share({ title: `${displayName}'s Gift Profile`, text: shareText, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  useEffect(() => {
    if (!isLoaded) return;
    if (!isOwner) fetch(`/api/profile/${username}?ref=${encodeURIComponent(document.referrer || "")}`);
  }, [username, isOwner, isLoaded]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (isOwner) {
      setMyUsername(username);
    } else {
      fetch(`/api/follows?username=${username}`).then(r => r.json()).then(d => { if (d.status) setFollowStatus(d.status); });
      fetch("/api/me").then(r => r.json()).then(d => { if (d.profile?.username) setMyUsername(d.profile.username); });
    }
  }, [username, isLoaded, user, isOwner]);

  async function sendFollowRequest() {
    if (!selectedLabel) return;
    setFollowLoading(true);
    await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, label: selectedLabel }) });
    setFollowStatus("pending");
    setShowLabelPicker(false);
    setFollowLoading(false);
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { recommendations: recs, myClaims: claims, relationship: rel, budget: bud, occasion: occ } = JSON.parse(saved);
        if (recs?.length) { setRecommendations(recs); setMyClaims(claims || []); setRelationship(rel || ""); setBudget(bud || ""); setOccasion(occ || ""); }
      }
    } catch { /* unavailable */ }
  }, [STORAGE_KEY]);

  async function generateGifts() {
    if (!relationship || !budget) return;
    setGenerating(true); setGenerateError(""); setRecommendations([]); setCategoryFilter("all"); setShowAllRecs(false);
    try {
      const res = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, relationship, budget, occasion }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      if (!data.recommendations?.length) throw new Error("No recommendations returned");
      setRecommendations(data.recommendations);
      setShowFinder(false);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ recommendations: data.recommendations, myClaims, relationship, budget, occasion })); } catch { /* unavailable */ }
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally { setGenerating(false); }
  }

  function claimGift(title: string) {
    if (claiming) return;
    setClaiming(title);
    const newClaims = [...myClaims, title];
    setMyClaims(newClaims);
    setExistingClaims([...existingClaims, { description: title.toLowerCase(), occasion: occasion || null }]);
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) { const data = JSON.parse(saved); sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, myClaims: newClaims })); }
    } catch { /* unavailable */ }
    fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_username: username, gift_description: title, occasion }) })
      .catch(() => {}).finally(() => { setClaiming(null); setNotifyPromptTitle(title); });
  }

  async function sendNotify() {
    if (!notifyPromptTitle) return;
    setNotifySent(prev => new Set(prev).add(notifyPromptTitle));
    setNotifyPromptTitle(null);
    await fetch("/api/claims/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_username: username, occasion }) });
  }

  async function addHint(e: React.FormEvent) {
    e.preventDefault();
    if (!newHint.trim()) return;
    setAdding(true); setAddError("");
    try {
      const res = await fetch("/api/hints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: newHint.trim(), category: hintCategory }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add hint");
      setHints([data, ...hints]); setNewHint("");
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add — try again");
    } finally { setAdding(false); }
  }

  function startEditHint(hint: Hint) { setEditingHintId(hint.id); setEditContent(hint.content); setEditCategory(hint.category); }
  function cancelEditHint() { setEditingHintId(null); setEditContent(""); setEditCategory("general"); }

  async function saveHint(id: string) {
    if (!editContent.trim()) return;
    setHintSaving(true);
    const prev = hints;
    setHints(hints.map(h => h.id === id ? { ...h, content: editContent.trim(), category: editCategory } : h));
    setEditingHintId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editContent.trim(), category: editCategory }) });
      if (!res.ok) setHints(prev);
    } catch { setHints(prev); } finally { setHintSaving(false); }
  }

  async function deleteHint(id: string) {
    const prev = hints;
    setHints(hints.filter(h => h.id !== id)); setConfirmDeleteId(null);
    try { const res = await fetch(`/api/hints/${id}`, { method: "DELETE" }); if (!res.ok) setHints(prev); } catch { setHints(prev); }
  }

  function isAlreadyClaimed(title: string): boolean {
    return existingClaims.some(c => c.description === title.toLowerCase() && (!c.occasion || !occasion || c.occasion === occasion));
  }

  const hintsToShow = hints.filter(h => h.category !== "avoid");
  const avoidHints = hints.filter(h => h.category === "avoid");
  const daysUntilBirthday = profile.birthday ? getDaysUntilBirthday(profile.birthday) : null;
  const displayName = profile.name || username;
  const showFixedCTA = !isOwner && recommendations.length === 0 && !showFinder;

  return (
    <main className="min-h-screen bg-[#EAEAE0]" style={{ paddingBottom: showFixedCTA ? "calc(5rem + env(safe-area-inset-bottom,0px))" : "5rem" }}>

      {/* Minimal light header */}
      <header className="bg-[#EAEAE0] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={user ? "/home" : "/"} className="text-lg font-bold text-[#111111] tracking-tight">
            GiftButler
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && !user && (
              <Link href="/sign-up" className="px-4 py-1.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                Sign up
              </Link>
            )}
            {isLoaded && user && (
              <Link href="/profile/edit" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[#111111] transition-all flex-shrink-0">
                {user.hasImage ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#2D4A1E] bg-[#C4D4B4]">{user.firstName?.[0]?.toUpperCase() || "?"}</div>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Profile section */}
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Circular avatar */}
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 shadow-card">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#2D4A1E] bg-[#C4D4B4]">
                {profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-bold text-[#111111] leading-tight">{displayName}</h1>
            <p className="text-[#888888] text-sm">@{username}</p>
            {profile.bio && <p className="text-[#555555] text-sm mt-1.5 leading-relaxed">{profile.bio}</p>}
            {hintsToShow.length > 0 && (
              <p className="text-xs text-[#888888] mt-1">{hintsToShow.length} hints</p>
            )}
          </div>
        </div>

        {/* Birthday badge */}
        {daysUntilBirthday !== null && daysUntilBirthday <= 60 && (
          <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-[#ECC8AE] rounded-full text-xs font-semibold text-[#5C3118]">
            <Cake className="w-3.5 h-3.5" />
            {daysUntilBirthday === 0 ? "Birthday today! 🎉" : daysUntilBirthday === 1 ? "Birthday tomorrow!" : `Birthday in ${daysUntilBirthday} days`}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <>
              <button onClick={shareProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                <Share className="w-3.5 h-3.5" />
                {shareCopied ? "Copied!" : "Share profile"}
              </button>
              <Link href="/profile/edit"
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm border border-[#E0E0D8] transition-colors shadow-card">
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Link>
            </>
          )}

          {isLoaded && user && !isOwner && (
            <>
              {followStatus === "none" && !showLabelPicker && (
                <button onClick={() => setShowLabelPicker(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                  + Add to my people
                </button>
              )}
              {followStatus === "pending" && <span className="px-4 py-2 bg-white text-[#888888] font-semibold rounded-full text-sm border border-[#E0E0D8]">Request sent</span>}
              {followStatus === "accepted" && <span className="px-4 py-2 bg-[#C4D4B4] text-[#2D4A1E] font-semibold rounded-full text-sm">✓ In my people</span>}
              <button onClick={shareProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm border border-[#E0E0D8] transition-colors shadow-card">
                <Copy className="w-3.5 h-3.5" />
                {shareCopied ? "Copied!" : "Share"}
              </button>
            </>
          )}
          {isLoaded && !user && (
            <button onClick={shareProfile}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm border border-[#E0E0D8] transition-colors shadow-card">
              <Copy className="w-3.5 h-3.5" />
              {shareCopied ? "Copied!" : "Share"}
            </button>
          )}
        </div>

        {/* Label picker */}
        {showLabelPicker && (
          <div className="mt-4 bg-white rounded-2xl p-4 shadow-card">
            <p className="text-sm font-bold text-[#111111] mb-3">Who is {displayName} to you?</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {LABELS.map(l => (
                <button key={l} onClick={() => setSelectedLabel(l)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-[#111111] border-[#111111] text-white" : "bg-white border-[#E0E0D8] text-[#111111] hover:border-[#111111]"}`}>
                  {l}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={sendFollowRequest} disabled={!selectedLabel || followLoading}
                className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors">
                {followLoading ? "Sending..." : "Send request"}
              </button>
              <button onClick={() => { setShowLabelPicker(false); setSelectedLabel(""); }}
                className="px-4 py-2.5 bg-[#F0F0E8] hover:bg-[#E0E0D8] text-[#111111] font-semibold rounded-full text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-xl mx-auto px-4 space-y-4">

        {/* Education banner */}
        {!isOwner && hintsToShow.length > 0 && recommendations.length === 0 && !showFinder && (() => {
          try { return !sessionStorage.getItem(`gb_recs_${username}`); } catch { return true; }
        })() && (
          <div className="bg-[#B8CED0] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#1A3D42] mb-1">✨ GiftButler AI</p>
            <p className="text-[#1A3D42] text-sm leading-relaxed">
              {displayName} dropped {hintsToShow.length} hints about their interests. Our AI reads them all together to suggest gifts they&apos;d genuinely love.
            </p>
          </div>
        )}

        {/* Gift Finder */}
        {showFinder && recommendations.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#111111]">Find the perfect gift</h2>
              <button onClick={() => setShowFinder(false)} className="p-1.5 bg-[#F0F0E8] rounded-full text-[#888888] hover:text-[#111111]"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-col gap-4 mb-5">
              {[
                { label: "I'm their", value: relationship, onChange: (v: string) => setRelationship(v), ref: relationshipRef, placeholder: "Select relationship...", options: [
                  { group: "Partner", items: [["husband","Husband"],["wife","Wife"],["partner","Partner"]] },
                  { group: "Family", items: [["dad","Dad"],["mom","Mom"],["son","Son"],["daughter","Daughter"],["brother","Brother"],["sister","Sister"],["grandfather","Grandfather"],["grandmother","Grandmother"],["grandson","Grandson"],["granddaughter","Granddaughter"],["uncle","Uncle"],["aunt","Aunt"],["nephew","Nephew"],["niece","Niece"],["cousin","Cousin"]] },
                  { group: "Friends & Others", items: [["best friend","Best Friend"],["friend","Friend"],["colleague","Colleague"],["other","Other"]] },
                ]},
              ].map(field => (
                <div key={field.label}>
                  <label className="text-xs font-bold text-[#888888] mb-1.5 block uppercase tracking-wide">{field.label}</label>
                  <select ref={field.ref as React.Ref<HTMLSelectElement>} value={field.value} onChange={e => field.onChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]">
                    <option value="">{field.placeholder}</option>
                    {field.options.map(og => (
                      <optgroup key={og.group} label={og.group}>
                        {og.items.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-[#888888] mb-1.5 block uppercase tracking-wide">Budget</label>
                <select value={budget} onChange={e => setBudget(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]">
                  <option value="">Select budget...</option>
                  <option value="under $25">Under $25</option>
                  <option value="$25-$50">$25 – $50</option>
                  <option value="$50-$100">$50 – $100</option>
                  <option value="$100-$200">$100 – $200</option>
                  <option value="over $200">$200+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#888888] mb-1.5 block uppercase tracking-wide">Occasion <span className="font-normal text-[#CCCCCC] normal-case">(optional)</span></label>
                <select value={occasion} onChange={e => setOccasion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]">
                  <option value="">Select occasion...</option>
                  <option value="birthday">Birthday</option>
                  <option value="holiday">Holiday</option>
                  <option value="anniversary">Anniversary</option>
                  <option value="Mother's Day">Mother&apos;s Day</option>
                  <option value="Father's Day">Father&apos;s Day</option>
                  <option value="graduation">Graduation</option>
                  <option value="just because">Just Because</option>
                </select>
              </div>
            </div>
            {generateError && <p className="text-red-600 text-sm mb-3">{generateError}</p>}
            <button onClick={generateGifts} disabled={!relationship || !budget || generating}
              className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2">
              {generating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Finding the perfect gift...
                </>
              ) : generateError ? "Try again" : <><span>Generate gift ideas</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (() => {
          const availableCategories = ["all", ...Array.from(new Set(recommendations.map(r => r.category)))];
          const filtered = categoryFilter === "all" ? recommendations : recommendations.filter(r => r.category === categoryFilter);
          const visible = showAllRecs ? filtered : filtered.slice(0, 5);
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-[#111111]">Gift ideas for {displayName}</h2>
                <span className="text-xs text-[#888888]">{filtered.length} ideas</span>
              </div>
              {availableCategories.length > 2 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                  {availableCategories.map(cat => (
                    <button key={cat} onClick={() => { setCategoryFilter(cat); setShowAllRecs(false); }}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${categoryFilter === cat ? "bg-[#111111] text-white" : "bg-white text-[#111111] shadow-card hover:bg-[#F0F0E8]"}`}>
                      {GIFT_CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3">
                {visible.map((rec, i) => {
                  const alreadyClaimed = isAlreadyClaimed(rec.title);
                  const iMineThis = myClaims.includes(rec.title);
                  return (
                    <div key={i} className={`bg-white rounded-2xl shadow-card p-4 ${alreadyClaimed && !iMineThis ? "ring-1 ring-emerald-300" : ""}`}>
                      <h3 className="font-semibold text-[#111111] text-sm leading-snug mb-1">{rec.title}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base font-bold text-[#111111]">{rec.priceRange}</span>
                        <span className="text-xs text-[#888888]">· {rec.category}</span>
                        {alreadyClaimed && !iMineThis && <span className="text-xs font-semibold text-emerald-700 bg-[#C4D4B4] px-2 py-0.5 rounded-full">Someone&apos;s on it</span>}
                      </div>
                      <p className="text-[#888888] text-xs leading-relaxed mb-3">{rec.why}</p>
                      <div className="flex flex-col gap-2">
                        <a href={rec.searchUrl} target="_blank" rel="noopener noreferrer"
                          className="w-full py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm text-center transition-colors flex items-center justify-center gap-1.5">
                          Find this gift <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={() => claimGift(rec.title)} disabled={iMineThis || alreadyClaimed || claiming === rec.title}
                          className="w-full py-2.5 bg-[#C4D4B4] hover:bg-[#B4C8A4] disabled:bg-[#EAEAE0] disabled:text-[#888888] text-[#2D4A1E] font-bold rounded-full text-sm transition-colors">
                          {iMineThis ? "✓ Getting this" : alreadyClaimed ? "✓ Taken" : "I'm getting this"}
                        </button>
                      </div>
                      {notifyPromptTitle === rec.title && (
                        <div className="mt-3 pt-3 border-t border-[#F0F0E8] flex items-center justify-between gap-3">
                          <p className="text-xs text-[#888888]">Let {displayName} know something&apos;s on the way?</p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={sendNotify} className="px-3 py-1.5 bg-[#ECC8AE] text-[#5C3118] font-bold rounded-full text-xs">Send hint</button>
                            <button onClick={() => setNotifyPromptTitle(null)} className="px-3 py-1.5 bg-[#F0F0E8] text-[#888888] font-semibold rounded-full text-xs">Keep secret</button>
                          </div>
                        </div>
                      )}
                      {notifySent.has(rec.title) && <p className="mt-2 text-xs text-emerald-600 font-semibold">✓ Hint sent</p>}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 space-y-2">
                {!showAllRecs && filtered.length > 5 && (
                  <button onClick={() => setShowAllRecs(true)} className="w-full py-2.5 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm shadow-card transition-colors">
                    See all {filtered.length} results
                  </button>
                )}
                <button onClick={() => { setRecommendations([]); setGenerateError(""); setShowFinder(true); setCategoryFilter("all"); setShowAllRecs(false); try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => relationshipRef.current?.focus(), 400); }}
                  className="w-full py-2.5 bg-white hover:bg-[#F0F0E8] text-[#888888] font-semibold rounded-full text-sm shadow-card transition-colors">
                  Refine search
                </button>
              </div>
            </div>
          );
        })()}

        {/* Sign-up CTA for visitors */}
        {isLoaded && !user && (recommendations.length > 0 || showFinder) && (
          <div className="bg-[#ECC8AE] rounded-2xl p-5 text-center">
            <p className="text-[#111111] font-bold text-sm mb-1">Create your own gift profile — free</p>
            <p className="text-[#5C3118] text-xs mb-4">Share your link. Get gifts you actually want.</p>
            <a href="/sign-up" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
              Get started <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* Drop a hint (owner) */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-base font-bold text-[#111111] mb-0.5">Drop a hint</p>
            <p className="text-xs text-[#888888] mb-4">The AI reads all your hints together to find gifts people know you&apos;ll love.</p>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
              {HINT_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setHintCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 ${hintCategory === c.id ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <form onSubmit={addHint} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input value={newHint} onChange={e => setNewHint(e.target.value)} maxLength={280}
                  placeholder={HINT_CATEGORIES.find(c => c.id === hintCategory)?.placeholder || "Add a hint..."}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]" />
                <button type="submit" disabled={!newHint.trim() || adding}
                  className="px-5 py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors whitespace-nowrap">
                  {adding ? "..." : "Add"}
                </button>
              </div>
              <div className="flex justify-between px-1">
                {addError ? <p className="text-red-600 text-xs">{addError}</p> : newHint.trim().length > 0 && newHint.trim().length < 40 && hintCategory !== "avoid" ? <p className="text-xs text-[#888888]">More detail = better gifts</p> : <span />}
                {newHint.length > 0 && <p className={`text-xs ml-auto ${newHint.length >= 260 ? "text-red-600" : "text-[#888888]"}`}>{280 - newHint.length}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Progress nudge */}
        {isOwner && hintsToShow.length >= 1 && hintsToShow.length < 8 && (
          <div className="bg-[#C4D4B4] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#2D4A1E]">{hintsToShow.length < 3 ? "Getting started" : hintsToShow.length < 5 ? "Building nicely" : "Almost there"}</p>
              <span className="text-xs font-bold text-[#2D4A1E]">{hintsToShow.length}/8</span>
            </div>
            <div className="w-full h-1.5 bg-white/40 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-[#2D4A1E] rounded-full transition-all" style={{ width: `${Math.round((hintsToShow.length / 8) * 100)}%` }} />
            </div>
            <p className="text-xs text-[#2D4A1E]/80">
              {hintsToShow.length < 3 ? "Add more hints — the AI needs context to go beyond generic suggestions." : "8+ hints is where gift ideas start feeling truly personal."}
            </p>
          </div>
        )}

        {/* Hints list */}
        {(isOwner || hintsToShow.length > 0) && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#F0F0E8] flex items-center justify-between">
              <p className="text-sm font-bold text-[#111111]">
                {isOwner ? "My Hints" : `${displayName}'s hints`}
              </p>
              {hintsToShow.length > 0 && <span className="text-xs text-[#888888]">{hintsToShow.length}</span>}
            </div>
            {isOwner && hints.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">🎁</p>
                <p className="font-bold text-[#111111] text-sm mb-1">Your hints = gifts people want to give</p>
                <p className="text-[#888888] text-xs leading-relaxed">The AI reads all your hints together and finds gifts you&apos;d genuinely love.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0F0E8]">
                {hintsToShow.map(hint => {
                  const cat = CATEGORIES[hint.category as keyof typeof CATEGORIES] || CATEGORIES.general;
                  return (
                    <div key={hint.id} className="px-4 py-3.5 group">
                      {isOwner && editingHintId === hint.id ? (
                        <div>
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {HINT_CATEGORIES.map(c => (
                              <button key={c.id} onClick={() => setEditCategory(c.id)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${editCategory === c.id ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={280} autoFocus rows={2}
                            className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 focus:ring-2 focus:ring-[#111111] text-sm text-[#111111] focus:outline-none resize-none mb-2" />
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <button onClick={() => saveHint(hint.id)} disabled={!editContent.trim() || hintSaving}
                                className="px-4 py-1.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-xs">Save</button>
                              <button onClick={cancelEditHint} className="px-4 py-1.5 bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-xs">Cancel</button>
                            </div>
                            <span className={`text-xs ${editContent.length >= 260 ? "text-red-600" : "text-[#888888]"}`}>{280 - editContent.length}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block mb-1.5 ${cat.color}`}>{cat.label}</span>
                            <p className="text-[#111111] text-sm">{hint.content}</p>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {confirmDeleteId === hint.id ? (
                                <>
                                  <button onClick={() => deleteHint(hint.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">Delete</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1 bg-[#F0F0E8] text-[#888888] text-xs font-semibold rounded-full">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditHint(hint)} className="p-1.5 text-[#CCCCCC] hover:text-[#111111] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setConfirmDeleteId(hint.id)} className="p-1.5 text-[#CCCCCC] hover:text-red-600 transition-colors text-lg leading-none">×</button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Avoid nudge */}
        {isOwner && avoidHints.length === 0 && hints.length > 0 && (
          <button onClick={() => setHintCategory("avoid")}
            className="w-full px-4 py-3.5 bg-white rounded-2xl shadow-card text-left hover:bg-[#F0F0E8] transition-colors border-2 border-dashed border-[#E0E0D8] hover:border-red-300">
            <p className="text-sm font-semibold text-[#888888] hover:text-red-500">+ What should people NOT get you?</p>
            <p className="text-xs text-[#AAAAAA] mt-0.5">Candles? Socks? Tell them — it saves everyone.</p>
          </button>
        )}

        {avoidHints.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Please avoid</p>
            </div>
            <div className="divide-y divide-[#F0F0E8]">
              {avoidHints.map(hint => (
                <div key={hint.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[#888888] text-sm">— {hint.content}</span>
                  {isOwner && (
                    confirmDeleteId === hint.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteHint(hint.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">Delete</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1 bg-[#F0F0E8] text-[#888888] text-xs font-semibold rounded-full">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(hint.id)} className="p-1.5 text-[#CCCCCC] hover:text-red-600 transition-colors text-lg leading-none">×</button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pb-4">
          <p className="text-xs text-[#CCCCCC]">
            As an Amazon Associate, GiftButler earns from qualifying purchases. <a href="/privacy" className="hover:text-[#888888] underline">Privacy</a> · <a href="/terms" className="hover:text-[#888888] underline">Terms</a>
          </p>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      {showFixedCTA && (
        <div className="fixed left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-t border-[#E8E8E0] px-4"
          style={{ bottom: user ? "56px" : "0px", paddingBottom: user ? "12px" : "env(safe-area-inset-bottom, 12px)", paddingTop: "12px" }}>
          <div className="max-w-xl mx-auto">
            <button onClick={() => setShowFinder(true)}
              className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-base transition-colors flex items-center justify-center gap-2">
              {hintsToShow.length > 0 ? `Find ${displayName} a gift` : `Find a gift for ${displayName}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isLoaded && user && <BottomTabBar myUsername={myUsername} />}
    </main>
  );
}
