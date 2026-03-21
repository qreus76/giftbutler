"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Cake, Gift, Sparkles, Share2, ArrowRight, CalendarDays } from "lucide-react";
import type { Profile, Hint } from "@/lib/supabase";
import { useFollowRequests } from "@/lib/follow-request-context";

interface Person {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  daysUntilBirthday: number | null;
  myLabel: string | null;
}

interface UpcomingOccasion {
  user_id: string;
  username: string;
  person_name: string | null;
  name: string;
  days_until: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} min ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function getCompletionItems(profile: Profile, hints: Hint[]) {
  const profileUrl = profile.username ? `/for/${profile.username}` : null;
  const hintCount = hints.filter(h => h.category !== "avoid").length;
  return [
    { done: !!profile.name, label: "Add your display name", action: "/profile/edit" },
    { done: !!profile.bio, label: "Write a short bio", action: "/profile/edit" },
    { done: !!profile.birthday, label: "Add your birthday", action: "/profile/edit" },
    { done: hintCount >= 3, label: "Add at least 3 hints", action: profileUrl },
    { done: hintCount >= 5, label: "Add 5+ hints for better recommendations", action: profileUrl },
  ];
}

const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];

export default function ActivityPage() {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [upcomingOccasions, setUpcomingOccasions] = useState<UpcomingOccasion[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { followRequests, removeRequest } = useFollowRequests();
  const [requestLabels, setRequestLabels] = useState<Record<string, string>>({});

  useEffect(() => { if (user) loadProfile(); }, [user]);

  async function loadProfile() {
    try {
      const [meRes, peopleRes, occasionsRes] = await Promise.all([fetch("/api/me"), fetch("/api/follows/network"), fetch("/api/occasions/upcoming")]);
      const data = await meRes.json();
      setProfile(data.profile);
      setHints(data.hints);

      if (peopleRes.ok) { const pd = await peopleRes.json(); setPeople(pd.people || []); }
      if (occasionsRes.ok) { const od = await occasionsRes.json(); setUpcomingOccasions(od.occasions || []); }
    } catch { setLoadError(true); } finally { setLoading(false); }
  }

  async function handleFollowRequest(requesterId: string, action: "accept" | "reject") {
    const res = await fetch("/api/follows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requester_id: requesterId, action, label: requestLabels[requesterId] || null }),
    });
    if (res.ok) removeRequest(requesterId);
  }

  async function copyLink() {
    if (!profile) return;
    const url = `${window.location.origin}/for/${profile.username}`;
    if (navigator.share && window.innerWidth < 768) {
      try { await navigator.share({ title: `${profile.name || profile.username}'s gift profile`, text: "Here's what I actually want — no more guessing!", url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url).catch(() => alert("Unable to copy."));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const completionItems = profile ? getCompletionItems(profile, hints) : [];
  const completionDone = completionItems.filter(i => i.done).length;
  const completionPct = completionItems.length ? Math.round((completionDone / completionItems.length) * 100) : 0;
  const nextStep = completionItems.find(i => !i.done);
  const upcomingEvents = [
    ...people
      .filter(p => p.daysUntilBirthday !== null && p.daysUntilBirthday <= 30)
      .map(p => ({
        key: `bday-${p.id}`,
        username: p.username,
        name: p.name,
        avatar: p.avatar,
        daysUntil: p.daysUntilBirthday!,
        type: "birthday" as const,
      })),
    ...upcomingOccasions.map(occ => ({
      key: `occ-${occ.user_id}-${occ.name}`,
      username: occ.username,
      name: occ.person_name || occ.username,
      avatar: people.find(p => p.username === occ.username)?.avatar ?? null,
      daysUntil: occ.days_until,
      type: "occasion" as const,
      occasionName: occ.name,
    })),
  ].sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5);
  const upcomingCount = upcomingEvents.length;
  const hintsToShow = hints.filter(h => h.category !== "avoid");

  if (loading) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (loadError) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-[#111111] font-medium mb-2">Something went wrong.</p>
        <button onClick={() => { setLoadError(false); setLoading(true); loadProfile(); }} className="text-[#888888] font-semibold text-sm underline">Try again</button>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#EAEAE0]">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-6">

        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold text-[#111111] leading-tight">
            {profile?.name ? `Hey, ${profile.name.split(" ")[0]}!` : "Welcome back!"}
          </h1>
          <p className="text-[#888888] text-base mt-0.5">
            {hints.length === 0 && people.length === 0
              ? "Let's get you set up."
              : "What would you like to do?"}
          </p>
        </div>

        {/* Action cards — Artilate style */}
        <div className="space-y-3">
          <a href={profile?.username ? `/for/${profile.username}` : "#"}
            className="flex items-center gap-4 bg-[#C4D4B4] rounded-2xl p-4 active:opacity-80 transition-opacity">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-card">
              <Gift className="w-5 h-5 text-[#111111]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#111111]">My Wishlist</p>
              <p className="text-sm text-[#111111]/60">{hintsToShow.length > 0 ? `${hintsToShow.length} hints added` : "Add hints and share your link"}</p>
            </div>
            <div className="w-8 h-8 bg-[#111111] rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </a>

          <a href="/my-people"
            className="flex items-center gap-4 bg-[#B8CED0] rounded-2xl p-4 active:opacity-80 transition-opacity">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-card">
              <Sparkles className="w-5 h-5 text-[#111111]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#111111]">Find a gift</p>
              <p className="text-sm text-[#111111]/60">Pick someone, let AI do the rest</p>
            </div>
            <div className="w-8 h-8 bg-[#111111] rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </a>

          <button onClick={copyLink}
            className="w-full flex items-center gap-4 bg-[#ECC8AE] rounded-2xl p-4 active:opacity-80 transition-opacity">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-card">
              <Share2 className="w-5 h-5 text-[#111111]" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-[#111111]">Share my profile</p>
              <p className="text-sm text-[#111111]/60">{copied ? "Link copied!" : profile ? `giftbutler.io/for/${profile.username}` : "Copy your gift link"}</p>
            </div>
            <div className="w-8 h-8 bg-[#111111] rounded-full flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>

        {/* Profile completion nudge */}
        {completionPct < 100 && nextStep && (
          <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-[#111111]">Profile {completionPct}% complete</p>
              </div>
              <div className="w-full h-1.5 bg-[#EAEAE0] rounded-full overflow-hidden mb-1.5">
                <div className="h-full bg-[#111111] rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              <p className="text-xs text-[#888888]">Next: <span className="font-semibold text-[#111111]">{nextStep.label}</span></p>
            </div>
            {nextStep.action && (
              <button onClick={() => router.push(nextStep.action!)} className="w-8 h-8 bg-[#111111] rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        )}

        {/* Follow requests */}
        {followRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-[#F0F0E8] flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#888888]" />
              <p className="text-sm font-bold text-[#111111]">People requests</p>
              <span className="ml-auto bg-[#ECC8AE] text-[#111111] text-xs font-bold rounded-full px-2 py-0.5">{followRequests.length}</span>
            </div>
            <div className="divide-y divide-[#F0F0E8]">
              {followRequests.map(req => (
                <div key={req.requester_id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      {req.avatar ? <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" /> : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#2D4A1E] bg-[#C4D4B4]">{req.name?.[0]?.toUpperCase() || "?"}</div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111111]">{req.name || req.username}</p>
                      <p className="text-xs text-[#888888]">@{req.username} wants to join your people</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#888888] mb-2">Who are they to you?</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {LABELS.map(l => (
                      <button key={l} onClick={() => setRequestLabels(prev => ({ ...prev, [req.requester_id]: l }))}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${requestLabels[req.requester_id] === l ? "bg-[#111111] border-[#111111] text-white" : "bg-white border-[#E0E0D8] text-[#111111] hover:border-[#111111]"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleFollowRequest(req.requester_id, "accept")} disabled={!requestLabels[req.requester_id]}
                      className="flex-1 py-2.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] disabled:text-[#888888] text-white font-bold rounded-full text-sm transition-colors">
                      Accept
                    </button>
                    <button onClick={() => handleFollowRequest(req.requester_id, "reject")}
                      className="px-5 py-2.5 bg-[#F0F0E8] hover:bg-[#E0E0D8] text-[#111111] font-semibold rounded-full text-sm transition-colors">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coming up — birthdays + occasions */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-[#F0F0E8]">
            <div className="flex items-center gap-2">
              <Cake className="w-4 h-4 text-[#888888]" />
              <p className="text-sm font-bold text-[#111111]">Coming up</p>
            </div>
            {upcomingCount > 0 && <a href="/my-people" className="text-xs font-semibold text-[#888888] hover:text-[#111111]">See all</a>}
          </div>
          {upcomingCount === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-[#111111] text-sm font-semibold mb-1">{people.length === 0 ? "No one in your network yet" : "Nothing coming up in the next 30 days"}</p>
              <p className="text-[#888888] text-xs mb-4">{people.length === 0 ? "Add family and friends to see upcoming events." : "You're all caught up."}</p>
              {people.length === 0 && (
                <a href="/my-people" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#111111] text-white font-bold rounded-full text-sm">
                  Add people <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#F0F0E8]">
              {upcomingEvents.map(event => (
                <div key={event.key} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {event.avatar ? <img src={event.avatar} alt={event.name} className="w-full h-full object-cover" /> : (
                      <div className={`w-full h-full flex items-center justify-center text-sm font-bold text-white ${event.type === "birthday" ? "bg-[#C4D4B4]" : "bg-[#ECC8AE]"}`}>
                        {event.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111111] truncate">{event.name}</p>
                    <p className={`text-xs font-medium flex items-center gap-1 ${event.daysUntil === 0 ? "text-red-500" : event.daysUntil <= 7 ? "text-[#C4824A]" : "text-[#888888]"}`}>
                      {event.type === "birthday"
                        ? <><Cake className="w-3 h-3 flex-shrink-0" />{event.daysUntil === 0 ? "Birthday today!" : event.daysUntil === 1 ? "Birthday tomorrow" : `Birthday in ${event.daysUntil} days`}</>
                        : <><CalendarDays className="w-3 h-3 flex-shrink-0" />{"occasionName" in event ? event.occasionName : ""} · {event.daysUntil === 0 ? "today" : event.daysUntil === 1 ? "tomorrow" : `in ${event.daysUntil} days`}</>
                      }
                    </p>
                  </div>
                  <a href={`/for/${event.username}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] text-white font-semibold rounded-full text-xs transition-colors flex-shrink-0">
                    Gift <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </main>
  );
}
