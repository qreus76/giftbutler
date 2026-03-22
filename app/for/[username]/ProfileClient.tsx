"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Copy, Share, Cake, Pencil, X, ArrowRight, ExternalLink, Link2,
  Gift, Sparkles, Lightbulb, CalendarDays, Plus, Check,
  Globe, Lock, Users,
} from "lucide-react";
import BottomTabBar from "@/app/components/BottomTabBar";
import { useUser } from "@clerk/nextjs";
import type { Profile, Hint, Occasion } from "@/lib/supabase";
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

const VISIBILITY_CONFIG = {
  public:      { icon: Globe,  label: "Public",     color: "text-[#888888]",  bg: "bg-[#F5F5F0]" },
  connections: { icon: Users,  label: "My people",  color: "text-[#2D4A1E]",  bg: "bg-[#C4D4B4]/40" },
  private:     { icon: Lock,   label: "Only me",    color: "text-[#111111]",  bg: "bg-[#EAEAE0]" },
};

type VisibilityLevel = "public" | "connections" | "private";

const VISIBILITY_CYCLE: VisibilityLevel[] = ["public", "connections", "private"];

// Returns next occurrence of a known holiday as ISO date string, or null
function getNextHolidayDate(name: string): string | null {
  const n = name.trim().toLowerCase().replace(/'/g, "'");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const toISO = (d: Date) => d.toISOString().split("T")[0];
  function nextFixed(month: number, day: number) {
    let d = new Date(today.getFullYear(), month, day);
    if (d < today) d = new Date(today.getFullYear() + 1, month, day);
    return toISO(d);
  }
  function nextNth(month: number, n: number, wd: number) {
    for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
      let count = 0;
      for (let d = 1; d <= 31; d++) {
        const dt = new Date(y, month, d);
        if (dt.getMonth() !== month) break;
        if (dt.getDay() === wd && ++count === n && dt >= today) return toISO(dt);
      }
    }
    return null;
  }
  function nextLast(month: number, wd: number) {
    for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
      let last: Date | null = null;
      for (let d = 1; d <= 31; d++) {
        const dt = new Date(y, month, d);
        if (dt.getMonth() !== month) break;
        if (dt.getDay() === wd) last = dt;
      }
      if (last && last >= today) return toISO(last);
    }
    return null;
  }
  if (n === "christmas" || n === "christmas day") return nextFixed(11, 25);
  if (n === "valentine's day" || n === "valentines day") return nextFixed(1, 14);
  if (n === "halloween") return nextFixed(9, 31);
  if (n === "new year's day" || n === "new years day" || n === "new year") return nextFixed(0, 1);
  if (n === "independence day" || n === "4th of july" || n === "july 4th") return nextFixed(6, 4);
  if (n === "mother's day" || n === "mothers day") return nextNth(4, 2, 0);
  if (n === "father's day" || n === "fathers day") return nextNth(5, 3, 0);
  if (n === "thanksgiving") return nextNth(10, 4, 4);
  if (n === "memorial day") return nextLast(4, 1);
  if (n === "labor day") return nextNth(8, 1, 1);
  return null;
}

// ─── Module-level sub-components ─────────────────────────────────────────────
// These MUST live outside ProfileClient. Defining them inside the parent causes
// React to see a new function reference every render → unmount/remount → lost focus.

function VisibilityToggle({ visibility, onToggle }: { visibility: VisibilityLevel; onToggle: () => void }) {
  const cfg = VISIBILITY_CONFIG[visibility] || VISIBILITY_CONFIG.public;
  const Icon = cfg.icon;
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors hover:opacity-80 ${cfg.color} ${cfg.bg}`}
      title="Change who can see this list"
    >
      <Icon className="w-3 h-3" /> {cfg.label}
    </button>
  );
}

interface ClaimButtonProps {
  title: string;
  existingClaims: ClaimRecord[];
  myClaims: string[];
  claiming: string | null;
  confirmUnclaim: string | null;
  occasion: string;
  claimGift: (title: string) => void;
  unclaimGift: (title: string) => void;
  setConfirmUnclaim: (v: string | null) => void;
}

function ClaimButton({ title, existingClaims, myClaims, claiming, confirmUnclaim, occasion, claimGift, unclaimGift, setConfirmUnclaim }: ClaimButtonProps) {
  const alreadyClaimed = existingClaims.some(c => c.description === title.toLowerCase() && (!c.occasion || !occasion || c.occasion === occasion));
  const iMineThis = myClaims.includes(title);
  if (confirmUnclaim === title) {
    return (
      <>
        <button onClick={() => unclaimGift(title)} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-full text-xs transition-colors">Release</button>
        <button onClick={() => setConfirmUnclaim(null)} className="flex-1 py-2.5 bg-[#EAEAE0] hover:bg-[#D8D8D0] text-[#888888] font-semibold rounded-full text-xs transition-colors">Keep</button>
      </>
    );
  }
  return (
    <button
      onClick={() => iMineThis ? setConfirmUnclaim(title) : claimGift(title)}
      disabled={!iMineThis && (alreadyClaimed || claiming === title)}
      className="flex-1 py-2.5 bg-[#C4D4B4] hover:bg-[#B4C8A4] disabled:bg-[#EAEAE0] disabled:text-[#888888] text-[#2D4A1E] font-bold rounded-full text-sm transition-colors"
    >
      {iMineThis ? <span className="flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> I&apos;m getting this</span> : alreadyClaimed ? <span className="flex items-center justify-center gap-1"><Check className="w-3.5 h-3.5" /> Someone&apos;s on it</span> : "I'm getting this"}
    </button>
  );
}

interface ProductHintCardProps {
  hint: Hint;
  showClaim?: boolean;
  existingClaims: ClaimRecord[];
  myClaims: string[];
  claiming: string | null;
  confirmUnclaim: string | null;
  occasion: string;
  claimGift: (title: string) => void;
  unclaimGift: (title: string) => void;
  setConfirmUnclaim: (v: string | null) => void;
  isOwner: boolean;
  editingProductHintId: string | null;
  editProductTitle: string;
  setEditProductTitle: (v: string) => void;
  editProductOccasionId: string;
  setEditProductOccasionId: (v: string) => void;
  occasions: Occasion[];
  editProductSaving: boolean;
  saveProductHint: (id: string) => void;
  setEditingProductHintId: (v: string | null) => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (v: string | null) => void;
  deleteHint: (id: string) => void;
  startEditProductHint: (hint: Hint) => void;
  notifyPromptTitle: string | null;
  displayName: string;
  sendNotify: () => void;
  setNotifyPromptTitle: (v: string | null) => void;
  notifySent: Set<string>;
}

function ProductHintCard({ hint, showClaim = false, existingClaims, myClaims, claiming, confirmUnclaim, occasion, claimGift, unclaimGift, setConfirmUnclaim, isOwner, editingProductHintId, editProductTitle, setEditProductTitle, editProductOccasionId, setEditProductOccasionId, occasions, editProductSaving, saveProductHint, setEditingProductHintId, confirmDeleteId, setConfirmDeleteId, deleteHint, startEditProductHint, notifyPromptTitle, displayName, sendNotify, setNotifyPromptTitle, notifySent }: ProductHintCardProps) {
  const claimKey = hint.product_title || hint.content;
  const alreadyClaimed = existingClaims.some(c => c.description === claimKey.toLowerCase() && (!c.occasion || !occasion || c.occasion === occasion));
  const iMineThis = myClaims.includes(claimKey);
  const claimProps: ClaimButtonProps = { title: claimKey, existingClaims, myClaims, claiming, confirmUnclaim, occasion, claimGift, unclaimGift, setConfirmUnclaim };
  return (
    <div className={`bg-white rounded-2xl shadow-card overflow-hidden ${alreadyClaimed && !iMineThis ? "ring-1 ring-emerald-300" : ""}`}>
      <div className="flex gap-3 p-4">
        {hint.product_image && (
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F5F0]">
            <img src={hint.product_image} alt={hint.product_title || ""} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#111111] text-sm leading-snug mb-1 line-clamp-2">{hint.product_title || hint.content}</p>
          {hint.product_price && <p className="text-base font-bold text-[#111111] mb-1">{hint.product_price}</p>}
          {alreadyClaimed && !iMineThis && <span className="text-xs font-semibold text-emerald-700 bg-[#C4D4B4] px-2 py-0.5 rounded-full">Someone&apos;s on it</span>}
        </div>
      </div>
      {isOwner && editingProductHintId === hint.id ? (
        <div className="px-4 pb-4 flex flex-col gap-2">
          <input
            value={editProductTitle}
            onChange={e => setEditProductTitle(e.target.value)}
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
          />
          {occasions.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-xs text-[#888888] self-center">List:</span>
              <button onClick={() => setEditProductOccasionId("hints")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${editProductOccasionId === "hints" ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                Hints
              </button>
              {occasions.map(o => (
                <button key={o.id} onClick={() => setEditProductOccasionId(o.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${editProductOccasionId === o.id ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                  {o.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => saveProductHint(hint.id)} disabled={!editProductTitle.trim() || editProductSaving}
              className="flex-1 py-2 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-xs transition-colors">
              {editProductSaving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => setEditingProductHintId(null)}
              className="flex-1 py-2 bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-xs transition-colors">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-4 flex gap-2">
          <a href={hint.url!} target="_blank" rel="noopener noreferrer"
            className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm text-center transition-colors flex items-center justify-center gap-1.5">
            View item <ExternalLink className="w-3.5 h-3.5" />
          </a>
          {showClaim && <ClaimButton {...claimProps} />}
          {!showClaim && isOwner && (
            confirmDeleteId === hint.id ? (
              <>
                <button onClick={() => deleteHint(hint.id)} className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-full text-xs transition-colors">Delete</button>
                <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2.5 bg-[#EAEAE0] text-[#888888] font-semibold rounded-full text-xs transition-colors">Cancel</button>
              </>
            ) : (
              <div className="flex gap-1">
                <button onClick={() => startEditProductHint(hint)} className="p-2.5 text-[#CCCCCC] hover:text-[#111111] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setConfirmDeleteId(hint.id)} className="p-2.5 text-[#CCCCCC] hover:text-red-600 transition-colors text-lg leading-none">×</button>
              </div>
            )
          )}
        </div>
      )}
      {notifyPromptTitle === claimKey && (
        <div className="mx-4 mb-4 pt-3 border-t border-[#F0F0E8] flex items-center justify-between gap-3">
          <p className="text-xs text-[#888888]">Let {displayName} know something&apos;s on the way?</p>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={sendNotify} className="px-3 py-1.5 bg-[#ECC8AE] text-[#5C3118] font-bold rounded-full text-xs">Let them know</button>
            <button onClick={() => setNotifyPromptTitle(null)} className="px-3 py-1.5 bg-[#F0F0E8] text-[#888888] font-semibold rounded-full text-xs">Keep secret</button>
          </div>
        </div>
      )}
      {notifySent.has(claimKey) && <p className="mx-4 mb-4 text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Hint sent</p>}
    </div>
  );
}

interface TextHintRowProps {
  hint: Hint;
  isOwner: boolean;
  editingHintId: string | null;
  editContent: string;
  setEditContent: (v: string) => void;
  editCategory: string;
  setEditCategory: (v: string) => void;
  editHintOccasionId: string;
  setEditHintOccasionId: (v: string) => void;
  occasions: Occasion[];
  hintSaving: boolean;
  saveHint: (id: string) => void;
  cancelEditHint: () => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (v: string | null) => void;
  deleteHint: (id: string) => void;
  startEditHint: (hint: Hint) => void;
}

function TextHintRow({ hint, isOwner, editingHintId, editContent, setEditContent, editCategory, setEditCategory, editHintOccasionId, setEditHintOccasionId, occasions, hintSaving, saveHint, cancelEditHint, confirmDeleteId, setConfirmDeleteId, deleteHint, startEditHint }: TextHintRowProps) {
  const cat = CATEGORIES[hint.category as keyof typeof CATEGORIES] || CATEGORIES.general;
  return (
    <div className="px-4 py-3.5 group border-b border-[#F0F0E8] last:border-0">
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
          {editCategory !== "avoid" && occasions.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2">
              <span className="text-xs text-[#888888] self-center flex-shrink-0">List:</span>
              <button onClick={() => setEditHintOccasionId("hints")}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${editHintOccasionId === "hints" ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                Hints
              </button>
              {occasions.map(o => (
                <button key={o.id} onClick={() => setEditHintOccasionId(o.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${editHintOccasionId === o.id ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                  {o.name}
                </button>
              ))}
            </div>
          )}
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
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  username: string;
  initialProfile: Profile;
  initialHints: Hint[];
  initialClaims: ClaimRecord[];
  initialOccasions: Occasion[];
  avatarUrl: string | null;
  viewerRelationship: "owner" | "connections" | "pending" | "none";
}

export default function ProfileClient({
  username, initialProfile, initialHints, initialClaims, initialOccasions,
  avatarUrl, viewerRelationship,
}: Props) {
  const { user, isLoaded } = useUser();
  const isOwner = viewerRelationship === "owner";
  const isConnected = viewerRelationship === "connections";

  const [profile] = useState<Profile>(initialProfile);
  const [hints, setHints] = useState<Hint[]>(initialHints);
  const [occasions, setOccasions] = useState<Occasion[]>(initialOccasions);
  const [hintsVisibility, setHintsVisibility] = useState<VisibilityLevel>(
    (initialProfile.hints_visibility as VisibilityLevel) || "connections"
  );

  const STORAGE_KEY = `gb_recs_${username}`;
  const relationshipRef = useRef<HTMLSelectElement>(null);
  const finderRef = useRef<HTMLDivElement>(null);

  // Gift finder state
  const [showFinder, setShowFinder] = useState(false);
  const [relationship, setRelationship] = useState("");
  const [budget, setBudget] = useState("");
  const [occasion, setOccasion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [recommendations, setRecommendations] = useState<GiftRecommendation[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAllRecs, setShowAllRecs] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [msgVisible, setMsgVisible] = useState(true);

  // Claims
  const [myClaims, setMyClaims] = useState<string[]>([]);
  const [existingClaims, setExistingClaims] = useState<ClaimRecord[]>(initialClaims);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [confirmUnclaim, setConfirmUnclaim] = useState<string | null>(null);
  const [notifyPromptTitle, setNotifyPromptTitle] = useState<string | null>(null);
  const [notifySent, setNotifySent] = useState<Set<string>>(new Set());

  // Share
  const [shareCopied, setShareCopied] = useState(false);
  const [myUsername, setMyUsername] = useState("");

  // Add hint form
  const [newHint, setNewHint] = useState("");
  const [hintCategory, setHintCategory] = useState("general");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [hintMode, setHintMode] = useState<"text" | "link" | "discover">("text");
  const [hintUrl, setHintUrl] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState("");
  const [enrichedProduct, setEnrichedProduct] = useState<{ title: string; image: string | null; price: string | null } | null>(null);
  const [selectedAddList, setSelectedAddList] = useState<string>("hints"); // 'hints' or occasion.id

  // Self-discovery
  const [discoveryBudget, setDiscoveryBudget] = useState("");
  const [discoveryOccasion, setDiscoveryOccasion] = useState("");
  const [discoveryRecs, setDiscoveryRecs] = useState<GiftRecommendation[]>([]);
  const [discoveryGenerating, setDiscoveryGenerating] = useState(false);
  const [discoveryError, setDiscoveryError] = useState("");
  const [savedDiscoveryRecs, setSavedDiscoveryRecs] = useState<Set<number>>(new Set());
  const [discoveryRecTargetList, setDiscoveryRecTargetList] = useState<Record<number, string>>({});

  // Edit hints
  const [editingHintId, setEditingHintId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("general");
  const [hintSaving, setHintSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editHintOccasionId, setEditHintOccasionId] = useState<string>("hints");

  // Edit product hints
  const [editingProductHintId, setEditingProductHintId] = useState<string | null>(null);
  const [editProductTitle, setEditProductTitle] = useState("");
  const [editProductOccasionId, setEditProductOccasionId] = useState<string>("hints");
  const [editProductSaving, setEditProductSaving] = useState(false);

  // Occasions
  const [addingOccasion, setAddingOccasion] = useState(false);
  const [newOccasionName, setNewOccasionName] = useState("");
  const [newOccasionDate, setNewOccasionDate] = useState("");
  const [newOccasionVisibility, setNewOccasionVisibility] = useState<VisibilityLevel>("public");
  const [savingOccasion, setSavingOccasion] = useState(false);
  const [occasionError, setOccasionError] = useState("");
  const [confirmDeleteOccasion, setConfirmDeleteOccasion] = useState<string | null>(null);

  // Edit occasion
  const [editingOccasionId, setEditingOccasionId] = useState<string | null>(null);
  const [editOccasionName, setEditOccasionName] = useState("");
  const [editOccasionDate, setEditOccasionDate] = useState("");
  const [editOccasionVisibility, setEditOccasionVisibility] = useState<VisibilityLevel>("public");
  const [editOccasionSaving, setEditOccasionSaving] = useState(false);
  const [editOccasionError, setEditOccasionError] = useState("");

  // Holiday auto-date
  const [addHolidayAutoDate, setAddHolidayAutoDate] = useState<string | null>(null);
  const [editHolidayAutoDate, setEditHolidayAutoDate] = useState<string | null>(null);

  // Discovery loading animation
  const [discoveryMsgIdx, setDiscoveryMsgIdx] = useState(0);
  const [discoveryMsgVisible, setDiscoveryMsgVisible] = useState(true);

  // Follow
  const [followStatus, setFollowStatus] = useState<"none" | "pending" | "accepted" | "rejected">("none");
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [followLoading, setFollowLoading] = useState(false);

  // Errors
  const [actionError, setActionError] = useState("");

  // ── Derived ──────────────────────────────────────────────────────────────────
  const hintsToShow = hints.filter(h => h.category !== "avoid");
  const avoidHints  = hints.filter(h => h.category === "avoid");

  const hintsForList = (occasionId: string | null): Hint[] =>
    hints.filter(h => h.category !== "avoid" && (h.occasion_id ?? null) === occasionId);

  const generalHints       = hintsForList(null);
  const generalTextHints   = generalHints.filter(h => !h.url);
  const generalProductHints = generalHints.filter(h => h.url);

  const daysUntilBirthday = profile.birthday ? getDaysUntilBirthday(profile.birthday) : null;
  const displayName = profile.name || username;

  const showFixedCTA = isLoaded && !isOwner && recommendations.length === 0 && !showFinder;

  function getDaysUntilDate(dateStr: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + "T00:00:00");
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  const LOADING_MESSAGES = [
    `Reading ${displayName}'s hints...`,
    "Understanding their personality...",
    "Thinking through what they'd love...",
    "Crossing off the generic stuff...",
    "Matching gifts to their interests...",
    "Curating something special...",
    "Putting it all together...",
    `Getting to know ${displayName} a little better...`,
    "Scanning for the unexpected but perfect option...",
    "Thinking beyond the obvious...",
    "Filtering out what everyone else would buy...",
    "Finding something they'd actually be excited about...",
    "Connecting the dots between their hints...",
    "Weighing quality over quantity...",
    "Thinking about what would make them smile...",
    "Considering their lifestyle and interests...",
    "Looking for that 'how did you know?' moment...",
    "Making sure it fits the occasion...",
    "Double-checking it's within budget...",
    "Almost ready to reveal the picks...",
  ];

  // ── Effects ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!addingOccasion) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [addingOccasion]);

  useEffect(() => {
    if (!editingOccasionId) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [editingOccasionId]);

  useEffect(() => {
    if (!generating) { setLoadingMsgIdx(0); setMsgVisible(true); return; }
    setLoadingMsgIdx(Math.floor(Math.random() * LOADING_MESSAGES.length));
    const interval = setInterval(() => {
      setMsgVisible(false);
      setTimeout(() => { setLoadingMsgIdx(i => (i + 1) % LOADING_MESSAGES.length); setMsgVisible(true); }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [generating]);

  useEffect(() => {
    if (!discoveryGenerating) { setDiscoveryMsgIdx(0); setDiscoveryMsgVisible(true); return; }
    setDiscoveryMsgIdx(Math.floor(Math.random() * LOADING_MESSAGES.length));
    const interval = setInterval(() => {
      setDiscoveryMsgVisible(false);
      setTimeout(() => { setDiscoveryMsgIdx(i => (i + 1) % LOADING_MESSAGES.length); setDiscoveryMsgVisible(true); }, 300);
    }, 2500);
    return () => clearInterval(interval);
  }, [discoveryGenerating]);

  useEffect(() => {
    const auto = getNextHolidayDate(newOccasionName);
    setAddHolidayAutoDate(auto);
    if (auto) setNewOccasionDate(auto);
    else setNewOccasionDate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOccasionName]);

  useEffect(() => {
    const auto = getNextHolidayDate(editOccasionName);
    setEditHolidayAutoDate(auto);
    if (auto) setEditOccasionDate(auto);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOccasionName]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isOwner) fetch(`/api/profile/${username}?ref=${encodeURIComponent(document.referrer || "")}`);
    if (isLoaded && !user) {
      try { localStorage.setItem("gb_referral", username); } catch { /* unavailable */ }
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

  // Restore finder preferences from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { recommendations: recs, relationship: rel, budget: bud, occasion: occ } = JSON.parse(saved);
        if (rel) setRelationship(rel);
        if (bud) setBudget(bud);
        if (occ) setOccasion(occ);
        if (recs?.length) setRecommendations(recs);
      }
    } catch { /* unavailable */ }
  }, [STORAGE_KEY]);

  useEffect(() => {
    if (!relationship && !budget) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, relationship, budget }));
    } catch { /* unavailable */ }
  }, [relationship, budget, STORAGE_KEY]);

  useEffect(() => {
    if (!isLoaded || !user || isOwner) return;
    fetch(`/api/claims?username=${username}`)
      .then(r => r.json())
      .then(d => { if (d.myClaims?.length) setMyClaims(d.myClaims); })
      .catch(() => {});
  }, [isLoaded, user, isOwner, username]);

  // ── API functions ─────────────────────────────────────────────────────────────
  async function generateGifts() {
    if (!relationship || !budget) return;
    setGenerating(true); setGenerateError(""); setRecommendations([]); setCategoryFilter("all"); setShowAllRecs(false);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
    } finally { setGenerating(false); }
  }

  async function generateSelfDiscovery() {
    if (!discoveryBudget) return;
    setDiscoveryGenerating(true); setDiscoveryError(""); setDiscoveryRecs([]); setSavedDiscoveryRecs(new Set()); setDiscoveryRecTargetList({});
    try {
      const res = await fetch("/api/recommend", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, budget: discoveryBudget, occasion: discoveryOccasion || undefined, is_self_discovery: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setDiscoveryRecs(data.recommendations || []);
    } catch (e: unknown) {
      setDiscoveryError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setDiscoveryGenerating(false); }
  }

  async function saveDiscoveryRec(rec: GiftRecommendation, idx: number) {
    // Optimistically mark as saving so button disables
    setSavedDiscoveryRecs(prev => new Set(prev).add(idx));
    const targetList = discoveryRecTargetList[idx] ?? selectedAddList;
    const occId = targetList !== "hints" ? targetList : null;
    try {
      const res = await fetch("/api/hints", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rec.title, category: "want", url: rec.searchUrl, product_title: rec.title, product_price: rec.priceRange, occasion_id: occId }),
      });
      const data = await res.json();
      if (res.ok) {
        setHints(prev => [data, ...prev]);
      } else {
        setSavedDiscoveryRecs(prev => { const s = new Set(prev); s.delete(idx); return s; });
        setDiscoveryError(data.error || "Couldn't save — try again");
      }
    } catch {
      setSavedDiscoveryRecs(prev => { const s = new Set(prev); s.delete(idx); return s; });
      setDiscoveryError("Couldn't save — check your connection");
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
    fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipient_username: username, gift_description: title, occasion }) })
      .then(r => { if (!r.ok) { setMyClaims(myClaims); setExistingClaims(existingClaims); } else { setNotifyPromptTitle(title); } })
      .catch(() => { setMyClaims(myClaims); setExistingClaims(existingClaims); })
      .finally(() => setClaiming(null));
  }

  async function unclaimGift(title: string) {
    setConfirmUnclaim(null);
    const prevMyClaims = myClaims;
    const prevExistingClaims = existingClaims;
    const newMyClaims = myClaims.filter(c => c !== title);
    setMyClaims(newMyClaims);
    setExistingClaims(existingClaims.filter(c => c.description !== title.toLowerCase()));
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) { const data = JSON.parse(saved); sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, myClaims: newMyClaims })); }
    } catch { /* unavailable */ }
    const res = await fetch("/api/claims", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_username: username, gift_description: title }),
    });
    if (!res.ok) { setMyClaims(prevMyClaims); setExistingClaims(prevExistingClaims); setActionError("Couldn't release claim — try again"); setTimeout(() => setActionError(""), 3000); }
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
      const occId = hintCategory === "avoid" ? null : (selectedAddList !== "hints" ? selectedAddList : null);
      const res = await fetch("/api/hints", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newHint.trim(), category: hintCategory, occasion_id: occId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add hint");
      setHints([data, ...hints]); setNewHint("");
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add — try again");
    } finally { setAdding(false); }
  }

  function startEditHint(hint: Hint) {
    setEditingHintId(hint.id);
    setEditContent(hint.content);
    setEditCategory(hint.category);
    setEditHintOccasionId(hint.occasion_id ?? "hints");
  }
  function cancelEditHint() { setEditingHintId(null); setEditContent(""); setEditCategory("general"); setEditHintOccasionId("hints"); }

  async function saveHint(id: string) {
    if (!editContent.trim()) return;
    setHintSaving(true);
    const prev = hints;
    const newOccId = editHintOccasionId === "hints" ? null : editHintOccasionId;
    setHints(hints.map(h => h.id === id ? { ...h, content: editContent.trim(), category: editCategory, occasion_id: newOccId } : h));
    setEditingHintId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editContent.trim(), category: editCategory, occasion_id: newOccId }) });
      if (!res.ok) setHints(prev);
    } catch { setHints(prev); } finally { setHintSaving(false); }
  }

  function startEditProductHint(hint: Hint) {
    setEditingProductHintId(hint.id);
    setEditProductTitle(hint.product_title || hint.content);
    setEditProductOccasionId(hint.occasion_id ?? "hints");
  }

  async function saveProductHint(id: string) {
    if (!editProductTitle.trim()) return;
    setEditProductSaving(true);
    const prev = hints;
    const newOccId = editProductOccasionId === "hints" ? null : editProductOccasionId;
    setHints(hints.map(h => h.id === id ? { ...h, product_title: editProductTitle.trim(), content: editProductTitle.trim(), occasion_id: newOccId } : h));
    setEditingProductHintId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editProductTitle.trim(), occasion_id: newOccId }) });
      if (!res.ok) setHints(prev);
    } catch { setHints(prev); } finally { setEditProductSaving(false); }
  }

  async function deleteHint(id: string) {
    const prev = hints;
    setHints(hints.filter(h => h.id !== id)); setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/hints/${id}`, { method: "DELETE" });
      if (!res.ok) { setHints(prev); setActionError("Couldn't delete hint — try again"); setTimeout(() => setActionError(""), 3000); }
    } catch { setHints(prev); setActionError("Couldn't delete hint — try again"); setTimeout(() => setActionError(""), 3000); }
  }

  async function enrichUrl() {
    if (!hintUrl.trim()) return;
    setEnriching(true); setEnrichError(""); setEnrichedProduct(null);
    try {
      const res = await fetch("/api/hints/enrich", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: hintUrl.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not read that page");
      setEnrichedProduct(data);
    } catch (e: unknown) {
      setEnrichError(e instanceof Error ? e.message : "Could not read that page — try a different link");
    } finally { setEnriching(false); }
  }

  async function addLinkHint() {
    if (!enrichedProduct || !hintUrl.trim()) return;
    setAdding(true); setAddError("");
    try {
      const occId = selectedAddList !== "hints" ? selectedAddList : null;
      const res = await fetch("/api/hints", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: enrichedProduct.title, category: "want", url: hintUrl.trim(), product_title: enrichedProduct.title, product_image: enrichedProduct.image, product_price: enrichedProduct.price, occasion_id: occId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      setHints([data, ...hints]);
      setHintUrl(""); setEnrichedProduct(null); setHintMode("text");
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Failed to add — try again");
    } finally { setAdding(false); }
  }

  async function addOccasion() {
    if (!newOccasionName.trim()) return;
    setSavingOccasion(true); setOccasionError("");
    try {
      const res = await fetch("/api/occasions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOccasionName.trim(), date: newOccasionDate || null, visibility: newOccasionVisibility }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOccasions(prev => [...prev, data]);
      setSelectedAddList(data.id); // auto-select the new list
      setNewOccasionName(""); setNewOccasionDate(""); setNewOccasionVisibility("public"); setAddingOccasion(false);
    } catch { setOccasionError("Failed to save — try again"); } finally { setSavingOccasion(false); }
  }

  async function deleteOccasion(id: string) {
    const prevOccasions = occasions;
    const prevHints = hints;
    setOccasions(occasions.filter(o => o.id !== id));
    setHints(hints.map(h => h.occasion_id === id ? { ...h, occasion_id: null } : h));
    setConfirmDeleteOccasion(null);
    if (selectedAddList === id) setSelectedAddList("hints");
    const res = await fetch(`/api/occasions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setOccasions(prevOccasions); setHints(prevHints);
      setActionError("Couldn't remove list — try again"); setTimeout(() => setActionError(""), 3000);
    }
  }

  async function updateHintsVisibility(newVis: VisibilityLevel) {
    const prev = hintsVisibility;
    setHintsVisibility(newVis);
    const res = await fetch("/api/profile/update", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hints_visibility: newVis }),
    });
    if (!res.ok) setHintsVisibility(prev);
  }

  async function updateOccasionVisibility(id: string, newVis: VisibilityLevel) {
    const prevOccasions = occasions;
    setOccasions(prev => prev.map(o => o.id === id ? { ...o, visibility: newVis } : o));
    const res = await fetch(`/api/occasions/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: newVis }),
    });
    if (!res.ok) setOccasions(prevOccasions);
  }

  function openEditOccasion(occ: Occasion) {
    setEditOccasionName(occ.name);
    setEditOccasionDate(occ.date || "");
    setEditOccasionVisibility((occ.visibility as VisibilityLevel) || "public");
    setEditOccasionError("");
    setEditingOccasionId(occ.id);
  }

  async function saveEditOccasion() {
    if (!editingOccasionId || !editOccasionName.trim()) return;
    setEditOccasionSaving(true); setEditOccasionError("");
    const prevOccasions = occasions;
    const dateToSave = editHolidayAutoDate || editOccasionDate || null;
    setOccasions(prev => prev.map(o => o.id === editingOccasionId
      ? { ...o, name: editOccasionName.trim(), date: dateToSave, visibility: editOccasionVisibility }
      : o
    ));
    try {
      const res = await fetch(`/api/occasions/${editingOccasionId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editOccasionName.trim(), date: dateToSave, visibility: editOccasionVisibility }),
      });
      if (!res.ok) { setOccasions(prevOccasions); setEditOccasionError("Failed to save — try again"); return; }
      setEditingOccasionId(null);
    } catch { setOccasions(prevOccasions); setEditOccasionError("Failed to save — try again"); }
    finally { setEditOccasionSaving(false); }
  }

  async function shareProfile() {
    const url = `${window.location.origin}/for/${username}`;
    const shareText = isOwner ? `Check out my gift profile on GiftButler!` : `Check out ${displayName}'s gift profile on GiftButler!`;
    if (navigator.share && navigator.maxTouchPoints > 0) {
      try { await navigator.share({ title: `${displayName}'s Gift Profile`, text: shareText, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    }
  }

  async function sendFollowRequest() {
    if (!selectedLabel) return;
    setFollowLoading(true);
    await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, label: selectedLabel }) });
    setFollowStatus("pending");
    setShowLabelPicker(false);
    setFollowLoading(false);
  }

  function isAlreadyClaimed(title: string): boolean {
    return existingClaims.some(c => c.description === title.toLowerCase() && (!c.occasion || !occasion || c.occasion === occasion));
  }

  // ── Prop bundles for module-level sub-components ─────────────────────────────
  const claimProps: Omit<ClaimButtonProps, "title"> = { existingClaims, myClaims, claiming, confirmUnclaim, occasion, claimGift, unclaimGift, setConfirmUnclaim };
  const productHintCardProps: Omit<ProductHintCardProps, "hint" | "showClaim"> = { ...claimProps, isOwner, editingProductHintId, editProductTitle, setEditProductTitle, editProductOccasionId, setEditProductOccasionId, occasions, editProductSaving, saveProductHint, setEditingProductHintId, confirmDeleteId, setConfirmDeleteId, deleteHint, startEditProductHint, notifyPromptTitle, displayName, sendNotify, setNotifyPromptTitle, notifySent };
  const textHintRowProps: Omit<TextHintRowProps, "hint"> = { isOwner, editingHintId, editContent, setEditContent, editCategory, setEditCategory, editHintOccasionId, setEditHintOccasionId, occasions, hintSaving, saveHint, cancelEditHint, confirmDeleteId, setConfirmDeleteId, deleteHint, startEditHint };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#EAEAE0]" style={{ paddingBottom: showFixedCTA ? "calc(5rem + env(safe-area-inset-bottom,0px))" : "5rem" }}>
      {actionError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-full shadow-lg">{actionError}</div>
      )}

      {/* Header */}
      <header className="bg-[#EAEAE0] sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={user ? "/home" : "/"} className="text-lg font-bold text-[#111111] tracking-tight">GiftButler</Link>
          <div className="flex items-center gap-2">
            {isLoaded && !user && (
              <>
                <Link href="/sign-in" className="px-4 py-1.5 text-[#888888] hover:text-[#111111] font-semibold text-sm transition-colors">Sign in</Link>
                <Link href="/sign-up" className="px-4 py-1.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">Sign up</Link>
              </>
            )}
            {isLoaded && user && (
              <Link href="/profile/edit" className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-[#111111] transition-all flex-shrink-0">
                {user.hasImage
                  ? <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#2D4A1E] bg-[#C4D4B4]">{user.firstName?.[0]?.toUpperCase() || "?"}</div>}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Profile section */}
      <div className="max-w-xl mx-auto px-4 py-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 shadow-card">
            {avatarUrl
              ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-[#2D4A1E] bg-[#C4D4B4]">{profile.name?.[0]?.toUpperCase() || username[0]?.toUpperCase()}</div>}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-bold text-[#111111] leading-tight">{displayName}</h1>
            <p className="text-[#888888] text-sm">@{username}</p>
            {profile.bio && <p className="text-[#555555] text-sm mt-1.5 leading-relaxed">{profile.bio}</p>}
          </div>
        </div>

        {/* Birthday chip (always shown if birthday set) */}
        {daysUntilBirthday !== null && (
          <div className="mb-4">
            {isOwner ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ECC8AE] rounded-full text-xs font-semibold text-[#5C3118]">
                <Cake className="w-3.5 h-3.5" />
                {daysUntilBirthday === 0 ? "Birthday today!" : daysUntilBirthday === 1 ? "Birthday tomorrow!" : daysUntilBirthday <= 60 ? `Birthday in ${daysUntilBirthday} days` : "Birthday"}
              </div>
            ) : (
              <button
                onClick={() => { setOccasion("Birthday"); setRecommendations([]); setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ECC8AE] hover:bg-[#E4B89C] rounded-full text-xs font-semibold text-[#5C3118] transition-colors">
                <Cake className="w-3.5 h-3.5" />
                {daysUntilBirthday === 0 ? "Birthday today!" : daysUntilBirthday === 1 ? "Birthday tomorrow!" : daysUntilBirthday <= 60 ? `Birthday in ${daysUntilBirthday} days` : "Birthday"}
              </button>
            )}
          </div>
        )}

        {/* Visitor: occasion chips as gift finder launchers */}
        {!isOwner && occasions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {occasions.map(occ => {
              const daysUntil = occ.date ? getDaysUntilDate(occ.date) : null;
              const isUpcoming = daysUntil !== null && daysUntil >= 0 && daysUntil <= 60;
              return (
                <button key={occ.id}
                  onClick={() => { setOccasion(occ.name); setRecommendations([]); setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#ECC8AE] hover:bg-[#E4B89C] rounded-full text-xs font-semibold text-[#5C3118] transition-colors">
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{occ.name}</span>
                  {isUpcoming && <span className="text-[#5C3118]/60">· {daysUntil === 0 ? "today" : `in ${daysUntil}d`}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {isOwner && (
            <>
              <button onClick={shareProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                <Share className="w-3.5 h-3.5" />
                {shareCopied ? "Copied!" : "Share my list"}
              </button>
              <Link href="/profile/edit"
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm border border-[#E0E0D8] transition-colors shadow-card">
                <Pencil className="w-3.5 h-3.5" /> Edit profile
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
              {followStatus === "accepted" && <span className="px-4 py-2 bg-[#C4D4B4] text-[#2D4A1E] font-semibold rounded-full text-sm flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> In my people</span>}
              <button onClick={shareProfile}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm border border-[#E0E0D8] transition-colors shadow-card">
                <Copy className="w-3.5 h-3.5" /> {shareCopied ? "Copied!" : "Share"}
              </button>
            </>
          )}
          {isLoaded && !user && (
            <button onClick={shareProfile}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm border border-[#E0E0D8] transition-colors shadow-card">
              <Copy className="w-3.5 h-3.5" /> {shareCopied ? "Copied!" : "Share"}
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

      {/* ── CONTENT ────────────────────────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 space-y-4">

        {/* ═══ OWNER VIEW ══════════════════════════════════════════════════════ */}
        {isOwner && (
          <>
            {/* Add to wishlist form */}
            <div className="bg-white rounded-2xl shadow-card p-5">
              <p className="text-base font-bold text-[#111111] mb-3">Add to your wishlist</p>

              {/* List picker — hidden for avoid category */}
              {hintCategory === "avoid" && (
                <p className="text-xs text-[#888888] mb-3 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> &quot;Please no&quot; hints always go to your general Hints list
                </p>
              )}
              <div className={`flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-none ${hintCategory === "avoid" ? "opacity-40 pointer-events-none" : ""}`}>
                <button
                  onClick={() => setSelectedAddList("hints")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${selectedAddList === "hints" ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                  <Lightbulb className="w-3 h-3 inline mr-1" />Hints
                </button>
                {occasions.map(occ => (
                  <button key={occ.id}
                    onClick={() => setSelectedAddList(occ.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${selectedAddList === occ.id ? "bg-[#111111] text-white" : "bg-[#F0F0E8] text-[#111111] hover:bg-[#E0E0D8]"}`}>
                    {occ.name}
                  </button>
                ))}
                <button
                  onClick={() => setAddingOccasion(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 bg-[#ECC8AE] text-[#5C3118] hover:bg-[#E4B89C] transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New list
                </button>
              </div>

              {/* Mode tabs */}
              <div className="flex bg-[#F5F5F0] rounded-xl p-1 gap-1 mb-4">
                <button onClick={() => { setHintMode("text"); setEnrichError(""); setEnrichedProduct(null); setDiscoveryRecs([]); setAddError(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${hintMode === "text" ? "bg-white text-[#111111] shadow-sm" : "text-[#888888] hover:text-[#111111]"}`}>
                  Describe it
                </button>
                <button onClick={() => { setHintMode("link"); setAddError(""); setEnrichError(""); setEnrichedProduct(null); setNewHint(""); setDiscoveryRecs([]); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${hintMode === "link" ? "bg-white text-[#111111] shadow-sm" : "text-[#888888] hover:text-[#111111]"}`}>
                  <Link2 className="w-3.5 h-3.5" /> Paste a link
                </button>
                <button onClick={() => { setHintMode("discover"); setAddError(""); setEnrichError(""); setEnrichedProduct(null); setNewHint(""); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${hintMode === "discover" ? "bg-white text-[#111111] shadow-sm" : "text-[#888888] hover:text-[#111111]"}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Discover
                </button>
              </div>

              {/* Describe it */}
              {hintMode === "text" && (
                <>
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
                      <input value={newHint} onChange={e => setNewHint(e.target.value)}
                        onBlur={() => {
                          const val = newHint.trim();
                          try { new URL(val); setHintMode("link"); setHintUrl(val); setNewHint(""); } catch {}
                        }} maxLength={280}
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
                </>
              )}

              {/* Paste a link */}
              {hintMode === "link" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-[#888888]">Find something on Amazon, Target, Etsy — anywhere. Paste the link here and we&apos;ll save it.</p>
                  <div className="flex gap-2">
                    <input type="url" value={hintUrl}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.includes(" ")) { setHintMode("text"); setNewHint(val.trim()); setHintUrl(""); setEnrichedProduct(null); setEnrichError(""); return; }
                        setHintUrl(val); setEnrichedProduct(null); setEnrichError("");
                      }}
                      onKeyDown={e => e.key === "Enter" && enrichUrl()}
                      placeholder="https://amazon.com/..."
                      className="flex-1 px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                    />
                    <button onClick={enrichUrl} disabled={!hintUrl.trim() || enriching}
                      className="px-5 py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors whitespace-nowrap">
                      {enriching ? "..." : "Look up"}
                    </button>
                  </div>
                  {enrichError && <p className="text-red-500 text-xs">{enrichError}</p>}
                  {enrichedProduct && (
                    <div className="bg-[#F5F5F0] rounded-xl p-3 flex gap-3">
                      {enrichedProduct.image && (
                        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white">
                          <img src={enrichedProduct.image} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111111] leading-snug line-clamp-2">{enrichedProduct.title}</p>
                        {enrichedProduct.price && <p className="text-sm font-bold text-[#111111] mt-1">{enrichedProduct.price}</p>}
                      </div>
                    </div>
                  )}
                  {addError && <p className="text-red-500 text-xs">{addError}</p>}
                  {enrichedProduct && (
                    <button onClick={addLinkHint} disabled={adding}
                      className="w-full py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors">
                      {adding ? "Saving..." : "Save to wishlist"}
                    </button>
                  )}
                </div>
              )}

              {/* Discover with AI */}
              {hintMode === "discover" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-[#888888]">AI reads all your hints and finds gifts you&apos;d genuinely love — things you might not know existed yet.</p>
                  <div className="flex flex-col gap-3">
                    <select value={discoveryBudget} onChange={e => setDiscoveryBudget(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]">
                      <option value="">Select a budget...</option>
                      <option value="under $25">Under $25</option>
                      <option value="$25-$50">$25 – $50</option>
                      <option value="$50-$100">$50 – $100</option>
                      <option value="$100-$200">$100 – $200</option>
                      <option value="over $200">$200+</option>
                    </select>
                    <input value={discoveryOccasion} onChange={e => setDiscoveryOccasion(e.target.value)}
                      placeholder="For any occasion, or specify one..."
                      className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]" />
                    {!discoveryOccasion && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {["Birthday", "Christmas", "Mother's Day", "Father's Day", "Anniversary", "Just Because", ...occasions.map(o => o.name)].map(s => (
                          <button key={s} type="button" onClick={() => setDiscoveryOccasion(s)}
                            className="px-3 py-1.5 bg-[#F5F5F0] border border-[#E0E0D8] hover:border-[#111111] rounded-full text-xs font-semibold text-[#555555] hover:text-[#111111] transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {discoveryError && <p className="text-red-600 text-xs">{discoveryError}</p>}
                  {discoveryGenerating && (
                    <div className="bg-[#F5F5F0] rounded-2xl p-6 text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <div className="absolute inset-0 rounded-full bg-[#ECC8AE] animate-ping opacity-20" />
                        <div className="absolute inset-1 rounded-full bg-[#ECC8AE] animate-ping opacity-30" style={{ animationDelay: "0.4s", animationDuration: "1.2s" }} />
                        <div className="relative w-16 h-16 rounded-full bg-[#ECC8AE] flex items-center justify-center">
                          <Sparkles className="w-7 h-7 text-[#5C3118]" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-[#111111] mb-0.5 transition-opacity duration-300" style={{ opacity: discoveryMsgVisible ? 1 : 0 }}>
                        {LOADING_MESSAGES[discoveryMsgIdx]}
                      </p>
                      <p className="text-xs text-[#888888]">Finding gifts you&apos;d genuinely love</p>
                    </div>
                  )}
                  {!discoveryGenerating && discoveryRecs.length === 0 && (
                    <button onClick={generateSelfDiscovery} disabled={!discoveryBudget}
                      className="w-full py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" /> Find gifts I&apos;d love
                    </button>
                  )}
                  {discoveryRecs.length > 0 && (
                    <div className="space-y-2.5">
                      {discoveryRecs.map((rec, i) => (
                        <div key={i} className="bg-[#F5F5F0] rounded-xl p-3">
                          <p className="font-semibold text-[#111111] text-sm leading-snug">{rec.title}</p>
                          <p className="text-xs text-[#888888] mt-0.5">{rec.priceRange} · {rec.category}</p>
                          <p className="text-xs text-[#888888] mt-1 leading-relaxed">{rec.why}</p>
                          <div className="flex gap-2 mt-2.5 flex-wrap">
                            <a href={rec.searchUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E0E0D8] hover:border-[#111111] text-[#111111] text-xs font-semibold rounded-full transition-colors">
                              Shop <ExternalLink className="w-3 h-3" />
                            </a>
                            {savedDiscoveryRecs.has(i) ? (
                              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 self-center"><Check className="w-3 h-3" /> Saved</p>
                            ) : (
                              <div className="flex gap-1.5 items-center">
                                <select
                                  value={discoveryRecTargetList[i] ?? selectedAddList}
                                  onChange={e => setDiscoveryRecTargetList(prev => ({ ...prev, [i]: e.target.value }))}
                                  className="px-2.5 py-1.5 rounded-full text-xs font-semibold bg-[#F0F0E8] text-[#111111] border-0 focus:outline-none focus:ring-2 focus:ring-[#111111]">
                                  <option value="hints">Hints</option>
                                  {occasions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                                <button onClick={() => saveDiscoveryRec(rec, i)}
                                  className="px-3 py-1.5 bg-[#111111] hover:bg-[#333333] text-white text-xs font-bold rounded-full transition-colors">
                                  Save
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      <button onClick={() => { setDiscoveryRecs([]); setSavedDiscoveryRecs(new Set()); }}
                        className="w-full py-2 text-xs text-[#888888] hover:text-[#111111] transition-colors">
                        Try different options
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Occasion list sections */}
            {occasions.map(occ => {
              const occHints = hints.filter(h => (h.occasion_id ?? null) === occ.id && h.category !== "avoid");
              const occProducts = occHints.filter(h => h.url);
              const occTextHints = occHints.filter(h => !h.url);
              const daysUntil = occ.date ? getDaysUntilDate(occ.date) : null;
              const isUpcoming = daysUntil !== null && daysUntil >= 0 && daysUntil <= 60;
              return (
                <div key={occ.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-[#F0F0E8] flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CalendarDays className="w-4 h-4 text-[#888888] flex-shrink-0" />
                      <span className="font-bold text-[#111111] text-sm truncate">{occ.name}</span>
                      {occHints.length > 0 && <span className="text-xs text-[#888888] flex-shrink-0">{occHints.length}</span>}
                      {isUpcoming && <span className="text-xs text-[#888888] flex-shrink-0">{daysUntil === 0 ? "· today" : `· in ${daysUntil}d`}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <VisibilityToggle
                        visibility={occ.visibility as VisibilityLevel || "public"}
                        onToggle={() => {
                          const idx = VISIBILITY_CYCLE.indexOf(occ.visibility as VisibilityLevel);
                          updateOccasionVisibility(occ.id, VISIBILITY_CYCLE[(idx + 1) % VISIBILITY_CYCLE.length]);
                        }}
                      />
                      <button onClick={() => openEditOccasion(occ)} className="p-1.5 text-[#CCCCCC] hover:text-[#111111] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      {confirmDeleteOccasion === occ.id ? (
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-xs text-[#888888]">Hints move to your general list</p>
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteOccasion(occ.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">Delete</button>
                            <button onClick={() => setConfirmDeleteOccasion(null)} className="px-2.5 py-1 bg-[#F0F0E8] text-[#888888] text-xs font-semibold rounded-full">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteOccasion(occ.id)} className="p-1.5 text-[#CCCCCC] hover:text-red-600 transition-colors"><X className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                  {occHints.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <p className="text-xs text-[#CCCCCC]">Nothing here yet</p>
                      <p className="text-xs text-[#CCCCCC] mt-1">Pick <strong>{occ.name}</strong> in the list above, then add hints or paste a link</p>
                    </div>
                  ) : (
                    <div>
                      {occProducts.map(hint => (
                        <div key={hint.id} className="p-4 border-b border-[#F0F0E8] last:border-0">
                          <ProductHintCard hint={hint} showClaim={false} {...productHintCardProps} />
                        </div>
                      ))}
                      {occTextHints.map(hint => <TextHintRow key={hint.id} hint={hint} {...textHintRowProps} />)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Hints list section */}
            <div className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="px-4 py-3.5 border-b border-[#F0F0E8] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#888888]" />
                  <span className="font-bold text-[#111111] text-sm">Hints</span>
                  {generalHints.length > 0 && <span className="text-xs text-[#888888]">{generalHints.length}</span>}
                </div>
                <VisibilityToggle
                  visibility={hintsVisibility}
                  onToggle={() => {
                    const idx = VISIBILITY_CYCLE.indexOf(hintsVisibility);
                    updateHintsVisibility(VISIBILITY_CYCLE[(idx + 1) % VISIBILITY_CYCLE.length]);
                  }}
                />
              </div>

              {generalProductHints.length === 0 && generalTextHints.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="font-bold text-[#111111] text-sm mb-1">Drop hints for AI-powered suggestions</p>
                  <p className="text-[#888888] text-xs leading-relaxed">The AI reads all your hints together and finds gifts you&apos;d genuinely love.</p>
                </div>
              ) : (
                <div>
                  {generalProductHints.map(hint => (
                    <div key={hint.id} className="p-4 border-b border-[#F0F0E8] last:border-0">
                      <ProductHintCard hint={hint} showClaim={false} {...productHintCardProps} />
                    </div>
                  ))}
                  {generalTextHints.map(hint => <TextHintRow key={hint.id} hint={hint} {...textHintRowProps} />)}
                </div>
              )}

              {/* Progress nudge */}
              {generalTextHints.length >= 1 && generalTextHints.length < 5 && (
                <div className="mx-4 mb-4 mt-1 bg-[#C4D4B4] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-[#2D4A1E]">{generalTextHints.length < 3 ? "Getting started" : "Almost there"}</p>
                    <span className="text-xs font-bold text-[#2D4A1E]">{generalTextHints.length}/5</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/40 rounded-full mb-1.5 overflow-hidden">
                    <div className="h-full bg-[#2D4A1E] rounded-full transition-all" style={{ width: `${Math.round((generalTextHints.length / 5) * 100)}%` }} />
                  </div>
                  <p className="text-xs text-[#2D4A1E]/80">
                    {generalTextHints.length < 3 ? "Add hints — the AI needs context to go beyond generic suggestions." : "5+ hints is where gift ideas start feeling truly personal."}
                  </p>
                </div>
              )}
            </div>

            {/* Occasion nudge */}
            {occasions.length === 0 && generalTextHints.length >= 3 && (
              <button onClick={() => setAddingOccasion(true)}
                className="w-full px-4 py-3.5 bg-[#ECC8AE] rounded-2xl text-left hover:bg-[#E4B89C] transition-colors">
                <p className="text-sm font-semibold text-[#5C3118] flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> Add an occasion</p>
                <p className="text-xs text-[#5C3118]/70 mt-0.5">Christmas? Anniversary? Visitors can tap it to find the perfect gift for that moment.</p>
              </button>
            )}

            {/* Avoid nudge */}
            {avoidHints.length === 0 && hints.length > 0 && (
              <button onClick={() => { setHintCategory("avoid"); setSelectedAddList("hints"); setHintMode("text"); }}
                className="w-full px-4 py-3.5 bg-white rounded-2xl shadow-card text-left hover:bg-[#F0F0E8] transition-colors border-2 border-dashed border-[#E0E0D8] hover:border-red-300">
                <p className="text-sm font-semibold text-[#888888] hover:text-red-500">+ What should people NOT get you?</p>
                <p className="text-xs text-[#AAAAAA] mt-0.5">Candles? Socks? Tell them — it saves everyone.</p>
              </button>
            )}

            {/* Avoid section */}
            {avoidHints.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-red-100">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Please avoid</p>
                </div>
                <div className="divide-y divide-[#F0F0E8]">
                  {avoidHints.map(hint => (
                    <div key={hint.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <span className="text-[#888888] text-sm">— {hint.content}</span>
                      {confirmDeleteId === hint.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => deleteHint(hint.id)} className="px-2.5 py-1 bg-red-600 text-white text-xs font-semibold rounded-full">Delete</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2.5 py-1 bg-[#F0F0E8] text-[#888888] text-xs font-semibold rounded-full">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(hint.id)} className="p-1.5 text-[#CCCCCC] hover:text-red-600 transition-colors text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ VISITOR VIEW ════════════════════════════════════════════════════ */}
        {!isOwner && (
          <>
            {/* Occasion sections for visitors */}
            {occasions.map(occ => {
              const occHints = hints.filter(h => (h.occasion_id ?? null) === occ.id && h.category !== "avoid");
              const occProducts = occHints.filter(h => h.url);
              const occTextHints = occHints.filter(h => !h.url);
              if (occHints.length === 0) return null;
              return (
                <div key={occ.id}>
                  <p className="text-xs font-bold text-[#888888] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> {occ.name}
                  </p>
                  <div className="flex flex-col gap-3">
                    {occProducts.map(hint => <ProductHintCard key={hint.id} hint={hint} showClaim={true} {...productHintCardProps} />)}
                    {occTextHints.length > 0 && (
                      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                        {occTextHints.map(hint => <TextHintRow key={hint.id} hint={hint} {...textHintRowProps} />)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setOccasion(occ.name); setRecommendations([]); setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                    className="mt-3 w-full py-2.5 bg-[#ECC8AE] hover:bg-[#E4B89C] text-[#5C3118] font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" /> Find a {occ.name} gift with AI
                  </button>
                </div>
              );
            })}

            {/* Product hints in general list */}
            {generalProductHints.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#888888] uppercase tracking-wide mb-3 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> What {displayName} wants</p>
                <div className="flex flex-col gap-3">
                  {generalProductHints.map(hint => <ProductHintCard key={hint.id} hint={hint} showClaim={true} {...productHintCardProps} />)}
                </div>
              </div>
            )}

            {/* Hints section for visitors — teaser shown when there are any visible hints */}
            {(generalTextHints.length > 0 || (generalProductHints.length > 0 && generalTextHints.length === 0)) && (
              <div>
                {recommendations.length === 0 && !showFinder && (() => {
                  try { return !sessionStorage.getItem(`gb_recs_${username}`); } catch { return true; }
                })() && (
                  <div className="bg-[#B8CED0] rounded-2xl p-4 mb-3">
                    <p className="text-xs font-bold text-[#1A3D42] mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> GiftButler AI</p>
                    <p className="text-[#1A3D42] text-sm leading-relaxed mb-3">
                      {generalTextHints.length > 0
                        ? `${displayName} dropped ${generalTextHints.length} gift hint${generalTextHints.length !== 1 ? "s" : ""}. Our AI reads them all together to suggest gifts they'd genuinely love.`
                        : `${displayName} saved specific items they want. Use our AI to find more ideas based on their taste.`}
                    </p>
                    <button
                      onClick={() => { setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#1A3D42] hover:bg-[#122c30] text-white font-bold rounded-full text-xs transition-colors">
                      <Sparkles className="w-3 h-3" /> Find a gift <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {generalTextHints.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-[#F0F0E8]">
                      <p className="text-sm font-bold text-[#111111]">{displayName}&apos;s hints</p>
                    </div>
                    {generalTextHints.map(hint => <TextHintRow key={hint.id} hint={hint} {...textHintRowProps} />)}
                  </div>
                )}
              </div>
            )}

            {/* Empty state — nothing visible */}
            {isLoaded && hintsToShow.length === 0 && occasions.length === 0 && (
              <div className="bg-white rounded-2xl shadow-card p-6 text-center">
                <p className="font-semibold text-[#111111] mb-1">
                  {!isConnected && initialProfile.hints_visibility !== "public"
                    ? `${displayName}'s hints are private`
                    : `${displayName} hasn't added any hints yet`}
                </p>
                {!isConnected && initialProfile.hints_visibility !== "public" ? (
                  <>
                    <p className="text-[#888888] text-sm mb-4">Connect with {displayName} to unlock their personal hints and get more personalized gift ideas.</p>
                    {isLoaded && user ? (
                      followStatus === "pending"
                        ? <p className="text-sm text-[#888888] font-semibold">Request sent — waiting for {displayName} to accept</p>
                        : followStatus !== "accepted" && (
                          <button onClick={() => setShowLabelPicker(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                            + Add to my people
                          </button>
                        )
                    ) : (
                      <Link href="/sign-up" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                        Join to connect <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                    <p className="text-[#AAAAAA] text-xs mt-4">You can still find a gift — just without the personal touch.</p>
                    <button onClick={() => { setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E0D8] text-[#888888] font-semibold rounded-full text-sm transition-colors mt-2">
                      Find a gift anyway <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[#888888] text-sm mb-4">You can still find gift ideas — just without the personal touch.</p>
                    <button onClick={() => { setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors">
                      Find a gift anyway <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Gift Finder — loading */}
            {showFinder && recommendations.length === 0 && generating && (
              <div className="bg-white rounded-2xl shadow-card p-8 text-center overflow-hidden">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full bg-[#ECC8AE] animate-ping opacity-20" />
                  <div className="absolute inset-2 rounded-full bg-[#ECC8AE] animate-ping opacity-30" style={{ animationDelay: "0.4s", animationDuration: "1.2s" }} />
                  <div className="relative w-24 h-24 rounded-full bg-[#ECC8AE] flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-[#5C3118]" />
                  </div>
                </div>
                <p className="text-base font-bold text-[#111111] mb-1 transition-opacity duration-300" style={{ opacity: msgVisible ? 1 : 0 }}>
                  {LOADING_MESSAGES[loadingMsgIdx]}
                </p>
                <p className="text-xs text-[#888888] mb-6">GiftButler AI is reading all their hints at once</p>
                <div className="flex justify-center gap-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-[#ECC8AE] animate-bounce" style={{ animationDelay: `${i * 160}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Gift Finder — form */}
            {showFinder && recommendations.length === 0 && !generating && (
              <div ref={finderRef} className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-[#111111]">Find the perfect gift</h2>
                  <button onClick={() => setShowFinder(false)} className="p-1.5 bg-[#F0F0E8] rounded-full text-[#888888] hover:text-[#111111]"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-col gap-4 mb-5">
                  <div>
                    <label className="text-xs font-bold text-[#888888] mb-1.5 block uppercase tracking-wide">I&apos;m their</label>
                    <select ref={relationshipRef} value={relationship} onChange={e => setRelationship(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]">
                      <option value="">Select relationship...</option>
                      <optgroup label="Partner">
                        {[["husband","Husband"],["wife","Wife"],["partner","Partner"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </optgroup>
                      <optgroup label="Family">
                        {[["dad","Dad"],["mom","Mom"],["son","Son"],["daughter","Daughter"],["brother","Brother"],["sister","Sister"],["grandfather","Grandfather"],["grandmother","Grandmother"],["grandson","Grandson"],["granddaughter","Granddaughter"],["uncle","Uncle"],["aunt","Aunt"],["nephew","Nephew"],["niece","Niece"],["cousin","Cousin"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </optgroup>
                      <optgroup label="Friends & Others">
                        {[["best friend","Best Friend"],["friend","Friend"],["colleague","Colleague"],["other","Other"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </optgroup>
                    </select>
                  </div>
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
                    <input type="text" value={occasion} onChange={e => setOccasion(e.target.value)} placeholder="Birthday, Graduation, Mother's Day..." autoComplete="off"
                      className="w-full px-4 py-3 rounded-xl border border-[#E0E0D8] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] bg-[#F5F5F0]" />
                    {!occasion && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {["Birthday","Mother's Day","Father's Day","Graduation","Anniversary","Wedding","Baby Shower","Holiday","Just Because"].map(s => (
                          <button key={s} type="button" onClick={() => setOccasion(s)}
                            className="px-3 py-1.5 bg-[#F5F5F0] border border-[#E0E0D8] hover:border-[#111111] rounded-full text-xs font-semibold text-[#555555] hover:text-[#111111] transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {generateError && <p className="text-red-600 text-sm mb-3">{generateError}</p>}
                <button onClick={generateGifts} disabled={!relationship || !budget}
                  className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2">
                  {generateError ? "Try again" : <><span>Generate gift ideas</span><ArrowRight className="w-4 h-4" /></>}
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
                          <div className="flex gap-2">
                            <a href={rec.searchUrl} target="_blank" rel="noopener noreferrer"
                              className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm text-center transition-colors flex items-center justify-center gap-1.5">
                              Find this gift <ArrowRight className="w-3.5 h-3.5" />
                            </a>
                            {isLoaded && user && <ClaimButton title={rec.title} {...claimProps} />}
                          </div>
                          {notifyPromptTitle === rec.title && (
                            <div className="mt-3 pt-3 border-t border-[#F0F0E8] flex items-center justify-between gap-3">
                              <p className="text-xs text-[#888888]">Let {displayName} know something&apos;s on the way?</p>
                              <div className="flex gap-2 flex-shrink-0">
                                <button onClick={sendNotify} className="px-3 py-1.5 bg-[#ECC8AE] text-[#5C3118] font-bold rounded-full text-xs">Let them know</button>
                                <button onClick={() => setNotifyPromptTitle(null)} className="px-3 py-1.5 bg-[#F0F0E8] text-[#888888] font-semibold rounded-full text-xs">Keep secret</button>
                              </div>
                            </div>
                          )}
                          {notifySent.has(rec.title) && <p className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Hint sent</p>}
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
                    <button onClick={() => { setRecommendations([]); setGenerateError(""); setShowFinder(true); setCategoryFilter("all"); setShowAllRecs(false); try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); setTimeout(() => relationshipRef.current?.focus(), 450); }}
                      className="w-full py-2.5 bg-white hover:bg-[#F0F0E8] text-[#888888] font-semibold rounded-full text-sm shadow-card transition-colors">
                      Try again
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

            {/* Avoid section — visible to all */}
            {avoidHints.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <div className="px-4 py-3 border-b border-red-100">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wide">Please avoid</p>
                </div>
                <div className="divide-y divide-[#F0F0E8]">
                  {avoidHints.map(hint => (
                    <div key={hint.id} className="px-4 py-3">
                      <span className="text-[#888888] text-sm">— {hint.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
            <button onClick={() => { setShowFinder(true); setTimeout(() => finderRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50); }}
              className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-base transition-colors flex items-center justify-center gap-2">
              {hintsToShow.length > 0 ? `Find ${displayName} a gift` : `Find a gift for ${displayName}`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isLoaded && user && <BottomTabBar myUsername={myUsername} />}

      {/* Add occasion sheet */}
      {isOwner && addingOccasion && (() => {
        const isBirthday = newOccasionName.trim().toLowerCase().includes("birthday");
        const closeSheet = () => { setAddingOccasion(false); setNewOccasionName(""); setNewOccasionDate(""); setNewOccasionVisibility("public"); setAddHolidayAutoDate(null); };
        return (
          <>
            <style>{`
              @keyframes gb-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
              @keyframes gb-fade-in  { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
              @keyframes gb-backdrop { from { opacity: 0; } to { opacity: 1; } }
              .gb-sheet    { animation: gb-slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
              .gb-backdrop { animation: gb-backdrop 0.2s ease-out; }
              @media (min-width: 768px) { .gb-sheet { animation: gb-fade-in 0.2s ease-out; } }
            `}</style>
            <div className="gb-backdrop fixed inset-0 z-50 bg-black/40" onClick={closeSheet} />
            <div className="gb-sheet fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 pointer-events-none">
              <div className="pointer-events-auto w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="pt-3 pb-1 flex justify-center md:hidden">
                  <div className="w-10 h-1 bg-[#E0E0D8] rounded-full" />
                </div>
                <div className="px-6 pt-4 pb-6 overflow-y-auto" style={{ maxHeight: "85svh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-lg font-bold text-[#111111]">Add a list</p>
                    <button onClick={closeSheet} className="p-1.5 bg-[#F0F0E8] hover:bg-[#E0E0D8] rounded-full text-[#888888] hover:text-[#111111] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#888888] uppercase tracking-wide block mb-1.5">List name</label>
                      <input type="text" value={newOccasionName} onChange={e => setNewOccasionName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && !isBirthday && addOccasion()}
                        placeholder="e.g. Graduation, Mother's Day..."
                        autoComplete="off"
                        className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      />
                      {!newOccasionName && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {["Mother's Day","Father's Day","Graduation","Wedding","Anniversary","Baby Shower","Retirement","Holiday","Housewarming","Christmas"].map(s => (
                            <button key={s} type="button" onClick={() => setNewOccasionName(s)}
                              className="px-3 py-1.5 bg-white border border-[#E0E0D8] hover:border-[#ECC8AE] hover:bg-[#FDF5EE] rounded-full text-xs font-semibold text-[#555555] hover:text-[#5C3118] transition-colors">
                              {s}
                            </button>
                          ))}
                        </div>
                      )}
                      {isBirthday && (
                        <p className="text-xs text-[#C4824A] mt-1.5 flex items-center gap-1">
                          <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                          Your birthday is already on your profile — update it in <a href="/profile/edit" className="underline font-semibold">Edit Profile</a>.
                        </p>
                      )}
                    </div>
                    {!isBirthday && (
                      <div>
                        <label className="text-xs font-bold text-[#888888] uppercase tracking-wide block mb-1.5">
                          Date <span className="font-normal text-[#CCCCCC] normal-case">(optional)</span>
                        </label>
                        {addHolidayAutoDate ? (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#C4D4B4] text-sm">
                            <CalendarDays className="w-4 h-4 text-[#2D4A1E] flex-shrink-0" />
                            <span className="text-[#2D4A1E] font-semibold">
                              {new Date(addHolidayAutoDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[#2D4A1E]/60 text-xs">auto-set</span>
                          </div>
                        ) : (
                          <input type="date" value={newOccasionDate} onChange={e => setNewOccasionDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] appearance-none" />
                        )}
                      </div>
                    )}
                    {!isBirthday && (
                      <div>
                        <label className="text-xs font-bold text-[#888888] uppercase tracking-wide block mb-2">Who can see this list?</label>
                        <div className="flex gap-2">
                          {VISIBILITY_CYCLE.map(v => {
                            const cfg = VISIBILITY_CONFIG[v];
                            const Icon = cfg.icon;
                            return (
                              <button key={v} type="button" onClick={() => setNewOccasionVisibility(v)}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${newOccasionVisibility === v ? "border-[#111111] bg-[#F5F5F0]" : "border-[#E0E0D8] bg-white hover:border-[#AAAAAA]"}`}>
                                <Icon className="w-4 h-4" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {occasionError && <p className="text-red-500 text-xs">{occasionError}</p>}
                    <button onClick={addOccasion} disabled={!newOccasionName.trim() || isBirthday || savingOccasion}
                      className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors">
                      {savingOccasion ? "Saving..." : "Create list"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
      {/* Edit occasion sheet */}
      {isOwner && editingOccasionId && (() => {
        const isBirthday = editOccasionName.trim().toLowerCase().includes("birthday");
        const closeSheet = () => { setEditingOccasionId(null); setEditOccasionError(""); setEditHolidayAutoDate(null); };
        return (
          <>
            <div className="gb-backdrop fixed inset-0 z-50 bg-black/40" onClick={closeSheet} />
            <div className="gb-sheet fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4 pointer-events-none">
              <div className="pointer-events-auto w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="pt-3 pb-1 flex justify-center md:hidden">
                  <div className="w-10 h-1 bg-[#E0E0D8] rounded-full" />
                </div>
                <div className="px-6 pt-4 pb-6 overflow-y-auto" style={{ maxHeight: "85svh", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                  <div className="flex items-center justify-between mb-5">
                    <p className="text-lg font-bold text-[#111111]">Edit list</p>
                    <button onClick={closeSheet} className="p-1.5 bg-[#F0F0E8] hover:bg-[#E0E0D8] rounded-full text-[#888888] hover:text-[#111111] transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#888888] uppercase tracking-wide block mb-1.5">List name</label>
                      <input type="text" value={editOccasionName} onChange={e => setEditOccasionName(e.target.value)}
                        placeholder="e.g. Graduation, Mother's Day..."
                        autoComplete="off"
                        className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      />
                      {isBirthday && (
                        <p className="text-xs text-[#C4824A] mt-1.5 flex items-center gap-1">
                          <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                          Your birthday is already on your profile — update it in <a href="/profile/edit" className="underline font-semibold">Edit Profile</a>.
                        </p>
                      )}
                    </div>
                    {!isBirthday && (
                      <div>
                        <label className="text-xs font-bold text-[#888888] uppercase tracking-wide block mb-1.5">
                          Date <span className="font-normal text-[#CCCCCC] normal-case">(optional)</span>
                        </label>
                        {editHolidayAutoDate ? (
                          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#C4D4B4] text-sm">
                            <CalendarDays className="w-4 h-4 text-[#2D4A1E] flex-shrink-0" />
                            <span className="text-[#2D4A1E] font-semibold">
                              {new Date(editHolidayAutoDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[#2D4A1E]/60 text-xs">auto-set</span>
                          </div>
                        ) : (
                          <input type="date" value={editOccasionDate} onChange={e => setEditOccasionDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] appearance-none" />
                        )}
                      </div>
                    )}
                    {!isBirthday && (
                      <div>
                        <label className="text-xs font-bold text-[#888888] uppercase tracking-wide block mb-2">Who can see this list?</label>
                        <div className="flex gap-2">
                          {VISIBILITY_CYCLE.map(v => {
                            const cfg = VISIBILITY_CONFIG[v];
                            const Icon = cfg.icon;
                            return (
                              <button key={v} type="button" onClick={() => setEditOccasionVisibility(v)}
                                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${editOccasionVisibility === v ? "border-[#111111] bg-[#F5F5F0]" : "border-[#E0E0D8] bg-white hover:border-[#AAAAAA]"}`}>
                                <Icon className="w-4 h-4" />
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {editOccasionError && <p className="text-red-500 text-xs">{editOccasionError}</p>}
                    <button onClick={saveEditOccasion} disabled={!editOccasionName.trim() || isBirthday || editOccasionSaving}
                      className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors">
                      {editOccasionSaving ? "Saving..." : "Save changes"}
                    </button>
                    <button onClick={() => { setConfirmDeleteOccasion(editingOccasionId); setEditingOccasionId(null); }}
                      className="w-full py-2.5 text-red-500 hover:text-red-700 text-sm font-semibold transition-colors">
                      Delete this list
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </main>
  );
}
