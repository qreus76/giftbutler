"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Settings, Search, Users } from "lucide-react";

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

const LABELS = ["Husband", "Wife", "Partner", "Dad", "Mom", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", "Grandson", "Granddaughter", "Uncle", "Aunt", "Nephew", "Niece", "Cousin", "Best Friend", "Friend", "Colleague", "Other"];

function birthdayText(days: number | null): string {
  if (days === null) return "Birthday unknown";
  if (days === 0) return "🎂 Birthday is today!";
  if (days === 1) return "🎂 Birthday is tomorrow!";
  if (days <= 7) return `🎂 Birthday in ${days} days`;
  if (days <= 30) return `🎂 Birthday in ${days} days`;
  return `🎂 Birthday in ${days} days`;
}

function birthdayUrgency(days: number | null): string {
  if (days === null) return "text-stone-400";
  if (days <= 7) return "text-red-500 font-semibold";
  if (days <= 30) return "text-amber-600 font-semibold";
  return "text-stone-500";
}

export default function MyPeoplePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/sign-in"); return; }
    fetch("/api/follows/network")
      .then(r => r.json())
      .then(d => setPeople(d.people || []))
      .finally(() => setLoading(false));
  }, [isLoaded, user, router]);

  function handleSearchInput(val: string) {
    setSearchQuery(val);
    setSearchResult(null);
    setSearchNotFound(false);
    setSelectedLabel("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim() || val.trim().length < 2) return;
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/follows/search?q=${encodeURIComponent(val.trim().toLowerCase())}`);
      const data = await res.json();
      setSearching(false);
      if (data.result) setSearchResult(data.result);
      else setSearchNotFound(true);
    }, 400);
  }

  async function sendFollowRequest(username: string) {
    if (!selectedLabel) return;
    setSendingRequest(true);
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, label: selectedLabel }),
    });
    setSearchResult(prev => prev ? { ...prev, followStatus: "pending" } : prev);
    setSendingRequest(false);
  }

  async function removeConnection(username: string, name: string) {
    if (!confirm(`Remove ${name} from your people? This is silent — they won't be notified.`)) return;
    setRemoving(username);
    await fetch("/api/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setPeople(prev => prev.filter(p => p.username !== username));
    setRemoving(null);
  }

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Nav */}
      <nav className="border-b border-stone-100 bg-white">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/my-people" className="text-base font-bold text-stone-900">GiftButler</a>
          <div className="flex items-center gap-2">
            <a href="/my-people" className="p-2 text-amber-600 hover:text-amber-700 hover:bg-stone-100 rounded-xl transition-colors">
              <Users className="w-5 h-5" />
            </a>
            <button
              onClick={() => router.push("/dashboard/edit")}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Edit profile"
            >
              <Settings className="w-5 h-5" />
            </button>
            <a
              href="/dashboard"
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs transition-colors"
            >
              My dashboard →
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">My People</h1>
        <p className="text-stone-400 text-sm mb-6">Your gift network, sorted by upcoming birthday.</p>

        {/* Search */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-stone-700 mb-3">Find someone by username</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              value={searchQuery}
              onChange={e => handleSearchInput(e.target.value)}
              placeholder="Enter their username..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Searching spinner */}
          {searching && (
            <p className="text-xs text-stone-400 mt-3">Searching...</p>
          )}

          {/* Not found */}
          {searchNotFound && !searching && (
            <p className="text-xs text-stone-400 mt-3">No profile found with that username.</p>
          )}

          {/* Result */}
          {searchResult && !searching && (
            <div className="mt-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {searchResult.avatar ? (
                    <img src={searchResult.avatar} alt={searchResult.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-amber-400 flex items-center justify-center text-sm font-bold text-stone-900">
                      {searchResult.name[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{searchResult.name}</p>
                  <p className="text-xs text-stone-400">@{searchResult.username}</p>
                </div>
              </div>

              {searchResult.followStatus === "accepted" && (
                <p className="text-xs text-green-600 font-semibold">✓ Already in your people</p>
              )}
              {searchResult.followStatus === "pending" && (
                <p className="text-xs text-stone-400 font-semibold">Request already sent</p>
              )}
              {searchResult.followStatus === "none" && (
                <>
                  <p className="text-xs font-semibold text-stone-500 mb-2">Who are they to you?</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {LABELS.map(l => (
                      <button
                        key={l}
                        onClick={() => setSelectedLabel(l)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-500 hover:border-amber-300"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => sendFollowRequest(searchResult.username)}
                    disabled={!selectedLabel || sendingRequest}
                    className="w-full py-2.5 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-xl text-sm transition-colors"
                  >
                    {sendingRequest ? "Sending..." : "Send request"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && people.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">👥</p>
            <p className="font-semibold text-stone-700 mb-2">No one here yet</p>
            <p className="text-stone-400 text-sm mb-6">Visit someone's profile and add them to your people.</p>
            <a
              href="/explore"
              className="inline-block px-5 py-2.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-bold rounded-xl text-sm transition-colors"
            >
              Explore profiles →
            </a>
          </div>
        )}

        {!loading && people.length > 0 && (
          <div className="flex flex-col gap-3">
            {people.map(person => (
              <div key={person.id} className="bg-white border border-stone-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                    {person.avatar ? (
                      <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-400 flex items-center justify-center text-lg font-bold text-stone-900">
                        {person.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-900">{person.name}</p>
                      {person.myLabel && (
                        <span className="text-xs text-stone-400 font-medium">· {person.myLabel}</span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${birthdayUrgency(person.daysUntilBirthday)}`}>
                      {birthdayText(person.daysUntilBirthday)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <a
                    href={`/for/${person.username}`}
                    className="flex-1 py-2 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs text-center transition-colors"
                  >
                    Find them a gift →
                  </a>
                  <button
                    onClick={() => removeConnection(person.username, person.name)}
                    disabled={removing === person.username}
                    className="px-3 py-2 border border-stone-200 text-stone-400 hover:text-red-400 hover:border-red-200 font-semibold rounded-xl text-xs transition-colors"
                  >
                    {removing === person.username ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
