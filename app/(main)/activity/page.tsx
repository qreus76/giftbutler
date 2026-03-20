"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Clock, UserPlus, Cake, Gift } from "lucide-react";
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return mins <= 1 ? "just now" : `${mins} minutes ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function getCompletionItems(profile: Profile, hints: Hint[]) {
  const profileUrl = profile.username ? `/for/${profile.username}` : null;
  return [
    { done: !!profile.name, label: "Add your display name", action: "/profile/edit" },
    { done: !!profile.bio, label: "Write a short bio", action: "/profile/edit" },
    { done: !!profile.birthday, label: "Add your birthday (so people know when to shop!)", action: "/profile/edit" },
    { done: hints.filter(h => h.category !== "avoid").length >= 3, label: "Add at least 3 hints", action: profileUrl },
    { done: hints.filter(h => h.category !== "avoid").length >= 8, label: "Add 8+ hints for the best recommendations", action: profileUrl },
  ];
}

function hintHealth(count: number): { label: string; color: string } {
  if (count === 0) return { label: "Add hints to get started", color: "text-[#7A6A5E]" };
  if (count < 3) return { label: "Add a few more", color: "text-[#922B21]" };
  if (count < 8) return { label: "Good — add more for better ideas", color: "text-[#C08A3C]" };
  return { label: "Looking great", color: "text-[#2D6A4F]" };
}

export default function ActivityPage() {
  const { user } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [recentVisits, setRecentVisits] = useState<{ created_at: string; device_type: string | null; referrer: string | null }[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];
  const { followRequests, removeRequest } = useFollowRequests();
  const [requestLabels, setRequestLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      const [meRes, peopleRes] = await Promise.all([
        fetch("/api/me"),
        fetch("/api/follows/network"),
      ]);
      const data = await meRes.json();
      if (data.redirect) { router.push("/onboarding"); return; }
      setProfile(data.profile);
      setHints(data.hints);
      setVisitCount(data.visitCount || 0);
      setClaimCount(data.claimCount || 0);
      setRecentVisits(data.recentVisits || []);
      if (peopleRes.ok) {
        const pd = await peopleRes.json();
        setPeople(pd.people || []);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleFollowRequest(requesterId: string, action: "accept" | "reject") {
    const label = requestLabels[requesterId] || null;
    await fetch("/api/follows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requester_id: requesterId, action, label }),
    });
    removeRequest(requesterId);
  }

  function formatReferrer(referrer: string | null): string {
    if (!referrer) return "Direct visit";
    try {
      const host = new URL(referrer).hostname.replace("www.", "");
      if (host.includes("instagram")) return "From Instagram";
      if (host.includes("facebook") || host.includes("fb.")) return "From Facebook";
      if (host.includes("twitter") || host.includes("x.com")) return "From X / Twitter";
      if (host.includes("tiktok")) return "From TikTok";
      if (host.includes("snapchat")) return "From Snapchat";
      if (host.includes("pinterest")) return "From Pinterest";
      if (host.includes("giftbutler")) return "From GiftButler";
      return `From ${host}`;
    } catch {
      return "Shared link";
    }
  }

  function formatDevice(device: string | null): string {
    if (!device) return "";
    const map: Record<string, string> = { ios: "iPhone", android: "Android", tablet: "Tablet", mobile: "Mobile", desktop: "Desktop" };
    return map[device] || device;
  }

  async function copyLink() {
    if (!profile) return;
    const url = `${window.location.origin}/for/${profile.username}`;
    const isMobile = window.innerWidth < 768;
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: `${profile.name || profile.username}'s gift profile`,
          text: "Here's what I actually want — no more guessing!",
          url,
        });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(url).catch(() => { alert("Unable to copy — please copy manually."); });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const completionItems = profile ? getCompletionItems(profile, hints) : [];
  const completionDone = completionItems.filter(i => i.done).length;
  const completionPct = completionItems.length ? Math.round((completionDone / completionItems.length) * 100) : 0;
  const nextStep = completionItems.find(i => !i.done);

  const upcomingBirthdays = people
    .filter(p => p.daysUntilBirthday !== null && p.daysUntilBirthday <= 30)
    .sort((a, b) => (a.daysUntilBirthday ?? 999) - (b.daysUntilBirthday ?? 999));

  const hint = hintHealth(hints.filter(h => h.category !== "avoid").length);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FAF4EC] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C08A3C] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="min-h-screen bg-[#FAF4EC] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-[#1A1410] font-medium mb-2">Something went wrong loading your activity.</p>
          <button onClick={() => { setLoadError(false); setLoading(true); loadProfile(); }} className="text-[#6B2437] font-semibold text-sm hover:text-[#4A1828] cursor-pointer">
            Try again →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF4EC]">
      <div className="max-w-xl mx-auto px-4 py-6">

        {/* Profile completion nudge */}
        {completionPct < 100 && nextStep && (
          <div className="bg-white rounded-2xl shadow-card ring-1 ring-[#E5C8D0] p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-1 bg-[#EFE6DA] rounded-full overflow-hidden">
                  <div className="h-full bg-[#6B2437] rounded-full transition-all" style={{ width: `${completionPct}%` }} />
                </div>
                <span className="text-xs font-semibold text-[#7A6A5E] flex-shrink-0">{completionPct}%</span>
              </div>
              <p className="text-sm text-[#7A6A5E] truncate">
                Next: <span className="font-medium text-[#1A1410]">{nextStep.label}</span>
              </p>
            </div>
            {nextStep.action && (
              <button
                onClick={() => router.push(nextStep.action!)}
                className="text-xs font-semibold text-[#6B2437] hover:text-[#4A1828] flex-shrink-0 cursor-pointer"
              >
                Go →
              </button>
            )}
          </div>
        )}

        {/* Follow requests */}
        {followRequests.length > 0 && (
          <div className="bg-white rounded-2xl shadow-card ring-1 ring-[#E5C8D0] p-4 mb-4">
            <p className="text-xs font-semibold text-[#6B2437] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              People requests ({followRequests.length})
            </p>
            <div className="flex flex-col gap-4">
              {followRequests.map(req => (
                <div key={req.requester_id}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {req.avatar ? (
                        <img src={req.avatar} alt={req.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #6B2437, #8B3050)" }}>
                          {req.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1410]">{req.name || req.username}</p>
                      <p className="text-xs text-[#7A6A5E]">@{req.username} wants to join your people</p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-[#7A6A5E] mb-2">Who are they to you?</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {LABELS.map(l => (
                      <button
                        key={l}
                        onClick={() => setRequestLabels(prev => ({ ...prev, [req.requester_id]: l }))}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${requestLabels[req.requester_id] === l ? "border-[#6B2437] bg-[#F5E8EC] text-[#6B2437]" : "border-[#E5D9CC] text-[#7A6A5E] hover:border-[#6B2437]"}`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFollowRequest(req.requester_id, "accept")}
                      disabled={!requestLabels[req.requester_id]}
                      className="flex-1 py-2 bg-[#C08A3C] hover:bg-[#A87A32] disabled:bg-[#E5D9CC] disabled:text-[#7A6A5E] text-white font-bold rounded-xl text-sm transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleFollowRequest(req.requester_id, "reject")}
                      className="px-4 py-2 border border-[#E5D9CC] text-[#7A6A5E] font-semibold rounded-xl text-sm hover:bg-[#EFE6DA] transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-[#7A6A5E]" />
              <span className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wide">Views</span>
            </div>
            <p className="text-2xl font-bold text-[#1A1410]">{visitCount}</p>
            <p className="text-xs text-[#7A6A5E]">last 30 days</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wide">Hints</span>
            </div>
            <p className="text-2xl font-bold text-[#1A1410]">{hints.length}</p>
            <p className={`text-xs ${hint.color}`}>{hint.label}</p>
          </div>
          <div className={`rounded-2xl shadow-card p-4 ${claimCount > 0 ? "bg-[#F5E8EC]" : "bg-white"}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Gift className="w-3.5 h-3.5 text-[#7A6A5E]" />
              <span className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wide">Gifts</span>
            </div>
            <p className={`text-2xl font-bold ${claimCount > 0 ? "text-[#6B2437]" : "text-[#1A1410]"}`}>{claimCount}</p>
            <p className="text-xs text-[#7A6A5E]">{claimCount > 0 ? "people are planning!" : "claimed"}</p>
          </div>
        </div>

        {/* Upcoming birthdays */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          <p className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Cake className="w-3.5 h-3.5" />
            Coming up
          </p>
          {upcomingBirthdays.length === 0 ? (
            <div className="text-center py-6">
              <Cake className="w-8 h-8 text-[#E5D9CC] mx-auto mb-2" />
              <p className="text-[#1A1410] text-sm font-medium mb-1">
                {people.length === 0 ? "No one in your network yet" : "No birthdays in the next 30 days"}
              </p>
              <p className="text-[#7A6A5E] text-xs mb-3">
                {people.length === 0
                  ? "Add family and friends to your people and you'll see their upcoming birthdays here."
                  : "You're all caught up — check back closer to the next birthday."}
              </p>
              {people.length === 0 && (
                <a href="/my-people" className="inline-block px-4 py-2 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-xl text-xs transition-colors">
                  Add people →
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingBirthdays.slice(0, 5).map(person => (
                <div key={person.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {person.avatar ? (
                      <img src={person.avatar} alt={person.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "linear-gradient(135deg, #6B2437, #8B3050)" }}>
                        {person.name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1410] truncate">{person.name}</p>
                    <p className={`text-xs font-medium ${person.daysUntilBirthday === 0 ? "text-[#922B21]" : person.daysUntilBirthday! <= 7 ? "text-[#C08A3C]" : "text-[#7A6A5E]"}`}>
                      {person.daysUntilBirthday === 0 ? "Today!" : person.daysUntilBirthday === 1 ? "Tomorrow" : `In ${person.daysUntilBirthday} days`}
                    </p>
                  </div>
                  <a
                    href={`/for/${person.username}`}
                    className="px-3 py-1.5 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-xl text-xs transition-colors flex-shrink-0"
                  >
                    Find a gift →
                  </a>
                </div>
              ))}
              {upcomingBirthdays.length > 5 && (
                <a href="/my-people" className="text-xs text-[#6B2437] font-semibold hover:text-[#4A1828] text-center pt-1">
                  See all {upcomingBirthdays.length} upcoming birthdays →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Recent visitors */}
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
          <p className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            Recent visitors
          </p>
          {recentVisits.length === 0 ? (
            <div className="text-center py-6">
              <Eye className="w-8 h-8 text-[#E5D9CC] mx-auto mb-2" />
              <p className="text-[#1A1410] text-sm font-medium mb-1">No visits yet</p>
              <p className="text-[#7A6A5E] text-xs mb-3">Share your profile link and you'll see who stops by here.</p>
              <button onClick={copyLink} className="inline-block px-4 py-2 bg-[#C08A3C] hover:bg-[#A87A32] text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer">
                {copied ? "Copied!" : "Share my profile →"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentVisits.map((v, i) => {
                const source = formatReferrer(v.referrer);
                const device = formatDevice(v.device_type);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#F5E8EC] rounded-full flex items-center justify-center flex-shrink-0">
                      <Eye className="w-3.5 h-3.5 text-[#6B2437]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1410] truncate">
                        {source}{device ? ` · ${device}` : ""}
                      </p>
                      <p className="text-xs text-[#7A6A5E] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(v.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Profile link */}
        {profile && (
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-[#7A6A5E] mb-0.5">Your gift profile</p>
              <p className="text-[#1A1410] font-medium text-sm truncate">giftbutler.io/for/{profile.username}</p>
            </div>
            <button onClick={copyLink} className="text-xs text-[#6B2437] font-semibold hover:text-[#4A1828] flex-shrink-0 ml-2 cursor-pointer">
              {copied ? "Copied!" : <><span className="md:hidden">Share</span><span className="hidden md:inline">Copy link</span></>}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-6">
          <a href="/my-people" className="text-xs text-[#7A6A5E] hover:text-[#1A1410] transition-colors">
            My People
          </a>
          <button
            onClick={() => router.push(`/for/${profile?.username}`)}
            className="text-xs text-[#7A6A5E] hover:text-[#1A1410] transition-colors cursor-pointer"
          >
            View my profile
          </button>
        </div>
      </div>
    </main>
  );
}
