"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Search, Users, Cake } from "lucide-react";

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
  if (days === 0) return "Birthday today!";
  if (days === 1) return "Birthday tomorrow!";
  return `Birthday in ${days} days`;
}

function birthdayColor(days: number | null): string {
  if (days === null) return "text-[#65676B]";
  if (days <= 7) return "text-red-500 font-semibold";
  if (days <= 30) return "text-amber-600 font-semibold";
  return "text-[#65676B]";
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
    <main className="min-h-screen bg-[#F0F2F5]">
      <div className="max-w-xl mx-auto px-3 py-4 space-y-3">
        <div className="px-1">
          <h1 className="text-2xl font-bold text-[#1C1E21]">My People</h1>
          <p className="text-[#65676B] text-sm">Your gift network, sorted by upcoming birthday.</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] p-4">
          <p className="text-sm font-bold text-[#1C1E21] mb-3">Find someone by username</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#65676B]" />
            <input
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Enter their username..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#E4E6EB] text-sm text-[#1C1E21] placeholder-[#BCC0C4] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {searching && <p className="text-xs text-[#65676B] mt-2">Searching...</p>}
          {searchNotFound && !searching && <p className="text-xs text-[#65676B] mt-2">No profile found with that username.</p>}
          {searchIsSelf && !searching && <p className="text-xs text-[#65676B] mt-2">That&apos;s you! Search for someone else.</p>}

          {searchResult && !searching && (
            <div className="mt-3 pt-3 border-t border-[#E4E6EB]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {searchResult.avatar ? <img src={searchResult.avatar} alt={searchResult.name} className="w-full h-full object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-amber-400">{searchResult.name[0]?.toUpperCase()}</div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-[#1C1E21] text-sm">{searchResult.name}</p>
                  <p className="text-xs text-[#65676B]">@{searchResult.username}</p>
                </div>
              </div>
              {searchResult.followStatus === "accepted" && <p className="text-xs text-emerald-600 font-semibold">✓ Already in your people</p>}
              {searchResult.followStatus === "pending" && <p className="text-xs text-[#65676B] font-semibold">Request already sent</p>}
              {searchResult.followStatus === "none" && (
                <>
                  <p className="text-xs font-semibold text-[#65676B] mb-2">Who are they to you?</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {LABELS.map(l => (
                      <button key={l} onClick={() => setSelectedLabel(l)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-amber-400 border-amber-400 text-white" : "bg-white border-[#E4E6EB] text-[#1C1E21] hover:border-amber-400"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => sendFollowRequest(searchResult.username)} disabled={!selectedLabel || sendingRequest}
                    className="w-full py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#E4E6EB] disabled:text-[#BCC0C4] text-white font-bold rounded-lg text-sm transition-colors">
                    {sendingRequest ? "Sending..." : "Send request"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && people.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-card border border-[#E4E6EB]">
            <Users className="w-12 h-12 text-[#E4E6EB] mx-auto mb-3" />
            <p className="font-semibold text-[#1C1E21] mb-1">No one here yet</p>
            <p className="text-[#65676B] text-sm">Search for family and friends above to get started.</p>
          </div>
        )}

        {!loading && people.length > 0 && (
          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
            <div className="divide-y divide-[#E4E6EB]">
              {people.map(person => (
                <div key={person.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {person.avatar ? <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white bg-amber-400">{person.name?.[0]?.toUpperCase() || "?"}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-[#1C1E21]">{person.name}</p>
                        {person.myLabel && <span className="text-xs text-[#65676B]">· {person.myLabel}</span>}
                      </div>
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${birthdayColor(person.daysUntilBirthday)}`}>
                        <Cake className="w-3.5 h-3.5 flex-shrink-0" />
                        {birthdayText(person.daysUntilBirthday)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/for/${person.username}`} className="flex-1 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold rounded-lg text-xs text-center transition-colors">
                      Find them a gift →
                    </a>
                    {confirmRemove === person.username ? (
                      <>
                        <button onClick={() => removeConnection(person.username)} disabled={removing === person.username}
                          className="px-3 py-2 bg-red-500 text-white font-semibold rounded-lg text-xs">
                          {removing === person.username ? "..." : "Remove"}
                        </button>
                        <button onClick={() => setConfirmRemove(null)} className="px-3 py-2 bg-[#E4E6EB] text-[#1C1E21] font-semibold rounded-lg text-xs">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmRemove(person.username)} className="px-3 py-2 bg-[#E4E6EB] hover:bg-[#D8DADF] text-[#65676B] font-semibold rounded-lg text-xs transition-colors">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
