"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Share, Users, Cake, Bell, Pencil, MessageSquare } from "lucide-react";
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

const GIFT_CATEGORY_BORDER: Record<string, string> = {
  product: "border-l-amber-400",
  experience: "border-l-purple-400",
  subscription: "border-l-blue-400",
  consumable: "border-l-green-500",
};

interface ClaimRecord {
  description: string;
  occasion: string | null;
}

const CATEGORIES = {
  general: { label: "Into lately", color: "bg-amber-100 text-amber-700" },
  love: { label: "Love", color: "bg-pink-100 text-pink-600" },
  like: { label: "Like", color: "bg-sky-100 text-sky-600" },
  want: { label: "Want", color: "bg-blue-100 text-blue-600" },
  need: { label: "Need", color: "bg-green-100 text-green-600" },
  dream: { label: "Dream", color: "bg-purple-100 text-purple-600" },
  style: { label: "My Style", color: "bg-violet-100 text-violet-600" },
  avoid: { label: "Please no", color: "bg-red-100 text-red-600" },
};

const HINT_CATEGORIES = [
  { id: "general", label: "Into lately", placeholder: "I've been really into sourdough baking..." },
  { id: "love", label: "Love", placeholder: "Fresh flowers, especially tulips..." },
  { id: "like", label: "Like", placeholder: "I enjoy a good audiobook..." },
  { id: "want", label: "Want", placeholder: "I've been wanting to try a standing desk..." },
  { id: "need", label: "Need", placeholder: "My headphones are finally dying..." },
  { id: "dream", label: "Dream", placeholder: "Someday I'd love to go to Japan..." },
  { id: "style", label: "My Style", placeholder: "I wear a medium, prefer minimalist design, love earth tones..." },
  { id: "avoid", label: "Please no", placeholder: "No more candles or gift cards please..." },
];

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
  const LABELS = ["Husband", "Wife", "Partner", "Dad", "Mom", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", "Grandson", "Granddaughter", "Uncle", "Aunt", "Nephew", "Niece", "Cousin", "Best Friend", "Friend", "Colleague", "Other"];
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

  // Record visit client-side — wait until auth is known, skip if owner
  useEffect(() => {
    if (!isLoaded) return;
    if (!isOwner) {
      const ref = encodeURIComponent(document.referrer || "");
      fetch(`/api/profile/${username}?ref=${ref}`);
    }
  }, [username, isOwner, isLoaded]);

  // Fetch follow status and own username
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

  // Restore recommendations from sessionStorage on mount
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
    // Persist updated claims to sessionStorage
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
    }).catch(() => { /* silent fail — optimistic UI already updated */ }).finally(() => {
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

  // A gift is "already claimed" if same title AND (no occasion specified OR occasions match)
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

  return (
    <main className="min-h-screen bg-[#fef9ef]">
      {/* Nav */}
      <nav className="border-b border-amber-100/70 bg-[#fef9ef]">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href={user ? (myUsername ? `/for/${myUsername}` : "/activity") : "/"} className="text-base font-display text-stone-900 tracking-wide">GiftButler</Link>
          {isLoaded && (isOwner || user ? (
            <div className="flex items-center gap-2">
              <Link href="/my-people" title="My People" aria-label="My People" className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors">
                <Users className="w-5 h-5" />
              </Link>
              <Link href="/activity" title="Activity" aria-label="Activity" className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
              </Link>
              <Link href="/profile/edit" title="Edit profile" aria-label="Edit profile" className={`w-8 h-8 rounded-full overflow-hidden ring-2 transition-all flex-shrink-0 ${isOwner ? "ring-amber-400" : "ring-transparent hover:ring-amber-400"}`}>
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-amber-400 flex items-center justify-center text-xs font-bold text-stone-900">
                    {user?.firstName?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </Link>
            </div>
          ) : (
            <Link href="/sign-up" className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs transition-colors">
              Create yours free →
            </Link>
          ))}
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Birthday countdown banner */}
        {daysUntilBirthday !== null && daysUntilBirthday <= 60 && (
          <div className="bg-amber-400 rounded-2xl px-4 py-3 mb-5 flex items-center gap-3">
            <Cake className="w-7 h-7 text-stone-900 flex-shrink-0" />
            <div>
              {daysUntilBirthday === 0 ? (
                <p className="font-bold text-stone-900">Today is {displayName}&apos;s birthday!</p>
              ) : daysUntilBirthday === 1 ? (
                <p className="font-bold text-stone-900">{displayName}&apos;s birthday is <span className="underline">tomorrow</span></p>
              ) : (
                <p className="font-bold text-stone-900">{displayName}&apos;s birthday is in <span className="underline">{daysUntilBirthday} days</span></p>
              )}
              <p className="text-stone-700 text-xs">Don&apos;t leave it too late — find the perfect gift below</p>
            </div>
          </div>
        )}

        {/* Profile header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden ring-4 ring-white shadow-md">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-amber-400 flex items-center justify-center text-2xl font-bold text-stone-900">
                {profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <h1 className="text-3xl font-display text-stone-900 leading-tight">{displayName}</h1>
          <p className="text-stone-400 text-sm mt-1">@{username}</p>
          {profile.bio && <p className="text-stone-600 text-sm mt-2">{profile.bio}</p>}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {/* For visitors, Add to my people is the primary action */}
            {isLoaded && user && !isOwner && followStatus === "none" && !showLabelPicker && (
              <button
                onClick={() => setShowLabelPicker(true)}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors inline-flex items-center gap-2"
              >
                + Add to my people
              </button>
            )}

            {/* Share — primary for owner, secondary for visitor */}
            <button
              onClick={shareProfile}
              className={`px-5 py-2 font-semibold rounded-xl text-sm transition-colors inline-flex items-center gap-2 ${
                isOwner
                  ? "bg-amber-400 hover:bg-amber-500 text-stone-900"
                  : "border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-800"
              }`}
            >
              <Share className="w-4 h-4 sm:hidden" />
              <Copy className="w-4 h-4 hidden sm:block" />
              {shareCopied ? "Link copied!" : isOwner ? "Share my profile" : `Share ${displayName}'s profile`}
            </button>

            {isOwner && (
              <Link
                href="/profile/edit"
                className="px-5 py-2 border border-stone-200 hover:border-stone-300 text-stone-600 hover:text-stone-800 font-semibold rounded-xl text-sm transition-colors inline-flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit profile
              </Link>
            )}

            {/* Follow status indicators — only for signed-in non-owners */}
            {isLoaded && user && !isOwner && (
              <>
                {followStatus === "pending" && (
                  <span className="px-5 py-2 text-stone-400 font-semibold text-sm">
                    Request sent
                  </span>
                )}
                {followStatus === "accepted" && (
                  <span className="px-5 py-2 text-green-600 font-semibold text-sm">
                    ✓ Connected
                  </span>
                )}
              </>
            )}
          </div>

          {/* Label picker */}
          {showLabelPicker && (
            <div className="mt-3 bg-white rounded-2xl shadow-card p-4 text-left">
              <p className="text-sm font-semibold text-stone-700 mb-3">Who is {displayName} to you?</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {LABELS.map(l => (
                  <button
                    key={l}
                    onClick={() => setSelectedLabel(l)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={sendFollowRequest}
                  disabled={!selectedLabel || followLoading}
                  className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-xl text-sm transition-colors"
                >
                  {followLoading ? "Sending..." : "Send request"}
                </button>
                <button
                  onClick={() => { setShowLabelPicker(false); setSelectedLabel(""); }}
                  className="px-4 py-2 border border-stone-200 text-stone-500 font-semibold rounded-xl text-sm hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Find a gift button */}
        {!showFinder && recommendations.length === 0 && (
          <div className="mb-6">
            {!isOwner && hintsToShow.length > 0 && recommendations.length === 0 && (() => {
              try { return !sessionStorage.getItem(`gb_recs_${username}`); } catch { return true; }
            })() && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">✨ How GiftButler works</p>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {displayName} dropped hints about their life, taste, and wishes. Our AI reads all of them together — not just one — and suggests gifts they&apos;d genuinely love. Personal, not generic.
                </p>
              </div>
            )}
            <button
              onClick={() => setShowFinder(true)}
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-2xl text-base transition-colors shadow-sm"
            >
              {hintsToShow.length > 0
                ? `Get AI gift ideas based on ${displayName}'s hints →`
                : `Find a gift for ${displayName} →`}
            </button>
            {hintsToShow.length === 0 && !isOwner && (
              <p className="text-center text-xs text-stone-400 mt-2">
                {displayName} hasn&apos;t added hints yet — we&apos;ll suggest based on your relationship and budget.
              </p>
            )}
          </div>
        )}

        {/* Gift finder */}
        {showFinder && recommendations.length === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-5 mb-6">
            <h2 className="font-display text-xl text-stone-900 mb-4">Find the perfect gift</h2>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-stone-500 mb-1 block">I&apos;m their</label>
                <select
                  ref={relationshipRef}
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
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
                <label className="text-xs font-semibold text-stone-500 mb-1 block">Budget</label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
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
                <label className="text-xs font-semibold text-stone-500 mb-1 block">Occasion (optional)</label>
                <select
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
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
              <p className="text-red-500 text-sm mb-3 text-center">{generateError}</p>
            )}
            <button
              onClick={generateGifts}
              disabled={!relationship || !budget || generating}
              className="w-full py-3 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-xl transition-colors"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin inline-block" />
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
                <h2 className="font-display text-xl text-stone-900">Gift ideas for {displayName}</h2>
                <span className="text-xs text-stone-400">{filtered.length} ideas</span>
              </div>

              {/* Category filter tabs */}
              {availableCategories.length > 2 && (
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setCategoryFilter(cat); setShowAllRecs(false); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                        categoryFilter === cat
                          ? "bg-amber-400 text-stone-900 border border-amber-400"
                          : "bg-stone-100 border border-transparent text-stone-500 hover:bg-stone-200"
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
                    <div key={i} className={`bg-white rounded-2xl shadow-card p-4 border-l-4 ${GIFT_CATEGORY_BORDER[rec.category] || "border-l-stone-200"} ${alreadyClaimed && !iMineThis ? "ring-1 ring-green-200 bg-green-50/30" : ""}`}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <h3 className="font-semibold text-stone-900 text-sm leading-snug">{rec.title}</h3>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">{rec.priceRange}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-stone-400 capitalize">{rec.category}</span>
                        {alreadyClaimed && !iMineThis && (
                          <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Someone&apos;s on it</span>
                        )}
                      </div>
                      <p className="text-stone-500 text-xs leading-relaxed mb-3">{rec.why}</p>
                      <div className="flex gap-2">
                        <a
                          href={rec.searchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs text-center transition-colors"
                        >
                          Find this gift →
                        </a>
                        <button
                          onClick={() => claimGift(rec.title)}
                          disabled={iMineThis || alreadyClaimed || claiming === rec.title}
                          className="px-3 py-2 border border-stone-200 text-stone-500 text-xs font-semibold rounded-xl hover:bg-stone-50 disabled:bg-green-50 disabled:text-green-600 disabled:border-green-200 transition-colors whitespace-nowrap"
                        >
                          {iMineThis ? "✓ You're getting this" : alreadyClaimed ? "✓ Taken" : "I'm getting this"}
                        </button>
                      </div>

                      {/* Notify prompt — appears once after claiming */}
                      {notifyPromptTitle === rec.title && (
                        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                          <p className="text-xs text-stone-500">Let {displayName} know something is on the way?</p>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={sendNotify}
                              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-lg text-xs transition-colors"
                            >
                              Send hint
                            </button>
                            <button
                              onClick={() => setNotifyPromptTitle(null)}
                              className="px-3 py-1.5 border border-stone-200 text-stone-400 font-semibold rounded-lg text-xs hover:bg-stone-50 transition-colors"
                            >
                              Keep secret
                            </button>
                          </div>
                        </div>
                      )}
                      {notifySent.has(rec.title) && (
                        <p className="mt-2 text-xs text-green-600 font-semibold">✓ Hint sent — they know something&apos;s coming</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!showAllRecs && filtered.length > 5 && (
                <button
                  onClick={() => setShowAllRecs(true)}
                  className="w-full mt-3 py-2.5 border border-stone-200 text-stone-600 text-sm font-semibold rounded-xl hover:bg-stone-50 transition-colors"
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
                className="w-full mt-2 py-2.5 border border-stone-200 text-stone-400 text-sm font-semibold rounded-xl hover:bg-stone-50 hover:text-stone-600 transition-colors"
              >
                Generate different ideas
              </button>
            </div>
          );
        })()}

        {/* CTA for signed-out visitors — shown after recommendations or gift finder */}
        {isLoaded && !user && (recommendations.length > 0 || showFinder) && (
          <div className="bg-amber-50 rounded-2xl shadow-card p-4 text-center mb-6">
            <p className="text-stone-700 font-semibold text-sm mb-1">Want your own GiftButler profile?</p>
            <p className="text-stone-400 text-xs mb-3">Free forever. Share your link. Get gifts you actually want.</p>
            <a href="/sign-up" className="inline-block px-5 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-sm transition-colors">
              Create my profile →
            </a>
          </div>
        )}

        {/* Drop a hint — owner only */}
        {isOwner && (
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
            <p className="text-sm font-semibold text-stone-700 mb-0.5">Drop a hint</p>
            <p className="text-xs text-stone-400 mb-3">The AI reads all your hints together to suggest gifts people know you&apos;ll love.</p>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
              {HINT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setHintCategory(c.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all flex-shrink-0 ${hintCategory === c.id ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
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
                  : newHint.trim().length > 0 && newHint.trim().length < 40 && hintCategory !== "avoid"
                    ? <p className="text-xs text-stone-400">More detail = better gifts. What kind? What do you already have?</p>
                    : <span />
                }
                {newHint.length > 0 && (
                  <p className={`text-xs ml-auto flex-shrink-0 ${newHint.length >= 260 ? "text-red-400" : "text-stone-400"}`}>
                    {280 - newHint.length} left
                  </p>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Owner hints progress nudge — above hint list so goal is set before they read */}
        {isOwner && hintsToShow.length >= 1 && hintsToShow.length < 8 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-amber-800">
                {hintsToShow.length < 3 ? "Great start — keep going" : hintsToShow.length < 5 ? "Building nicely" : "Almost there"}
              </p>
              <span className="text-xs font-bold text-amber-700">{hintsToShow.length} / 8</span>
            </div>
            <div className="w-full h-1.5 bg-amber-200 rounded-full mb-2 overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.round((hintsToShow.length / 8) * 100)}%` }} />
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              {hintsToShow.length < 3
                ? "Add a few more hints — the AI needs context to move beyond generic suggestions."
                : hintsToShow.length < 5
                ? "You're getting there. More hints means the AI can match your actual taste, not just your category."
                : "Almost at the sweet spot. 8+ hints is where gift ideas start feeling like they came from someone who truly knows you."}
            </p>
          </div>
        )}

        {/* Owner profile complete confirmation */}
        {isOwner && hintsToShow.length >= 8 && (
          <div className="flex items-center gap-2 px-1 mb-4">
            <span className="text-green-500 text-sm">✓</span>
            <p className="text-xs text-stone-400">Your profile is looking great — visitors will get highly personal gift ideas.</p>
          </div>
        )}

        {/* Hints feed */}
        {(isOwner || hintsToShow.length > 0) && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
              {isOwner ? "My Hints" : `${displayName}\u2019s hints`}
            </h2>
            {isOwner && hints.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-card p-6 text-center">
                <p className="text-3xl mb-3">🎁</p>
                <p className="font-bold text-stone-900 mb-2">Your hints = gifts people actually want to give</p>
                <p className="text-stone-500 text-sm leading-relaxed mb-4 max-w-xs mx-auto">
                  When someone visits your profile, the AI reads all your hints together and suggests gifts you&apos;d genuinely love — not a generic Amazon search. The more you share, the more personal the ideas.
                </p>
                <p className="text-xs text-stone-400">Start above — what have you been into lately?</p>
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
                                disabled={!editContent.trim() || hintSaving}
                                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-semibold rounded-lg text-xs transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditHint}
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
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mb-1 ${cat.color}`}>
                              {cat.label}
                            </span>
                            <p className="text-stone-800 text-sm">{hint.content}</p>
                          </div>
                          {isOwner && (
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

        {/* Avoid nudge — owner only, no avoid hints yet */}
        {isOwner && avoidHints.length === 0 && hints.length > 0 && (
          <button
            onClick={() => setHintCategory("avoid")}
            className="w-full mb-4 px-4 py-3 border border-dashed border-red-200 rounded-2xl text-left hover:bg-red-50 transition-colors group"
          >
            <p className="text-sm font-semibold text-red-500 group-hover:text-red-600">+ What should people NOT get you?</p>
            <p className="text-xs text-red-400 mt-0.5">Candles? Socks? Tell them — it saves everyone.</p>
          </button>
        )}

        {/* Avoid section */}
        {avoidHints.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6">
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Please avoid</p>
            <ul className="flex flex-col gap-1">
              {avoidHints.map((hint) => (
                <li key={hint.id} className="flex items-center justify-between gap-3">
                  <span className="text-red-700 text-sm">— {hint.content}</span>
                  {isOwner && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {confirmDeleteId === hint.id ? (
                        <>
                          <button onClick={() => deleteHint(hint.id)} className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-lg">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 border border-red-200 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-50">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(hint.id)} aria-label="Delete hint" className="p-1 text-red-300 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-stone-300">
            As an Amazon Associate, GiftButler earns from qualifying purchases.{" "}
            <a href="/privacy" className="hover:text-stone-400 underline">Privacy</a>
            {" "}·{" "}
            <a href="/terms" className="hover:text-stone-400 underline">Terms</a>
          </p>
        </div>
      </div>
    </main>
  );
}
