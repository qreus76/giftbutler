"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search, Users, Cake, ArrowRight } from "lucide-react";

interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  birthday: string | null;
  daysUntilBirthday: number | null;
  myLabel: string | null;
}

interface SearchResult {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  followStatus: "none" | "pending" | "accepted";
}

const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];

function birthdayText(days: number | null): string {
  if (days === null) return "Birthday unknown";
  if (days === 0) return "Birthday today! 🎉";
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
  const [people, setPeople] = useState<Person[]>([]);
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

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/sign-in"); return; }
    fetch("/api/follows/network").then(r => r.json()).then(d => setPeople(d.people || [])).finally(() => setLoading(false));
  }, [isLoaded, user, router]);

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

  return (
    <main className="min-h-screen bg-[#EAEAE0]">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#111111]">My People</h1>
          <p className="text-[#888888] text-base mt-0.5">Your gift network, sorted by birthday.</p>
        </div>

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
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-[#111111]">{searchResult.name[0]?.toUpperCase()}</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#111111]">{searchResult.name}</p>
                  <p className="text-xs text-[#888888]">@{searchResult.username}</p>
                </div>
              </div>
              {searchResult.followStatus === "accepted" && <p className="text-xs text-emerald-600 font-semibold">✓ Already in your people</p>}
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
            <p className="font-semibold text-[#111111] mb-1">No one here yet</p>
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
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white bg-[#C4D4B4]">{person.name?.[0]?.toUpperCase() || "?"}</div>
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
      </div>
    </main>
  );
}
