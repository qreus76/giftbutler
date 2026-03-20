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

const GIFT_CATEGORY_EMOJI: Record<string, string> = {
  product: "🎁",
  experience: "🎟️",
  subscription: "📦",
  consumable: "🌿",
};

const GIFT_CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  product: "Products",
  experience: "Experiences",
  subscription: "Subscriptions",
  consumable: "Consumables",
};

interface ClaimRecord {
  description: string;
  occasion: string | null;
}

const CATEGORIES = {
  general: { label: "Into lately", color: "bg-[#F5E8EC] text-[#6B2437]" },
  love:    { label: "Love",        color: "bg-pink-50 text-pink-700" },
  like:    { label: "Like",        color: "bg-sky-50 text-sky-700" },
  want:    { label: "Want",        color: "bg-indigo-50 text-indigo-700" },
  need:    { label: "Need",        color: "bg-emerald-50 text-emerald-700" },
  dream:   { label: "Dream",       color: "bg-purple-50 text-purple-700" },
  style:   { label: "My Style",    color: "bg-violet-50 text-violet-700" },
  avoid:   { label: "Please no",   color: "bg-red-50 text-red-700" },
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
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const isOwner = !!user && user.id === initialProfile.id;

  const [profile] = useState<Profile>(initialProfile);
  const [hints, setHints] = useState<Hint[]>(initialHints);

  const STORAGE_KEY = `gb_recs_${username}`;
  const relationshipRef = useRef<HTMLSelectElement>(null);

  // Gift finder state
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

  // Hint management (owner only)
  const [newHint, setNewHint] = useState("");
  const [hintCategory, setHintCategory] = useState("general");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [editingHintId, setEditingHintId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [hintSaving, setHintSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Follow state
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [followLoading, setFollowLoading] = useState(false);

  async function shareProfile() {
    const url = `${window.location.origin}/for/${username}`;
    const shareText = isOwner
      ? `Check out my gift profile on GiftButler!`
      : `Check out ${displayName}'s gift profile on GiftButler!`;
    if (navigator.share && navigator.maxTouchPoints > 0) {
      try { await navigator.share({ title: `${displayName}'s Gift Profile`, text: shareText, url }); } catch { /* user cancelled */ }
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
      fetch(`/api/follows?username=${username}`)
        .then(r => r.json())
        .then(d => { if (d.status) setFollowStatus(d.status); });
      fetch("/api/me")
        .then(r => r.json())
        .then(d => { if (d.profile?.username) setMyUsername(d.profile.username); });
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
        if (recs?.length) {
          setRecommendations(recs);
          setMyClaims(claims || []);
          setRelationship(rel || "");
          setBudget(bud || "");
          setOccasion(occ || "");
        }
      }
    } catch { /* sessionStorage unavailable */ }
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
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ recommendations: data.recommendations, myClaims, relationship, budget, occasion }));
      } catch { /* sessionStorage unavailable */ }
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
      if (saved) {
        const data = JSON.parse(saved);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, myClaims: newClaims }));
      }
    } catch { /* sessionStorage unavailable */ }
    fetch("/api/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_username: username, gift_description: title, occasion }),
    }).catch(() => {}).finally(() => {
      setClaiming(null);
      setNotifyPromptTitle(title);
    });
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

  function startEditHint(hint: Hint) {
    setEditingHintId(hint.id);
    setEditContent(hint.content);
    setEditCategory(hint.category);
  }

  function cancelEditHint() {
    setEditingHintId(null);
    setEditContent("");
    setEditCategory("general");
  }

  async function saveHint(id: string) {
    if (!editContent.trim()) return;
    setHintSaving(true);
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
      setHintSaving(false);
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

  function isAlreadyClaimed(title: string): boolean {
    return existingClaims.some(c =>
      c.description === title.toLowerCase() &&
      (!c.occasion || !occasion || c.occasion === occasion)
    );
  }

  const hintsToShow = hints.filter(h => h.category !== "avoid");
  const avoidHints = hints.filter(h => h.category === "avoid");
  const daysUntilBirthday = profile.birthday ? getDaysUntilBirthday(profile.birthday) : null;
  const displayName = profile.name || username;

  // Fixed CTA: show for visitors when no recommendations yet
  const showFixedCTA = !isOwner && recommendations.length === 0;

  return (
    <main className="min-h-screen bg-[#FAF4EC]" style={{ paddingBottom: showFixedCTA ? "calc(5rem + env(safe-area-inset-bottom, 0px))" : "6rem" }}>

      {/* ── HERO ── */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #6B2437 0%, #4A1828 55%, #2A0E17 100%)" }}
      >
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, #C08A3C 0%, transparent 50%)" }} />

        {/* Nav inside hero */}
        <nav className="relative z-10 px-4 pt-4 pb-0 flex items-center justify-between max-w-xl mx-auto">
          <Link
            href={user ? (myUsername ? `/for/${myUsername}` : "/activity") : "/"}
            className="text-sm font-display text-white/80 tracking-wide hover:text-white transition-colors"
          >
            GiftButler
          </Link>
          <div className="flex items-center gap-2">
            {isLoaded && !user && (
              <Link href="/sign-up" className="px-3 py-1.5 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-xl text-xs transition-colors">
                Create yours →
              </Link>
            )}
            {isLoaded && user && (
              <Link href="/profile/edit" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#C08A3C]/50 hover:ring-[#C08A3C] transition-all flex-shrink-0">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #6B2437, #8B3050)" }}>
                    {user.firstName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </Link>
            )}
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-xl mx-auto px-4 pt-8 pb-10 text-center">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden ring-4 ring-[#C08A3C] shadow-lg">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: "linear-gradient(135deg, #6B2437, #8B3050)" }}>
                {profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + username */}
          <h1 className="text-3xl font-display text-white leading-tight mb-1">{displayName}</h1>
          <p className="text-white/50 text-sm mb-2">@{username}</p>
          {profile.bio && <p className="text-white/75 text-sm leading-relaxed max-w-xs mx-auto">{profile.bio}</p>}

          {/* Birthday countdown */}
          {daysUntilBirthday !== null && daysUntilBirthday <= 60 && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm">
              <Cake className="w-3.5 h-3.5 text-[#C08A3C]" />
              <span className="text-white/90 text-xs font-semibold">
                {daysUntilBirthday === 0
                  ? "Birthday is today! 🎉"
                  : daysUntilBirthday === 1
                  ? "Birthday is tomorrow!"
                  : `Birthday in ${daysUntilBirthday} days`}
              </span>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {/* Share */}
            <button
              onClick={shareProfile}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold hover:bg-white/25 transition-colors active:scale-95 duration-100"
            >
              <Share className="w-3.5 h-3.5 sm:hidden" />
              <Copy className="w-3.5 h-3.5 hidden sm:block" />
              {shareCopied ? "Link copied!" : isOwner ? "Share my profile" : `Share ${displayName}'s profile`}
            </button>

            {/* Edit (owner) */}
            {isOwner && (
              <Link
                href="/profile/edit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-xs font-semibold hover:bg-white/20 transition-colors active:scale-95 duration-100"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </Link>
            )}

            {/* Follow (visitor, signed in) */}
            {isLoaded && user && !isOwner && followStatus === "none" && !showLabelPicker && (
              <button
                onClick={() => setShowLabelPicker(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#C08A3C] hover:bg-[#A87A32] text-white text-xs font-bold transition-colors active:scale-95 duration-100"
              >
                + Add to my people
              </button>
            )}

            {isLoaded && user && !isOwner && followStatus === "pending" && (
              <span className="px-4 py-2 text-white/50 text-xs font-semibold">Request sent</span>
            )}
            {isLoaded && user && !isOwner && followStatus === "accepted" && (
              <span className="px-4 py-2 text-[#C08A3C] text-xs font-semibold">✓ Connected</span>
            )}
          </div>

          {/* Label picker */}
          {showLabelPicker && (
            <div className="mt-4 bg-white rounded-2xl shadow-card-lg p-4 text-left mx-auto max-w-xs">
              <p className="text-sm font-semibold text-[#1A1410] mb-3">Who is {displayName} to you?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {LABELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setSelectedLabel(l)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "border-[#6B2437] bg-[#F5E8EC] text-[#6B2437]" : "border-[#E5D9CC] text-[#7A6A5E] hover:border-[#6B2437]"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={sendFollowRequest}
                  disabled={!selectedLabel || followLoading}
                  className="flex-1 py-2 bg-[#C08A3C] hover:bg-[#A87A32] disabled:bg-[#E5D9CC] disabled:text-[#7A6A5E] text-white font-bold rounded-xl text-sm transition-colors"
                >
                  {followLoading ? "Sending..." : "Send request"}
                </button>
                <button
                  onClick={() => { setShowLabelPicker(false); setSelectedLabel(""); }}
                  className="px-4 py-2 border border-[#E5D9CC] text-[#7A6A5E] font-semibold rounded-xl text-sm hover:bg-[#EFE6DA] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* How it works — visitor education (shown once, before finder) */}
        {!isOwner && hintsToShow.length > 0 && recommendations.length === 0 && !showFinder && (() => {
          try { return !sessionStorage.getItem(`gb_recs_${username}`); } catch { return true; }
        })() && (
          <div className="bg-[#F5E8EC] border border-[#E5C8D0] rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-[#6B2437] mb-1">✨ How GiftButler works</p>
            <p className="text-[#4A1828] text-sm leading-relaxed">
              {displayName} dropped hints about their life, taste, and wishes. Our AI reads all of them together and suggests gifts they&apos;d genuinely love — personal, not generic.
            </p>
          </div>
        )}

        {/* Gift finder card */}
        {showFinder && recommendations.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-[#1A1410]">Find the perfect gift</h2>
              <button onClick={() => setShowFinder(false)} className="p-1 text-[#7A6A5E] hover:text-[#1A1410] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-[#7A6A5E] mb-1.5 block">I&apos;m their</label>
                <select
                  ref={relationshipRef}
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5D9CC] text-sm text-[#1A1410] focus:outline-none focus:ring-2 focus:ring-[#6B2437] bg-white"
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
                <label className="text-xs font-semibold text-[#7A6A5E] mb-1.5 block">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5D9CC] text-sm text-[#1A1410] focus:outline-none focus:ring-2 focus:ring-[#6B2437] bg-white"
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
                <label className="text-xs font-semibold text-[#7A6A5E] mb-1.5 block">Occasion <span className="text-[#E5D9CC] font-normal">(optional)</span></label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5D9CC] text-sm text-[#1A1410] focus:outline-none focus:ring-2 focus:ring-[#6B2437] bg-white"
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
            {generateError && (
              <p className="text-[#922B21] text-sm mb-3 text-center">{generateError}</p>
            )}
            <button
              onClick={generateGifts}
              disabled={!relationship || !budget || generating}
              className="w-full py-3.5 bg-[#C08A3C] hover:bg-[#A87A32] disabled:bg-[#E5D9CC] disabled:text-[#7A6A5E] text-white font-bold rounded-xl transition-colors active:scale-[0.98] duration-100"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Finding the perfect gift...
                </span>
              ) : generateError ? "Try again →" : "Generate gift ideas →"}
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (() => {
          const availableCategories = ["all", ...Array.from(new Set(recommendations.map(r => r.category)))];
          const filtered = categoryFilter === "all" ? recommendations : recommendations.filter(r => r.category === categoryFilter);
          const visible = showAllRecs ? filtered : filtered.slice(0, 5);
          return (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl text-[#1A1410]">Gift ideas for {displayName}</h2>
                <span className="text-xs text-[#7A6A5E]">{filtered.length} ideas</span>
              </div>

              {availableCategories.length > 2 && (
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter(cat); setShowAllRecs(false); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                        categoryFilter === cat
                          ? "bg-[#6B2437] text-white"
                          : "bg-[#EFE6DA] text-[#7A6A5E] hover:bg-[#E5D9CC]"
                      }`}
                    >
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
                    <div key={i} className={`bg-white rounded-2xl shadow-card p-4 border-l-4 ${
                      rec.category === "product" ? "border-l-[#C08A3C]" :
                      rec.category === "experience" ? "border-l-purple-400" :
                      rec.category === "subscription" ? "border-l-blue-400" :
                      "border-l-emerald-400"
                    } ${alreadyClaimed && !iMineThis ? "ring-1 ring-emerald-200" : ""} active:scale-[0.98] transition-transform duration-100`}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-semibold text-[#1A1410] text-sm leading-snug">{rec.title}</h3>
                        <span className="text-xs font-bold text-[#6B2437] bg-[#F5E8EC] px-2 py-0.5 rounded-full flex-shrink-0">{rec.priceRange}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-[#7A6A5E] capitalize">{GIFT_CATEGORY_EMOJI[rec.category]} {rec.category}</span>
                        {alreadyClaimed && !iMineThis && (
                          <span className="text-xs font-semibold text-[#2D6A4F] bg-emerald-50 px-2 py-0.5 rounded-full">Someone&apos;s on it</span>
                        )}
                      </div>
                      <p className="text-[#7A6A5E] text-xs leading-relaxed mb-3">{rec.why}</p>
                      <div className="flex gap-2">
                        <a
                          href={rec.searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-xl text-xs text-center transition-colors active:scale-95 duration-100"
                        >
                          Find this gift →
                        </a>
                        <button
                          onClick={() => claimGift(rec.title)}
                          disabled={iMineThis || alreadyClaimed || claiming === rec.title}
                          className="px-3 py-2 border border-[#E5D9CC] text-[#7A6A5E] text-xs font-semibold rounded-xl hover:bg-[#EFE6DA] disabled:bg-emerald-50 disabled:text-[#2D6A4F] disabled:border-emerald-200 transition-colors whitespace-nowrap"
                        >
                          {iMineThis ? "✓ You're getting this" : alreadyClaimed ? "✓ Taken" : "I'm getting this"}
                        </button>
                      </div>

                      {notifyPromptTitle === rec.title && (
                        <div className="mt-3 pt-3 border-t border-[#EFE6DA] flex items-center justify-between gap-3">
                          <p className="text-xs text-[#7A6A5E]">Let {displayName} know something is on the way?</p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={sendNotify}
                              className="px-3 py-1.5 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-lg text-xs transition-colors"
                            >
                              Send hint
                            </button>
                            <button
                              onClick={() => setNotifyPromptTitle(null)}
                              className="px-3 py-1.5 border border-[#E5D9CC] text-[#7A6A5E] font-semibold rounded-lg text-xs hover:bg-[#EFE6DA] transition-colors"
                            >
                              Keep secret
                            </button>
                          </div>
                        </div>
                      )}
                      {notifySent.has(rec.title) && (
                        <p className="mt-2 text-xs text-[#2D6A4F] font-semibold">✓ Hint sent — they know something&apos;s coming</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!showAllRecs && filtered.length > 5 && (
                <button
                  onClick={() => setShowAllRecs(true)}
                  className="w-full mt-3 py-2.5 border border-[#E5D9CC] text-[#7A6A5E] text-sm font-semibold rounded-xl hover:bg-[#EFE6DA] transition-colors"
                >
                  Show {filtered.length - 5} more ideas
                </button>
              )}

              <button
                onClick={() => {
                  setRecommendations([]);
                  setGenerateError("");
                  setShowFinder(true);
                  setCategoryFilter("all");
                  setShowAllRecs(false);
                  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => relationshipRef.current?.focus(), 400);
                }}
                className="w-full mt-2 py-2.5 border border-[#E5D9CC] text-[#7A6A5E] text-sm font-semibold rounded-xl hover:bg-[#EFE6DA] hover:text-[#1A1410] transition-colors"
              >
                Generate different ideas
              </button>
            </div>
          );
        })()}

        {/* CTA for signed-out visitors after generating */}
        {isLoaded && !user && (recommendations.length > 0 || showFinder) && (
          <div className="bg-[#F5E8EC] border border-[#E5C8D0] rounded-2xl shadow-card p-4 text-center mb-6">
            <p className="text-[#1A1410] font-semibold text-sm mb-1">Want your own GiftButler profile?</p>
            <p className="text-[#7A6A5E] text-xs mb-3">Free forever. Share your link. Get gifts you actually want.</p>
            <a href="/sign-up" className="inline-block px-5 py-2 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-xl text-sm transition-colors">
              Create my profile →
            </a>
          </div>
        )}

        {/* ── OWNER: Drop a hint ── */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
            <p className="text-sm font-semibold text-[#1A1410] mb-0.5">Drop a hint</p>
            <p className="text-xs text-[#7A6A5E] mb-3">The AI reads all your hints together to suggest gifts people know you&apos;ll love.</p>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
              {HINT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setHintCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${hintCategory === c.id ? "border-[#6B2437] bg-[#F5E8EC] text-[#6B2437]" : "border-[#E5D9CC] text-[#7A6A5E] hover:border-[#6B2437]"}`}
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
                  placeholder={HINT_CATEGORIES.find(c => c.id === hintCategory)?.placeholder || "Add a hint..."}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E5D9CC] text-sm text-[#1A1410] placeholder-[#7A6A5E] focus:outline-none focus:ring-2 focus:ring-[#6B2437]"
                />
                <button
                  type="submit"
                  disabled={!newHint.trim() || adding}
                  className="px-4 py-2.5 bg-[#C08A3C] hover:bg-[#A87A32] disabled:bg-[#E5D9CC] disabled:text-[#7A6A5E] text-white font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
                >
                  {adding ? "..." : "Add"}
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                {addError
                  ? <p className="text-[#922B21] text-xs">{addError}</p>
                  : newHint.trim().length > 0 && newHint.trim().length < 40 && hintCategory !== "avoid"
                    ? <p className="text-xs text-[#7A6A5E]">More detail = better gifts. What kind? What do you already have?</p>
                    : <span />
                }
                {newHint.length > 0 && (
                  <p className={`text-xs ml-auto flex-shrink-0 ${newHint.length >= 260 ? "text-[#922B21]" : "text-[#7A6A5E]"}`}>
                    {280 - newHint.length} left
                  </p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Owner progress nudge */}
        {isOwner && hintsToShow.length >= 1 && hintsToShow.length < 8 && (
          <div className="bg-[#F5E8EC] border border-[#E5C8D0] rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-[#6B2437]">
                {hintsToShow.length < 3 ? "Great start — keep going" : hintsToShow.length < 5 ? "Building nicely" : "Almost there"}
              </p>
              <span className="text-xs font-bold text-[#6B2437]">{hintsToShow.length} / 8</span>
            </div>
            <div className="w-full h-1 bg-[#E5C8D0] rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-[#6B2437] rounded-full transition-all" style={{ width: `${Math.round((hintsToShow.length / 8) * 100)}%` }} />
            </div>
            <p className="text-xs text-[#4A1828] leading-relaxed">
              {hintsToShow.length < 3
                ? "Add a few more hints — the AI needs context to move beyond generic suggestions."
                : hintsToShow.length < 5
                ? "You're getting there. More hints means the AI can match your actual taste."
                : "Almost at the sweet spot. 8+ hints is where gift ideas start feeling truly personal."}
            </p>
          </div>
        )}

        {isOwner && hintsToShow.length >= 8 && (
          <div className="flex items-center gap-2 px-1 mb-4">
            <span className="text-[#2D6A4F] text-sm">✓</span>
            <p className="text-xs text-[#7A6A5E]">Your profile is looking great — visitors will get highly personal gift ideas.</p>
          </div>
        )}

        {/* Hints feed */}
        {(isOwner || hintsToShow.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-widest mb-3">
              {isOwner ? "My Hints" : `${displayName}\u2019s hints`}
            </h2>
            {isOwner && hints.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card p-6 text-center">
                <p className="text-3xl mb-3">🎁</p>
                <p className="font-bold text-[#1A1410] mb-2">Your hints = gifts people actually want to give</p>
                <p className="text-[#7A6A5E] text-sm leading-relaxed mb-4 max-w-xs mx-auto">
                  When someone visits your profile, the AI reads all your hints together and suggests gifts you&apos;d genuinely love — not a generic Amazon search.
                </p>
                <p className="text-xs text-[#7A6A5E]">Start above — what have you been into lately?</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {hintsToShow.map((hint) => {
                  const cat = CATEGORIES[hint.category as keyof typeof CATEGORIES] || CATEGORIES.general;
                  return (
                    <div key={hint.id} className="bg-white rounded-2xl shadow-card px-4 py-3 group">
                      {isOwner && editingHintId === hint.id ? (
                        <div>
                          <div className="flex gap-1.5 flex-wrap mb-2">
                            {HINT_CATEGORIES.map(c => (
                              <button
                                key={c.id}
                                onClick={() => setEditCategory(c.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${editCategory === c.id ? "border-[#6B2437] bg-[#F5E8EC] text-[#6B2437]" : "border-[#E5D9CC] text-[#7A6A5E] hover:border-[#6B2437]"}`}
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
                            className="w-full px-3 py-2 rounded-xl border border-[#6B2437] text-sm text-[#1A1410] focus:outline-none resize-none mb-2"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveHint(hint.id)}
                                disabled={!editContent.trim() || hintSaving}
                                className="px-3 py-1.5 bg-[#C08A3C] hover:bg-[#A87A32] disabled:bg-[#E5D9CC] disabled:text-[#7A6A5E] text-white font-semibold rounded-lg text-xs transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditHint}
                                className="px-3 py-1.5 border border-[#E5D9CC] text-[#7A6A5E] font-semibold rounded-lg text-xs hover:bg-[#EFE6DA] transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                            <span className={`text-xs ${editContent.length >= 260 ? "text-[#922B21]" : "text-[#7A6A5E]"}`}>
                              {280 - editContent.length} left
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1 ${cat.color}`}>
                              {cat.label}
                            </span>
                            <p className="text-[#1A1410] text-sm">{hint.content}</p>
                          </div>
                          {isOwner && (
                            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              {confirmDeleteId === hint.id ? (
                                <>
                                  <button
                                    onClick={() => deleteHint(hint.id)}
                                    className="px-2 py-1 bg-[#922B21] text-white text-xs font-semibold rounded-lg"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2 py-1 border border-[#E5D9CC] text-[#7A6A5E] text-xs font-semibold rounded-lg hover:bg-[#EFE6DA]"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditHint(hint)}
                                    aria-label="Edit hint"
                                    className="p-1 text-[#E5D9CC] hover:text-[#C08A3C] transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(hint.id)}
                                    aria-label="Delete hint"
                                    className="p-1 text-[#E5D9CC] hover:text-[#922B21] transition-colors text-lg leading-none"
                                  >
                                    ×
                                  </button>
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

        {/* Avoid nudge — owner only */}
        {isOwner && avoidHints.length === 0 && hints.length > 0 && (
          <button
            onClick={() => setHintCategory("avoid")}
            className="w-full mb-4 px-4 py-3 border border-dashed border-[#E5C8D0] rounded-2xl text-left hover:bg-[#F5E8EC] transition-colors group"
          >
            <p className="text-sm font-semibold text-[#922B21] group-hover:text-[#6B2437]">+ What should people NOT get you?</p>
            <p className="text-xs text-[#7A6A5E] mt-0.5">Candles? Socks? Tell them — it saves everyone.</p>
          </button>
        )}

        {/* Avoid section */}
        {avoidHints.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold text-[#922B21] uppercase tracking-wide mb-2">Please avoid</p>
            <ul className="flex flex-col gap-1">
              {avoidHints.map((hint) => (
                <li key={hint.id} className="flex items-center justify-between gap-3">
                  <span className="text-[#922B21] text-sm">— {hint.content}</span>
                  {isOwner && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {confirmDeleteId === hint.id ? (
                        <>
                          <button onClick={() => deleteHint(hint.id)} className="px-2 py-1 bg-[#922B21] text-white text-xs font-semibold rounded-lg">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 border border-red-200 text-[#922B21] text-xs font-semibold rounded-lg hover:bg-red-50">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(hint.id)} aria-label="Delete hint" className="p-1 text-red-200 hover:text-[#922B21] transition-colors text-lg leading-none">×</button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-[#E5D9CC]">
            As an Amazon Associate, GiftButler earns from qualifying purchases.{" "}
            <a href="/privacy" className="hover:text-[#7A6A5E] underline">Privacy</a>
            {" "}·{" "}
            <a href="/terms" className="hover:text-[#7A6A5E] underline">Terms</a>
          </p>
        </div>
      </div>

      {/* ── FIXED BOTTOM CTA — visitor, thumb zone ── */}
      {showFixedCTA && (
        <div
          className="fixed bottom-0 left-0 right-0 z-30 px-4 bg-white border-t border-[#E5D9CC]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)", paddingTop: "12px" }}
        >
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => setShowFinder(true)}
              className="w-full py-3.5 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-bold rounded-2xl text-base transition-colors shadow-card active:scale-[0.98] duration-100"
            >
              {hintsToShow.length > 0
                ? `Find ${displayName} a gift →`
                : `Find a gift for ${displayName} →`}
            </button>
          </div>
        </div>
      )}

      {isLoaded && user && <BottomTabBar myUsername={myUsername} />}
    </main>
  );
}
