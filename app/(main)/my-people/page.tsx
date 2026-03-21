"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search, Users, Cake, ArrowRight, Gift, Plus, X, Calendar, DollarSign, CalendarDays, Shuffle, AtSign, Check } from "lucide-react";

interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  birthday: string | null;
  daysUntilBirthday: number | null;
  myLabel: string | null;
}

interface UpcomingOccasion {
  id: string;
  user_id: string;
  name: string;
  days_until: number;
}

interface SearchResult {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  followStatus: "none" | "pending" | "accepted";
}

interface Circle {
  id: string;
  name: string;
  budget: number | null;
  event_date: string | null;
  status: string;
  memberCount: number;
  isOrganizer: boolean;
}

const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];

function birthdayText(days: number | null): string {
  if (days === null) return "Birthday unknown";
  if (days === 0) return "Birthday today!";
  if (days === 1) return "Birthday tomorrow!";
  return `Birthday in ${days} days`;
}

function birthdayColor(days: number | null): string {
  if (days === null) return "text-[#888888]";
  if (days <= 7) return "text-red-500 font-semibold";
  if (days <= 30) return "text-[#C4824A] font-semibold";
  return "text-[#888888]";
}

export default function MyPeoplePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<"people" | "circles">("people");

  // People state
  const [people, setPeople] = useState<Person[]>([]);
  const [occasionsMap, setOccasionsMap] = useState<Record<string, UpcomingOccasion[]>>({});
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [searchIsSelf, setSearchIsSelf] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Circles state
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circlesLoading, setCirclesLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [circleType, setCircleType] = useState<"exchange" | "occasion">("exchange");
  const [circleName, setCircleName] = useState("");
  const [circleBudget, setCircleBudget] = useState("");
  const [circleDate, setCircleDate] = useState("");
  const [circleRecipientUsername, setCircleRecipientUsername] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/sign-in"); return; }
    Promise.all([
      fetch("/api/follows/network").then(r => r.json()),
      fetch("/api/occasions/upcoming").then(r => r.json()),
    ]).then(([peopleData, occasionData]) => {
      setPeople(peopleData.people || []);
      const map: Record<string, UpcomingOccasion[]> = {};
      for (const occ of occasionData.occasions || []) {
        if (!map[occ.user_id]) map[occ.user_id] = [];
        map[occ.user_id].push(occ);
      }
      setOccasionsMap(map);
    }).finally(() => setLoading(false));
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (tab === "circles" && !circlesLoading) {
      setCirclesLoading(true);
      fetch("/api/circles").then(r => r.json()).then(d => setCircles(d.circles || [])).finally(() => setCirclesLoading(false));
    }
  }, [tab]);

  function handleSearchInput(val: string) {
    setSearchQuery(val);
    setSearchResult(null);
    setSearchNotFound(false);
    setSearchIsSelf(false);
    setSelectedLabel("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim() || val.trim().length < 2) return;
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/follows/search?q=${encodeURIComponent(val.trim().toLowerCase())}`);
      const data = await res.json();
      setSearching(false);
      if (data.result) setSearchResult(data.result);
      else if (data.isSelf) setSearchIsSelf(true);
      else setSearchNotFound(true);
    }, 400);
  }

  async function sendFollowRequest(username: string) {
    if (!selectedLabel) return;
    setSendingRequest(true);
    await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, label: selectedLabel }) });
    setSearchResult(prev => prev ? { ...prev, followStatus: "pending" } : prev);
    setSendingRequest(false);
  }

  async function removeConnection(username: string) {
    setRemoving(username);
    setConfirmRemove(null);
    await fetch("/api/follows", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
    setPeople(prev => prev.filter(p => p.username !== username));
    setRemoving(null);
  }

  async function handleCreateCircle(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: circleName, budget: circleBudget, eventDate: circleDate || null, circleType, recipientUsername: circleRecipientUsername || null }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error || "Failed to create"); return; }
    router.push(`/circles/${data.circle.id}`);
  }

  return (
    <main className="min-h-screen bg-[#EAEAE0]">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-[#111111]">My People</h1>
          <p className="text-[#888888] text-base mt-0.5">Your gift network.</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-2xl shadow-card p-1 gap-1">
          <button
            onClick={() => setTab("people")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "people" ? "bg-[#111111] text-white" : "text-[#888888] hover:text-[#111111]"}`}
          >
            <Users className="w-4 h-4" />
            People
          </button>
          <button
            onClick={() => setTab("circles")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === "circles" ? "bg-[#111111] text-white" : "text-[#888888] hover:text-[#111111]"}`}
          >
            <Gift className="w-4 h-4" />
            Gift Circles
          </button>
        </div>

        {/* ── PEOPLE TAB ── */}
        {tab === "people" && (
          <>
            {/* Search card */}
            <div className="bg-white rounded-2xl shadow-card p-4">
              <p className="text-sm font-bold text-[#111111] mb-3">Find someone by username</p>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                <input
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="Enter their username..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              {searching && <p className="text-xs text-[#888888] mt-2">Searching...</p>}
              {searchNotFound && !searching && <p className="text-xs text-[#888888] mt-2">No profile found with that username.</p>}
              {searchIsSelf && !searching && <p className="text-xs text-[#888888] mt-2">That&apos;s you! Search for someone else.</p>}

              {searchResult && !searching && (
                <div className="mt-4 pt-4 border-t border-[#F0F0E8]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {searchResult.avatar ? <img src={searchResult.avatar} alt={searchResult.name} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#2D4A1E] bg-[#C4D4B4]">{searchResult.name[0]?.toUpperCase()}</div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-[#111111]">{searchResult.name}</p>
                      <p className="text-xs text-[#888888]">@{searchResult.username}</p>
                    </div>
                  </div>
                  {searchResult.followStatus === "accepted" && <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Already in your people</p>}
                  {searchResult.followStatus === "pending" && <p className="text-xs text-[#888888] font-semibold">Request already sent</p>}
                  {searchResult.followStatus === "none" && (
                    <>
                      <p className="text-xs font-semibold text-[#888888] mb-2">Who are they to you?</p>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {LABELS.map(l => (
                          <button key={l} onClick={() => setSelectedLabel(l)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-[#111111] border-[#111111] text-white" : "bg-white border-[#E0E0D8] text-[#111111] hover:border-[#111111]"}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => sendFollowRequest(searchResult.username)} disabled={!selectedLabel || sendingRequest}
                        className="w-full py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] disabled:text-[#888888] text-white font-bold rounded-full text-sm transition-colors">
                        {sendingRequest ? "Sending..." : "Send request"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!loading && people.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-card">
                <Users className="w-12 h-12 text-[#CCCCCC] mx-auto mb-3" />
                <p className="font-semibold text-[#111111] mb-1">No one in your network yet</p>
                <p className="text-[#888888] text-sm">Search above to add family and friends.</p>
              </div>
            )}

            {!loading && people.length > 0 && (
              <div className="space-y-3">
                {people.map(person => (
                  <div key={person.id} className="bg-white rounded-2xl shadow-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        {person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[#2D4A1E] bg-[#C4D4B4]">{person.name?.[0]?.toUpperCase() || "?"}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-[#111111]">{person.name}</p>
                          {person.myLabel && <span className="text-xs text-[#888888]">· {person.myLabel}</span>}
                        </div>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${birthdayColor(person.daysUntilBirthday)}`}>
                          <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                          {birthdayText(person.daysUntilBirthday)}
                        </p>
                        {(occasionsMap[person.id] || []).map(occ => (
                          <span key={occ.id} className="inline-flex items-center gap-1 text-xs mt-0.5 text-[#5C3118] font-semibold">
                            <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" />
                            {occ.name} · {occ.days_until === 0 ? "today" : `in ${occ.days_until}d`}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a href={`/for/${person.username}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white font-semibold rounded-full text-sm transition-colors">
                        Find a gift <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                      {confirmRemove === person.username ? (
                        <>
                          <button onClick={() => removeConnection(person.username)} disabled={removing === person.username}
                            className="px-4 py-2.5 bg-red-500 text-white font-semibold rounded-full text-sm">
                            {removing === person.username ? "..." : "Remove"}
                          </button>
                          <button onClick={() => setConfirmRemove(null)} className="px-4 py-2.5 bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmRemove(person.username)} className="px-4 py-2.5 bg-[#F0F0E8] hover:bg-[#E0E0D8] text-[#888888] font-semibold rounded-full text-sm transition-colors">Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── GIFT CIRCLES TAB ── */}
        {tab === "circles" && (
          <>
            {/* Create button / form */}
            {!showCreateForm ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Gift Circle
              </button>
            ) : (
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-bold text-[#111111]">New Gift Circle</p>
                  <button onClick={() => { setShowCreateForm(false); setCreateError(""); setCircleType("exchange"); setCircleRecipientUsername(""); }} className="p-1.5 text-[#888888] hover:text-[#111111]">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Type selection */}
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  {([
                    { type: "exchange" as const, icon: <Shuffle className="w-5 h-5 mb-2" />, label: "Gift Exchange", sub: "Secret Santa — everyone draws a name" },
                    { type: "occasion" as const, icon: <CalendarDays className="w-5 h-5 mb-2" />, label: "Group Occasion", sub: "Baby shower, wedding — everyone shops for one person" },
                  ] as const).map(({ type, icon, label, sub }) => (
                    <button key={type} onClick={() => setCircleType(type)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${circleType === type ? "border-[#111111] bg-[#111111]" : "border-[#E0E0D8] bg-[#F5F5F0] hover:border-[#888888]"}`}>
                      <div className={circleType === type ? "text-white" : "text-[#111111]"}>{icon}</div>
                      <p className={`text-sm font-bold leading-snug ${circleType === type ? "text-white" : "text-[#111111]"}`}>{label}</p>
                      <p className={`text-xs mt-1 leading-snug ${circleType === type ? "text-white/70" : "text-[#888888]"}`}>{sub}</p>
                    </button>
                  ))}
                </div>

                <form onSubmit={handleCreateCircle} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">Circle name</label>
                    <input
                      type="text"
                      value={circleName}
                      onChange={e => setCircleName(e.target.value)}
                      placeholder={circleType === "occasion" ? "e.g. Sarah's Baby Shower, Jake's Graduation" : "e.g. Smith Family Christmas"}
                      maxLength={60}
                      className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                    />
                  </div>

                  {circleType === "occasion" && (
                    <div>
                      <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">
                        Their GiftButler username <span className="text-[#CCCCCC] normal-case font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                        <input
                          type="text"
                          value={circleRecipientUsername}
                          onChange={e => setCircleRecipientUsername(e.target.value.replace(/^@/, "").toLowerCase())}
                          placeholder="username"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                        />
                      </div>
                      <p className="text-xs text-[#AAAAAA] mt-1">Links their wishlist so members can see what they want.</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">
                      {circleType === "occasion" ? "Suggested contribution ($)" : "Budget per person ($)"} <span className="text-[#CCCCCC] normal-case font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                      <input
                        type="number"
                        value={circleBudget}
                        onChange={e => setCircleBudget(e.target.value)}
                        placeholder="50"
                        min={1}
                        max={10000}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">
                      Event date <span className="text-[#CCCCCC] normal-case font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                      <input
                        type="date"
                        value={circleDate}
                        onChange={e => setCircleDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] appearance-none"
                      />
                    </div>
                  </div>
                  {createError && <p className="text-red-500 text-xs">{createError}</p>}
                  <button
                    type="submit"
                    disabled={creating || !circleName.trim()}
                    className="w-full py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] disabled:text-[#888888] text-white font-bold rounded-full text-sm transition-colors"
                  >
                    {creating ? "Creating..." : `Create ${circleType === "occasion" ? "Group Occasion" : "Gift Exchange"}`}
                  </button>
                </form>
              </div>
            )}

            {circlesLoading && (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!circlesLoading && circles.length === 0 && !showCreateForm && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-card">
                <Gift className="w-12 h-12 text-[#CCCCCC] mx-auto mb-3" />
                <p className="font-semibold text-[#111111] mb-1">No Gift Circles yet</p>
                <p className="text-[#888888] text-sm">Plan a surprise party, coordinate a group gift, or run a Secret Santa — all without spoiling it.</p>
              </div>
            )}

            {!circlesLoading && circles.length > 0 && (
              <div className="space-y-3">
                {circles.map(circle => {
                  const eventDate = circle.event_date
                    ? new Date(circle.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : null;
                  const isDrawn = circle.status === "drawn";
                  return (
                    <button
                      key={circle.id}
                      onClick={() => router.push(`/circles/${circle.id}`)}
                      className="w-full bg-white rounded-2xl shadow-card p-4 text-left hover:bg-[#F5F5F0] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-[#111111] truncate">{circle.name}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isDrawn ? "bg-[#ECC8AE] text-[#5C3118]" : "bg-[#C4D4B4] text-[#2D4A1E]"}`}>
                              {isDrawn ? "Drawn" : "Open"}
                            </span>
                          </div>
                          <p className="text-sm text-[#888888]">
                            {circle.budget ? `$${circle.budget} · ` : ""}{circle.memberCount} {circle.memberCount === 1 ? "member" : "members"}
                            {eventDate ? ` · ${eventDate}` : ""}
                          </p>
                          {circle.isOrganizer && <p className="text-xs text-[#AAAAAA] mt-0.5">You organized this</p>}
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#CCCCCC] flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
