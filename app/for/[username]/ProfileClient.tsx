"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Share, Cake, Pencil, X, Star } from "lucide-react";
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

const GIFT_CATEGORY_EMOJI: Record<string, string> = {
  product: "🎁",
  experience: "🎟️",
  subscription: "📦",
  consumable: "🌿",
};

interface ClaimRecord { description: string; occasion: string | null; }

const CATEGORIES = {
  general: { label: "Into lately",  color: "bg-orange-100 text-orange-800" },
  love:    { label: "Love",          color: "bg-red-100 text-red-700" },
  like:    { label: "Like",          color: "bg-sky-100 text-sky-700" },
  want:    { label: "Want",          color: "bg-blue-100 text-blue-700" },
  need:    { label: "Need",          color: "bg-emerald-100 text-emerald-700" },
  dream:   { label: "Dream",         color: "bg-purple-100 text-purple-700" },
  style:   { label: "My Style",      color: "bg-teal-100 text-teal-700" },
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
    <main className="min-h-screen bg-[#EAEDED]" style={{ paddingBottom: showFixedCTA ? "calc(5rem + env(safe-area-inset-bottom,0px))" : "5rem" }}>

      {/* Amazon-style dark header — replaces main layout nav on this page */}
      <header className="bg-[#131921] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={user ? (myUsername ? `/for/${myUsername}` : "/activity") : "/"} className="text-lg font-bold text-[#FF9900] tracking-tight">
            GiftButler
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && !user && (
              <Link href="/sign-up" className="px-3 py-1.5 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-sm transition-colors">
                Sign up
              </Link>
            )}
            {isLoaded && user && (
              <Link href="/profile/edit" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[#FF9900] transition-all flex-shrink-0">
                {user.imageUrl ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#131921] bg-[#FF9900]">{user.firstName?.[0]?.toUpperCase() || "?"}</div>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Profile card — like an Amazon seller storefront */}
      <div className="bg-white border-b border-[#D5D9D9]">
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-lg overflow-hidden border border-[#D5D9D9] flex-shrink-0 shadow-card">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#131921] bg-[#FFD814]">
                  {profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[#0F1111] leading-tight">{displayName}</h1>
              <p className="text-[#007185] text-sm">@{username}</p>
              {profile.bio && <p className="text-[#565959] text-sm mt-1 leading-relaxed">{profile.bio}</p>}

              {/* Hint count styled like Amazon reviews */}
              {hintsToShow.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.min(5, Math.round((hintsToShow.length / 8) * 5)) ? "fill-[#FF9900] text-[#FF9900]" : "text-[#D5D9D9]"}`} />
                  ))}
                  <span className="text-xs text-[#007185] ml-1">{hintsToShow.length} hints</span>
                </div>
              )}

              {/* Birthday */}
              {daysUntilBirthday !== null && daysUntilBirthday <= 60 && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 bg-[#FFF3E0] border border-[#FF9900]/30 rounded text-xs font-semibold text-[#C7511F]">
                  <Cake className="w-3 h-3" />
                  {daysUntilBirthday === 0 ? "Birthday today! 🎉" : daysUntilBirthday === 1 ? "Birthday tomorrow!" : `Birthday in ${daysUntilBirthday} days`}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-3">
            {isOwner && (
              <>
                <button onClick={shareProfile}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-sm border border-[#FFA41C] transition-colors">
                  <Share className="w-3.5 h-3.5" />
                  {shareCopied ? "Copied!" : "Share profile"}
                </button>
                <Link href="/profile/edit"
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-[#EAEDED] text-[#0F1111] font-semibold rounded-full text-sm border border-[#D5D9D9] transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Link>
              </>
            )}

            {isLoaded && user && !isOwner && (
              <>
                {followStatus === "none" && !showLabelPicker && (
                  <button onClick={() => setShowLabelPicker(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-sm border border-[#FFA41C] transition-colors">
                    + Add to my people
                  </button>
                )}
                {followStatus === "pending" && <span className="px-4 py-1.5 bg-[#EAEDED] text-[#565959] font-semibold rounded-full text-sm border border-[#D5D9D9]">Request sent</span>}
                {followStatus === "accepted" && <span className="px-4 py-1.5 bg-[#EAEDED] text-emerald-700 font-semibold rounded-full text-sm border border-[#D5D9D9]">✓ In my people</span>}
                <button onClick={shareProfile}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-[#EAEDED] text-[#0F1111] font-semibold rounded-full text-sm border border-[#D5D9D9] transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                  {shareCopied ? "Copied!" : "Share"}
                </button>
              </>
            )}
            {isLoaded && !user && (
              <button onClick={shareProfile}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-[#EAEDED] text-[#0F1111] font-semibold rounded-full text-sm border border-[#D5D9D9] transition-colors">
                <Copy className="w-3.5 h-3.5" />
                {shareCopied ? "Copied!" : "Share"}
              </button>
            )}
          </div>

          {/* Label picker */}
          {showLabelPicker && (
            <div className="mt-3 bg-[#EAEDED] rounded-lg p-4 border border-[#D5D9D9]">
              <p className="text-sm font-bold text-[#0F1111] mb-3">Who is {displayName} to you?</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {LABELS.map(l => (
                  <button key={l} onClick={() => setSelectedLabel(l)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-[#FF9900] border-[#FF9900] text-white" : "bg-white border-[#D5D9D9] text-[#0F1111] hover:border-[#FF9900]"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={sendFollowRequest} disabled={!selectedLabel || followLoading}
                  className="flex-1 py-2 bg-[#FFD814] hover:bg-[#F0C14B] disabled:bg-[#EAEDED] disabled:text-[#D5D9D9] text-[#0F1111] font-bold rounded-full text-sm border border-[#FFA41C] disabled:border-[#D5D9D9] transition-colors">
                  {followLoading ? "Sending..." : "Send request"}
                </button>
                <button onClick={() => { setShowLabelPicker(false); setSelectedLabel(""); }}
                  className="px-4 py-2 bg-white hover:bg-[#EAEDED] text-[#0F1111] font-semibold rounded-full text-sm border border-[#D5D9D9] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-xl mx-auto px-3 py-3 space-y-3">

        {/* Education banner */}
        {!isOwner && hintsToShow.length > 0 && recommendations.length === 0 && !showFinder && (() => {
          try { return !sessionStorage.getItem(`gb_recs_${username}`); } catch { return true; }
        })() && (
          <div className="bg-[#FFF3E0] border border-[#FF9900]/40 rounded-lg p-3">
            <p className="text-xs font-bold text-[#C7511F] mb-1">✨ GiftButler AI</p>
            <p className="text-[#0F1111] text-sm leading-relaxed">
              {displayName} dropped {hintsToShow.length} hints about their interests and wishes. Our AI reads them all together to suggest gifts they&apos;d genuinely love — not a generic search.
            </p>
          </div>
        )}

        {/* Gift Finder — styled like Amazon checkout */}
        {showFinder && recommendations.length === 0 && (
          <div className="bg-white rounded-lg shadow-card border border-[#D5D9D9] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#0F1111]">Find the perfect gift</h2>
              <button onClick={() => setShowFinder(false)} className="p-1 text-[#565959] hover:text-[#0F1111]"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              {[
                { label: "I'm their", value: relationship, onChange: (v: string) => setRelationship(v), ref: relationshipRef, placeholder: "Select relationship...", options: [
                  { group: "Partner", items: [["husband","Husband"],["wife","Wife"],["partner","Partner"]] },
                  { group: "Family", items: [["dad","Dad"],["mom","Mom"],["son","Son"],["daughter","Daughter"],["brother","Brother"],["sister","Sister"],["grandfather","Grandfather"],["grandmother","Grandmother"],["grandson","Grandson"],["granddaughter","Granddaughter"],["uncle","Uncle"],["aunt","Aunt"],["nephew","Nephew"],["niece","Niece"],["cousin","Cousin"]] },
                  { group: "Friends & Others", items: [["best friend","Best Friend"],["friend","Friend"],["colleague","Colleague"],["other","Other"]] },
                ]},
              ].map(field => (
                <div key={field.label}>
                  <label className="text-xs font-bold text-[#565959] mb-1.5 block">{field.label}</label>
                  <select ref={field.ref as React.Ref<HTMLSelectElement>} value={field.value} onChange={e => field.onChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#D5D9D9] text-sm text-[#0F1111] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] bg-white">
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
                <label className="text-xs font-bold text-[#565959] mb-1.5 block">Budget</label>
                <select value={budget} onChange={e => setBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D5D9D9] text-sm text-[#0F1111] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] bg-white">
                  <option value="">Select budget...</option>
                  <option value="under $25">Under $25</option>
                  <option value="$25-$50">$25 – $50</option>
                  <option value="$50-$100">$50 – $100</option>
                  <option value="$100-$200">$100 – $200</option>
                  <option value="over $200">$200+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-[#565959] mb-1.5 block">Occasion <span className="font-normal text-[#D5D9D9]">(optional)</span></label>
                <select value={occasion} onChange={e => setOccasion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D5D9D9] text-sm text-[#0F1111] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900] bg-white">
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
              className="w-full py-2.5 bg-[#FFD814] hover:bg-[#F0C14B] disabled:bg-[#EAEDED] disabled:text-[#D5D9D9] text-[#0F1111] font-bold rounded-full border border-[#FFA41C] disabled:border-[#D5D9D9] transition-colors">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#0F1111]/30 border-t-[#0F1111] rounded-full animate-spin inline-block" />
                  Finding the perfect gift...
                </span>
              ) : generateError ? "Try again" : "Generate gift ideas"}
            </button>
          </div>
        )}

        {/* Recommendations — Amazon product cards */}
        {recommendations.length > 0 && (() => {
          const availableCategories = ["all", ...Array.from(new Set(recommendations.map(r => r.category)))];
          const filtered = categoryFilter === "all" ? recommendations : recommendations.filter(r => r.category === categoryFilter);
          const visible = showAllRecs ? filtered : filtered.slice(0, 5);
          return (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <h2 className="font-bold text-[#0F1111]">Results for &ldquo;{displayName}&rdquo;</h2>
                <span className="text-xs text-[#565959]">{filtered.length} ideas</span>
              </div>
              {availableCategories.length > 2 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                  {availableCategories.map(cat => (
                    <button key={cat} onClick={() => { setCategoryFilter(cat); setShowAllRecs(false); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border ${categoryFilter === cat ? "bg-[#232F3E] text-white border-[#232F3E]" : "bg-white text-[#0F1111] border-[#D5D9D9] hover:border-[#FF9900]"}`}>
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
                    <div key={i} className={`bg-white rounded-lg shadow-card border ${alreadyClaimed && !iMineThis ? "border-emerald-300" : "border-[#D5D9D9]"} p-4`}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-[#007185] text-sm leading-snug hover:text-[#C7511F] cursor-default">{rec.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-[#0F1111]">{rec.priceRange}</span>
                        <span className="text-xs text-[#565959]">{GIFT_CATEGORY_EMOJI[rec.category]} {rec.category}</span>
                        {alreadyClaimed && !iMineThis && <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Someone&apos;s on it</span>}
                      </div>
                      <p className="text-[#565959] text-xs leading-relaxed mb-3">{rec.why}</p>
                      {/* Amazon-style button stack */}
                      <div className="flex flex-col gap-2">
                        <a href={rec.searchUrl} target="_blank" rel="noopener noreferrer"
                          className="w-full py-2 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-sm text-center border border-[#FFA41C] transition-colors">
                          Find this gift
                        </a>
                        <button onClick={() => claimGift(rec.title)} disabled={iMineThis || alreadyClaimed || claiming === rec.title}
                          className="w-full py-2 bg-[#FF9900] hover:bg-[#E47911] disabled:bg-[#EAEDED] disabled:text-[#565959] disabled:border-[#D5D9D9] text-white font-bold rounded-full text-sm border border-[#E47911] transition-colors">
                          {iMineThis ? "✓ Getting this" : alreadyClaimed ? "✓ Taken" : "I'm getting this"}
                        </button>
                      </div>
                      {notifyPromptTitle === rec.title && (
                        <div className="mt-3 pt-3 border-t border-[#D5D9D9] flex items-center justify-between gap-3">
                          <p className="text-xs text-[#565959]">Let {displayName} know something&apos;s on the way?</p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={sendNotify} className="px-3 py-1 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-xs border border-[#FFA41C]">Send hint</button>
                            <button onClick={() => setNotifyPromptTitle(null)} className="px-3 py-1 bg-white text-[#565959] font-semibold rounded-full text-xs border border-[#D5D9D9]">Keep secret</button>
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
                  <button onClick={() => setShowAllRecs(true)} className="w-full py-2 bg-white hover:bg-[#EAEDED] text-[#007185] font-semibold rounded-full text-sm border border-[#D5D9D9] transition-colors">
                    See all {filtered.length} results
                  </button>
                )}
                <button onClick={() => { setRecommendations([]); setGenerateError(""); setShowFinder(true); setCategoryFilter("all"); setShowAllRecs(false); try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => relationshipRef.current?.focus(), 400); }}
                  className="w-full py-2 bg-white hover:bg-[#EAEDED] text-[#565959] font-semibold rounded-full text-sm border border-[#D5D9D9] transition-colors">
                  Refine search
                </button>
              </div>
            </div>
          );
        })()}

        {/* Sign-up CTA for visitors */}
        {isLoaded && !user && (recommendations.length > 0 || showFinder) && (
          <div className="bg-[#FFF3E0] border border-[#FF9900]/40 rounded-lg p-4 text-center">
            <p className="text-[#0F1111] font-bold text-sm mb-1">Create your own gift profile — free</p>
            <p className="text-[#565959] text-xs mb-3">Share your link. Get gifts you actually want.</p>
            <a href="/sign-up" className="inline-block px-6 py-2 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-sm border border-[#FFA41C] transition-colors">
              Get started
            </a>
          </div>
        )}

        {/* Drop a hint (owner) */}
        {isOwner && (
          <div className="bg-white rounded-lg shadow-card border border-[#D5D9D9] p-4">
            <p className="text-sm font-bold text-[#0F1111] mb-0.5">Drop a hint</p>
            <p className="text-xs text-[#565959] mb-3">The AI reads all your hints together to suggest gifts people know you&apos;ll love.</p>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
              {HINT_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setHintCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex-shrink-0 border ${hintCategory === c.id ? "bg-[#232F3E] text-white border-[#232F3E]" : "bg-white text-[#0F1111] border-[#D5D9D9] hover:border-[#FF9900]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <form onSubmit={addHint} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input value={newHint} onChange={e => setNewHint(e.target.value)} maxLength={280}
                  placeholder={HINT_CATEGORIES.find(c => c.id === hintCategory)?.placeholder || "Add a hint..."}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#D5D9D9] text-sm text-[#0F1111] placeholder-[#D5D9D9] focus:outline-none focus:ring-1 focus:ring-[#FF9900] focus:border-[#FF9900]" />
                <button type="submit" disabled={!newHint.trim() || adding}
                  className="px-4 py-2 bg-[#FFD814] hover:bg-[#F0C14B] disabled:bg-[#EAEDED] disabled:text-[#D5D9D9] text-[#0F1111] font-bold rounded-full text-sm border border-[#FFA41C] disabled:border-[#D5D9D9] transition-colors whitespace-nowrap">
                  {adding ? "..." : "Add"}
                </button>
              </div>
              <div className="flex justify-between px-0.5">
                {addError ? <p className="text-red-600 text-xs">{addError}</p> : newHint.trim().length > 0 && newHint.trim().length < 40 && hintCategory !== "avoid" ? <p className="text-xs text-[#565959]">More detail = better gifts</p> : <span />}
                {newHint.length > 0 && <p className={`text-xs ml-auto ${newHint.length >= 260 ? "text-red-600" : "text-[#565959]"}`}>{280 - newHint.length}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Progress nudge */}
        {isOwner && hintsToShow.length >= 1 && hintsToShow.length < 8 && (
          <div className="bg-[#FFF3E0] border border-[#FF9900]/40 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#C7511F]">{hintsToShow.length < 3 ? "Getting started" : hintsToShow.length < 5 ? "Building nicely" : "Almost there"}</p>
              <span className="text-xs font-bold text-[#C7511F]">{hintsToShow.length}/8 hints</span>
            </div>
            <div className="w-full h-1.5 bg-orange-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-[#FF9900] rounded-full transition-all" style={{ width: `${Math.round((hintsToShow.length / 8) * 100)}%` }} />
            </div>
            <p className="text-xs text-[#565959] leading-relaxed">
              {hintsToShow.length < 3 ? "Add more hints — the AI needs context to go beyond generic suggestions." : "8+ hints is where gift ideas start feeling truly personal."}
            </p>
          </div>
        )}

        {/* Hints list */}
        {(isOwner || hintsToShow.length > 0) && (
          <div className="bg-white rounded-lg shadow-card border border-[#D5D9D9] overflow-hidden">
            <div className="px-4 py-3 bg-[#232F3E] flex items-center justify-between">
              <p className="text-xs font-bold text-white uppercase tracking-wide">
                {isOwner ? "My Hints" : `${displayName}'s hints`}
              </p>
              {hintsToShow.length > 0 && <span className="text-xs text-[#AAAAAA]">{hintsToShow.length} hints</span>}
            </div>
            {isOwner && hints.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">🎁</p>
                <p className="font-bold text-[#0F1111] text-sm mb-1">Your hints = gifts people want to give</p>
                <p className="text-[#565959] text-xs leading-relaxed">The AI reads all your hints together and finds gifts you&apos;d genuinely love — not a generic search.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#D5D9D9]">
                {hintsToShow.map(hint => {
                  const cat = CATEGORIES[hint.category as keyof typeof CATEGORIES] || CATEGORIES.general;
                  return (
                    <div key={hint.id} className="px-4 py-3 group">
                      {isOwner && editingHintId === hint.id ? (
                        <div>
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {HINT_CATEGORIES.map(c => (
                              <button key={c.id} onClick={() => setEditCategory(c.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${editCategory === c.id ? "bg-[#232F3E] text-white border-[#232F3E]" : "bg-white text-[#0F1111] border-[#D5D9D9] hover:border-[#FF9900]"}`}>
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={280} autoFocus rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-[#FF9900] text-sm text-[#0F1111] focus:outline-none resize-none mb-2" />
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <button onClick={() => saveHint(hint.id)} disabled={!editContent.trim() || hintSaving}
                                className="px-3 py-1.5 bg-[#FFD814] hover:bg-[#F0C14B] disabled:bg-[#EAEDED] text-[#0F1111] font-bold rounded-full text-xs border border-[#FFA41C]">Save</button>
                              <button onClick={cancelEditHint} className="px-3 py-1.5 bg-white text-[#565959] font-semibold rounded-full text-xs border border-[#D5D9D9]">Cancel</button>
                            </div>
                            <span className={`text-xs ${editContent.length >= 260 ? "text-red-600" : "text-[#565959]"}`}>{280 - editContent.length}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1 ${cat.color}`}>{cat.label}</span>
                            <p className="text-[#0F1111] text-sm">{hint.content}</p>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {confirmDeleteId === hint.id ? (
                                <>
                                  <button onClick={() => deleteHint(hint.id)} className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">Delete</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-white text-[#565959] text-xs font-semibold rounded-full border border-[#D5D9D9]">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditHint(hint)} className="p-1 text-[#D5D9D9] hover:text-[#FF9900] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setConfirmDeleteId(hint.id)} className="p-1 text-[#D5D9D9] hover:text-red-600 transition-colors text-lg leading-none">×</button>
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
            className="w-full px-4 py-3 bg-white border border-dashed border-red-300 rounded-lg text-left hover:bg-red-50 transition-colors">
            <p className="text-sm font-semibold text-red-600">+ What should people NOT get you?</p>
            <p className="text-xs text-[#565959] mt-0.5">Candles? Socks? Tell them — it saves everyone.</p>
          </button>
        )}

        {avoidHints.length > 0 && (
          <div className="bg-white rounded-lg shadow-card border border-red-200 overflow-hidden">
            <div className="px-4 py-2 bg-red-50 border-b border-red-200">
              <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Please avoid</p>
            </div>
            <div className="divide-y divide-[#D5D9D9]">
              {avoidHints.map(hint => (
                <div key={hint.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[#0F1111] text-sm">— {hint.content}</span>
                  {isOwner && (
                    confirmDeleteId === hint.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteHint(hint.id)} className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">Delete</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-white text-[#565959] text-xs font-semibold rounded-full border border-[#D5D9D9]">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteId(hint.id)} className="p-1 text-[#D5D9D9] hover:text-red-600 transition-colors text-lg leading-none">×</button>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pb-2">
          <p className="text-xs text-[#D5D9D9]">
            As an Amazon Associate, GiftButler earns from qualifying purchases. <a href="/privacy" className="hover:text-[#565959] underline">Privacy</a> · <a href="/terms" className="hover:text-[#565959] underline">Terms</a>
          </p>
        </div>
      </div>

      {/* Fixed bottom CTA */}
      {showFixedCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#131921] border-t border-[#3D4F5C] px-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)", paddingTop: "12px" }}>
          <div className="max-w-xl mx-auto">
            <button onClick={() => setShowFinder(true)}
              className="w-full py-3 bg-[#FFD814] hover:bg-[#F0C14B] text-[#0F1111] font-bold rounded-full text-base border border-[#FFA41C] transition-colors">
              {hintsToShow.length > 0 ? `Find ${displayName} a gift` : `Find a gift for ${displayName}`}
            </button>
          </div>
        </div>
      )}

      {isLoaded && user && <BottomTabBar myUsername={myUsername} />}
    </main>
  );
}
