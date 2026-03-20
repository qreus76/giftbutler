"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Share, Cake, Pencil, X } from "lucide-react";
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

interface ClaimRecord {
  description: string;
  occasion: string | null;
}

const CATEGORIES = {
  general: { label: "Into lately", color: "bg-amber-100 text-amber-800" },
  love:    { label: "Love",        color: "bg-pink-100 text-pink-700" },
  like:    { label: "Like",        color: "bg-sky-100 text-sky-700" },
  want:    { label: "Want",        color: "bg-indigo-100 text-indigo-700" },
  need:    { label: "Need",        color: "bg-emerald-100 text-emerald-700" },
  dream:   { label: "Dream",       color: "bg-purple-100 text-purple-700" },
  style:   { label: "My Style",    color: "bg-violet-100 text-violet-700" },
  avoid:   { label: "Please no",   color: "bg-red-100 text-red-700" },
};

const HINT_CATEGORIES = [
  { id: "general", label: "Into lately",  placeholder: "I've been really into sourdough baking..." },
  { id: "love",    label: "Love",         placeholder: "Fresh flowers, especially tulips..." },
  { id: "like",    label: "Like",         placeholder: "I enjoy a good audiobook..." },
  { id: "want",    label: "Want",         placeholder: "I've been wanting to try a standing desk..." },
  { id: "need",    label: "Need",         placeholder: "My headphones are finally dying..." },
  { id: "dream",   label: "Dream",        placeholder: "Someday I'd love to go to Japan..." },
  { id: "style",   label: "My Style",     placeholder: "I wear a medium, prefer minimalist design, love earth tones..." },
  { id: "avoid",   label: "Please no",    placeholder: "No more candles or gift cards please..." },
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
    if (!isOwner) {
      const ref = encodeURIComponent(document.referrer || "");
      fetch(`/api/profile/${username}?ref=${ref}`);
    }
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
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, label: selectedLabel }),
    });
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
    setGenerating(true);
    setGenerateError("");
    setRecommendations([]);
    setCategoryFilter("all");
    setShowAllRecs(false);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, relationship, budget, occasion }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      if (!data.recommendations?.length) throw new Error("No recommendations returned");
      setRecommendations(data.recommendations);
      setShowFinder(false);
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ recommendations: data.recommendations, myClaims, relationship, budget, occasion })); } catch { /* unavailable */ }
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Something went wrong — please try again");
    } finally {
      setGenerating(false);
    }
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
    fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_username: username, gift_description: title, occasion }),
    }).catch(() => {}).finally(() => { setClaiming(null); setNotifyPromptTitle(title); });
  }

  async function sendNotify() {
    if (!notifyPromptTitle) return;
    setNotifySent(prev => new Set(prev).add(notifyPromptTitle));
    setNotifyPromptTitle(null);
    await fetch("/api/claims/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_username: username, occasion }),
    });
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
        body: JSON.stringify({ content: newHint.trim(), category: hintCategory }),
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
    setHints(hints.filter(h => h.id !== id));
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, { method: "DELETE" });
      if (!res.ok) setHints(prev);
    } catch { setHints(prev); }
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
    <main className="min-h-screen bg-[#F0F2F5]" style={{ paddingBottom: showFixedCTA ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : "5rem" }}>

      {/* ── NAV (profile page has its own since it doesn't use main layout) ── */}
      <nav className="bg-white border-b border-[#E4E6EB] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={user ? (myUsername ? `/for/${myUsername}` : "/activity") : "/"} className="text-lg font-bold text-[#F59E0B] tracking-tight">
            GiftButler
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && !user && (
              <Link href="/sign-up" className="px-4 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-sm transition-colors">
                Sign up
              </Link>
            )}
            {isLoaded && user && (
              <Link href="/profile/edit" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[#F59E0B] transition-all flex-shrink-0">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white bg-[#F59E0B]">
                    {user.firstName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── PROFILE HEADER (Facebook-style) ── */}
      <div className="bg-white border-b border-[#E4E6EB] mb-3">
        {/* Cover strip */}
        <div className="h-32 bg-gradient-to-r from-amber-400 to-amber-500" />

        {/* Avatar + name row */}
        <div className="max-w-xl mx-auto px-4">
          <div className="flex items-end gap-3 -mt-10 mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white flex-shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white bg-amber-500">
                  {profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="text-xl font-bold text-[#1C1E21] leading-tight truncate">{displayName}</h1>
              <p className="text-[#65676B] text-sm">@{username}</p>
            </div>
          </div>

          {profile.bio && (
            <p className="text-[#1C1E21] text-sm mb-3 leading-relaxed">{profile.bio}</p>
          )}

          {/* Birthday countdown */}
          {daysUntilBirthday !== null && daysUntilBirthday <= 60 && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <Cake className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className={`font-semibold ${daysUntilBirthday <= 7 ? "text-red-500" : "text-[#65676B]"}`}>
                {daysUntilBirthday === 0 ? "Birthday today! 🎉" : daysUntilBirthday === 1 ? "Birthday tomorrow!" : `Birthday in ${daysUntilBirthday} days`}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pb-3 flex-wrap">
            {isOwner && (
              <>
                <button
                  onClick={shareProfile}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  <Share className="w-4 h-4" />
                  {shareCopied ? "Copied!" : "Share"}
                </button>
                <Link
                  href="/profile/edit"
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1C1E21] font-semibold rounded-lg text-sm transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit profile
                </Link>
              </>
            )}

            {isLoaded && user && !isOwner && (
              <>
                {followStatus === "none" && !showLabelPicker && (
                  <button
                    onClick={() => setShowLabelPicker(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-sm transition-colors"
                  >
                    + Add to my people
                  </button>
                )}
                {followStatus === "pending" && (
                  <span className="px-4 py-1.5 bg-[#E4E6EB] text-[#65676B] font-semibold rounded-lg text-sm">Request sent</span>
                )}
                {followStatus === "accepted" && (
                  <span className="px-4 py-1.5 bg-[#E4E6EB] text-emerald-700 font-semibold rounded-lg text-sm">✓ Connected</span>
                )}
                <button
                  onClick={shareProfile}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1C1E21] font-semibold rounded-lg text-sm transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {shareCopied ? "Copied!" : "Share"}
                </button>
              </>
            )}

            {isLoaded && !user && (
              <button
                onClick={shareProfile}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1C1E21] font-semibold rounded-lg text-sm transition-colors"
              >
                <Copy className="w-4 h-4" />
                {shareCopied ? "Copied!" : "Share"}
              </button>
            )}
          </div>

          {/* Label picker */}
          {showLabelPicker && (
            <div className="bg-[#F0F2F5] rounded-xl p-4 mb-3 border border-[#E4E6EB]">
              <p className="text-sm font-semibold text-[#1C1E21] mb-3">Who is {displayName} to you?</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {LABELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setSelectedLabel(l)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-[#F59E0B] border-[#F59E0B] text-white" : "bg-white border-[#E4E6EB] text-[#1C1E21] hover:border-[#F59E0B]"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={sendFollowRequest}
                  disabled={!selectedLabel || followLoading}
                  className="flex-1 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#E4E6EB] disabled:text-[#65676B] text-white font-bold rounded-lg text-sm transition-colors"
                >
                  {followLoading ? "Sending..." : "Send request"}
                </button>
                <button
                  onClick={() => { setShowLabelPicker(false); setSelectedLabel(""); }}
                  className="px-4 py-2 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1C1E21] font-semibold rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-xl mx-auto px-3 space-y-3">

        {/* Education banner (visitor, first visit) */}
        {!isOwner && hintsToShow.length > 0 && recommendations.length === 0 && !showFinder && (() => {
          try { return !sessionStorage.getItem(`gb_recs_${username}`); } catch { return true; }
        })() && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 mb-1">✨ How GiftButler works</p>
            <p className="text-amber-900 text-sm leading-relaxed">
              {displayName} dropped hints about their life and interests. Our AI reads all of them together and suggests gifts they&apos;d genuinely love — personal, not generic.
            </p>
          </div>
        )}

        {/* Gift finder */}
        {showFinder && recommendations.length === 0 && (
          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1C1E21] text-lg">Find the perfect gift</h2>
              <button onClick={() => setShowFinder(false)} className="p-1 text-[#65676B] hover:text-[#1C1E21] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-[#65676B] mb-1.5 block uppercase tracking-wide">I&apos;m their</label>
                <select
                  ref={relationshipRef}
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E4E6EB] text-sm text-[#1C1E21] focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select relationship...</option>
                  <optgroup label="Partner">
                    <option value="husband">Husband</option>
                    <option value="wife">Wife</option>
                    <option value="partner">Partner</option>
                  </optgroup>
                  <optgroup label="Family">
                    <option value="dad">Dad</option>
                    <option value="mom">Mom</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="grandfather">Grandfather</option>
                    <option value="grandmother">Grandmother</option>
                    <option value="grandson">Grandson</option>
                    <option value="granddaughter">Granddaughter</option>
                    <option value="uncle">Uncle</option>
                    <option value="aunt">Aunt</option>
                    <option value="nephew">Nephew</option>
                    <option value="niece">Niece</option>
                    <option value="cousin">Cousin</option>
                  </optgroup>
                  <optgroup label="Friends &amp; Others">
                    <option value="best friend">Best Friend</option>
                    <option value="friend">Friend</option>
                    <option value="colleague">Colleague</option>
                    <option value="other">Other</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#65676B] mb-1.5 block uppercase tracking-wide">Budget</label>
                <select
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E4E6EB] text-sm text-[#1C1E21] focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
                  <option value="">Select budget...</option>
                  <option value="under $25">Under $25</option>
                  <option value="$25-$50">$25 – $50</option>
                  <option value="$50-$100">$50 – $100</option>
                  <option value="$100-$200">$100 – $200</option>
                  <option value="over $200">$200+</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#65676B] mb-1.5 block uppercase tracking-wide">Occasion <span className="text-[#BCC0C4] normal-case font-normal">(optional)</span></label>
                <select
                  value={occasion}
                  onChange={e => setOccasion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E4E6EB] text-sm text-[#1C1E21] focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                >
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
            {generateError && <p className="text-red-500 text-sm mb-3">{generateError}</p>}
            <button
              onClick={generateGifts}
              disabled={!relationship || !budget || generating}
              className="w-full py-2.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#E4E6EB] disabled:text-[#BCC0C4] text-white font-bold rounded-lg transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Finding the perfect gift...
                </span>
              ) : generateError ? "Try again" : "Generate gift ideas"}
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (() => {
          const availableCategories = ["all", ...Array.from(new Set(recommendations.map(r => r.category)))];
          const filtered = categoryFilter === "all" ? recommendations : recommendations.filter(r => r.category === categoryFilter);
          const visible = showAllRecs ? filtered : filtered.slice(0, 5);
          return (
            <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-[#E4E6EB] flex items-center justify-between">
                <h2 className="font-bold text-[#1C1E21]">Gift ideas for {displayName}</h2>
                <span className="text-xs text-[#65676B]">{filtered.length} ideas</span>
              </div>

              {availableCategories.length > 2 && (
                <div className="flex gap-2 px-4 py-2 overflow-x-auto scrollbar-none border-b border-[#E4E6EB]">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter(cat); setShowAllRecs(false); }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${categoryFilter === cat ? "bg-[#F59E0B] text-white" : "bg-[#E4E6EB] text-[#1C1E21] hover:bg-[#D8DADF]"}`}
                    >
                      {GIFT_CATEGORY_LABELS[cat] || cat}
                    </button>
                  ))}
                </div>
              )}

              <div className="divide-y divide-[#E4E6EB]">
                {visible.map((rec, i) => {
                  const alreadyClaimed = isAlreadyClaimed(rec.title);
                  const iMineThis = myClaims.includes(rec.title);
                  return (
                    <div key={i} className={`p-4 ${alreadyClaimed && !iMineThis ? "bg-emerald-50/50" : ""}`}>
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <h3 className="font-semibold text-[#1C1E21] text-sm leading-snug">{rec.title}</h3>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">{rec.priceRange}</span>
                      </div>
                      <p className="text-xs text-[#65676B] mb-1">{GIFT_CATEGORY_EMOJI[rec.category]} {rec.category}{alreadyClaimed && !iMineThis ? " · Someone's already on this" : ""}</p>
                      <p className="text-[#65676B] text-xs leading-relaxed mb-3">{rec.why}</p>
                      <div className="flex gap-2">
                        <a href={rec.searchUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-1 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-xs text-center transition-colors">
                          Find this gift →
                        </a>
                        <button
                          onClick={() => claimGift(rec.title)}
                          disabled={iMineThis || alreadyClaimed || claiming === rec.title}
                          className="px-3 py-1.5 border border-[#E4E6EB] text-[#65676B] text-xs font-semibold rounded-lg hover:bg-[#F0F2F5] disabled:bg-emerald-50 disabled:text-emerald-700 disabled:border-emerald-200 transition-colors whitespace-nowrap"
                        >
                          {iMineThis ? "✓ Getting this" : alreadyClaimed ? "✓ Taken" : "I'm getting this"}
                        </button>
                      </div>
                      {notifyPromptTitle === rec.title && (
                        <div className="mt-3 pt-3 border-t border-[#E4E6EB] flex items-center justify-between gap-3">
                          <p className="text-xs text-[#65676B]">Let {displayName} know something&apos;s on the way?</p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={sendNotify} className="px-3 py-1 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-xs">Send hint</button>
                            <button onClick={() => setNotifyPromptTitle(null)} className="px-3 py-1 bg-[#E4E6EB] text-[#1C1E21] font-semibold rounded-lg text-xs">Keep secret</button>
                          </div>
                        </div>
                      )}
                      {notifySent.has(rec.title) && <p className="mt-2 text-xs text-emerald-600 font-semibold">✓ Hint sent</p>}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 space-y-2">
                {!showAllRecs && filtered.length > 5 && (
                  <button onClick={() => setShowAllRecs(true)} className="w-full py-2 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#1C1E21] text-sm font-semibold rounded-lg transition-colors">
                    Show {filtered.length - 5} more ideas
                  </button>
                )}
                <button
                  onClick={() => {
                    setRecommendations([]); setGenerateError(""); setShowFinder(true); setCategoryFilter("all"); setShowAllRecs(false);
                    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => relationshipRef.current?.focus(), 400);
                  }}
                  className="w-full py-2 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#65676B] text-sm font-semibold rounded-lg transition-colors"
                >
                  Try different options
                </button>
              </div>
            </div>
          );
        })()}

        {/* CTA for signed-out visitors */}
        {isLoaded && !user && (recommendations.length > 0 || showFinder) && (
          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] p-4 text-center">
            <p className="text-[#1C1E21] font-semibold text-sm mb-1">Want your own GiftButler profile?</p>
            <p className="text-[#65676B] text-xs mb-3">Free forever. Share your link. Get gifts you actually want.</p>
            <a href="/sign-up" className="inline-block px-5 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-sm transition-colors">
              Create my profile →
            </a>
          </div>
        )}

        {/* Drop a hint (owner) */}
        {isOwner && (
          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] p-4">
            <p className="text-sm font-bold text-[#1C1E21] mb-0.5">Drop a hint</p>
            <p className="text-xs text-[#65676B] mb-3">The AI reads all your hints together to suggest gifts people know you&apos;ll love.</p>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
              {HINT_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setHintCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex-shrink-0 ${hintCategory === c.id ? "bg-[#F59E0B] text-white" : "bg-[#E4E6EB] text-[#1C1E21] hover:bg-[#D8DADF]"}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <form onSubmit={addHint} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  value={newHint}
                  onChange={e => setNewHint(e.target.value)}
                  maxLength={280}
                  placeholder={HINT_CATEGORIES.find(c => c.id === hintCategory)?.placeholder || "Add a hint..."}
                  className="flex-1 px-3 py-2 rounded-lg border border-[#E4E6EB] text-sm text-[#1C1E21] placeholder-[#BCC0C4] focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button type="submit" disabled={!newHint.trim() || adding}
                  className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#E4E6EB] disabled:text-[#BCC0C4] text-white font-semibold rounded-lg text-sm transition-colors whitespace-nowrap">
                  {adding ? "..." : "Add"}
                </button>
              </div>
              <div className="flex items-center justify-between px-0.5">
                {addError
                  ? <p className="text-red-500 text-xs">{addError}</p>
                  : newHint.trim().length > 0 && newHint.trim().length < 40 && hintCategory !== "avoid"
                    ? <p className="text-xs text-[#65676B]">More detail = better gifts</p>
                    : <span />
                }
                {newHint.length > 0 && <p className={`text-xs ml-auto ${newHint.length >= 260 ? "text-red-500" : "text-[#65676B]"}`}>{280 - newHint.length}</p>}
              </div>
            </form>
          </div>
        )}

        {/* Progress nudge (owner) */}
        {isOwner && hintsToShow.length >= 1 && hintsToShow.length < 8 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-800">{hintsToShow.length < 3 ? "Great start — keep going" : hintsToShow.length < 5 ? "Building nicely" : "Almost there"}</p>
              <span className="text-xs font-bold text-amber-700">{hintsToShow.length}/8</span>
            </div>
            <div className="w-full h-1.5 bg-amber-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.round((hintsToShow.length / 8) * 100)}%` }} />
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              {hintsToShow.length < 3 ? "Add a few more — the AI needs context to go beyond generic suggestions." : hintsToShow.length < 5 ? "More hints means the AI can match your actual taste." : "8+ hints is where gift ideas start feeling truly personal."}
            </p>
          </div>
        )}

        {isOwner && hintsToShow.length >= 8 && (
          <p className="text-xs text-[#65676B] px-1">✓ Your profile is looking great</p>
        )}

        {/* Hints list */}
        {(isOwner || hintsToShow.length > 0) && (
          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E6EB]">
              <p className="text-xs font-semibold text-[#65676B] uppercase tracking-wide">
                {isOwner ? "My Hints" : `${displayName}'s hints`}
              </p>
            </div>
            {isOwner && hints.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-2xl mb-2">🎁</p>
                <p className="font-semibold text-[#1C1E21] text-sm mb-1">Your hints = gifts people actually want to give</p>
                <p className="text-[#65676B] text-xs leading-relaxed">The AI reads all your hints together and suggests gifts you&apos;d genuinely love — not a generic search.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E4E6EB]">
                {hintsToShow.map(hint => {
                  const cat = CATEGORIES[hint.category as keyof typeof CATEGORIES] || CATEGORIES.general;
                  return (
                    <div key={hint.id} className="px-4 py-3 group">
                      {isOwner && editingHintId === hint.id ? (
                        <div>
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {HINT_CATEGORIES.map(c => (
                              <button key={c.id} onClick={() => setEditCategory(c.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${editCategory === c.id ? "bg-[#F59E0B] text-white" : "bg-[#E4E6EB] text-[#1C1E21] hover:bg-[#D8DADF]"}`}>
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} maxLength={280} autoFocus rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-amber-400 text-sm text-[#1C1E21] focus:outline-none resize-none mb-2" />
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <button onClick={() => saveHint(hint.id)} disabled={!editContent.trim() || hintSaving}
                                className="px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#E4E6EB] text-white font-semibold rounded-lg text-xs">Save</button>
                              <button onClick={cancelEditHint} className="px-3 py-1.5 bg-[#E4E6EB] text-[#1C1E21] font-semibold rounded-lg text-xs">Cancel</button>
                            </div>
                            <span className={`text-xs ${editContent.length >= 260 ? "text-red-500" : "text-[#65676B]"}`}>{280 - editContent.length}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1 ${cat.color}`}>{cat.label}</span>
                            <p className="text-[#1C1E21] text-sm">{hint.content}</p>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {confirmDeleteId === hint.id ? (
                                <>
                                  <button onClick={() => deleteHint(hint.id)} className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg">Delete</button>
                                  <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-[#E4E6EB] text-[#1C1E21] text-xs font-semibold rounded-lg">Cancel</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => startEditHint(hint)} aria-label="Edit hint" className="p-1 text-[#BCC0C4] hover:text-[#F59E0B] transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(hint.id)} aria-label="Delete hint" className="p-1 text-[#BCC0C4] hover:text-red-500 transition-colors text-lg leading-none">×</button>
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
            className="w-full px-4 py-3 bg-white border border-dashed border-red-300 rounded-xl text-left hover:bg-red-50 transition-colors group">
            <p className="text-sm font-semibold text-red-500">+ What should people NOT get you?</p>
            <p className="text-xs text-[#65676B] mt-0.5">Candles? Socks? Tell them — it saves everyone.</p>
          </button>
        )}

        {/* Avoid section */}
        {avoidHints.length > 0 && (
          <div className="bg-white rounded-xl shadow-card border border-red-100 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-100">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wide">Please avoid</p>
            </div>
            <ul className="divide-y divide-[#E4E6EB]">
              {avoidHints.map(hint => (
                <li key={hint.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[#1C1E21] text-sm">— {hint.content}</span>
                  {isOwner && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {confirmDeleteId === hint.id ? (
                        <>
                          <button onClick={() => deleteHint(hint.id)} className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-[#E4E6EB] text-[#1C1E21] text-xs font-semibold rounded-lg">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(hint.id)} className="p-1 text-[#BCC0C4] hover:text-red-500 transition-colors text-lg leading-none">×</button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="text-center pb-2">
          <p className="text-xs text-[#BCC0C4]">
            As an Amazon Associate, GiftButler earns from qualifying purchases.{" "}
            <a href="/privacy" className="hover:text-[#65676B] underline">Privacy</a> · <a href="/terms" className="hover:text-[#65676B] underline">Terms</a>
          </p>
        </div>
      </div>

      {/* Fixed bottom CTA for visitors */}
      {showFixedCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[#E4E6EB] px-4"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 12px)", paddingTop: "12px" }}>
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => setShowFinder(true)}
              className="w-full py-3 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-lg text-base transition-colors"
            >
              {hintsToShow.length > 0 ? `Find ${displayName} a gift →` : `Find a gift for ${displayName} →`}
            </button>
          </div>
        </div>
      )}

      {isLoaded && user && <BottomTabBar myUsername={myUsername} />}
    </main>
  );
}
