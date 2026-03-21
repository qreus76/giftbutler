"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Gift, Users, Calendar, DollarSign, HelpCircle, CalendarDays } from "lucide-react";
import { use } from "react";

interface CircleInfo {
  id: string;
  name: string;
  budget: number;
  event_date: string | null;
  status: string;
  memberCount: number;
  organizerName: string;
  circle_type: string;
  recipient_username: string | null;
}

export default function JoinPage({ params }: { params: Promise<{ inviteCode: string }> }) {
  const { inviteCode } = use(params);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [circle, setCircle] = useState<CircleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/circles/join?code=${inviteCode}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setNotFound(true);
        else setCircle(d.circle);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    setError("");
    const res = await fetch("/api/circles/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode }),
    });
    const data = await res.json();
    setJoining(false);
    if (!res.ok) { setError(data.error || "Something went wrong"); return; }
    router.push(`/circles/${data.circle.id}`);
  }

  if (loading) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (notFound) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#F0F0E8] rounded-full flex items-center justify-center mx-auto mb-4">
          <HelpCircle className="w-8 h-8 text-[#CCCCCC]" />
        </div>
        <h1 className="text-2xl font-bold text-[#111111] mb-2">Invite not found</h1>
        <p className="text-[#888888] text-sm mb-6">This link may be invalid or the circle may have been removed.</p>
        <Link href="/" className="px-6 py-3 bg-[#111111] text-white font-bold rounded-full text-sm">Go home</Link>
      </div>
    </main>
  );

  if (!circle) return null;

  const isExchange = circle.circle_type !== "occasion";
  const isClosed = circle.status !== "open" && isExchange;
  const eventDate = circle.event_date ? new Date(circle.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

  return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isExchange ? "bg-[#ECC8AE]" : "bg-[#B8CED0]"}`}>
            {isExchange ? <Gift className="w-8 h-8 text-[#111111]" /> : <CalendarDays className="w-8 h-8 text-[#111111]" />}
          </div>
          <p className="text-sm font-semibold text-[#888888] mb-1">{circle.organizerName} invited you to</p>
          <h1 className="text-2xl font-bold text-[#111111]">{circle.name}</h1>
          {!isExchange && <p className="text-xs text-[#888888] mt-1">Group Occasion</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#C4D4B4] rounded-full flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-[#2D4A1E]" />
            </div>
            <div>
              <p className="text-xs text-[#888888] font-semibold uppercase tracking-wide">Budget</p>
              <p className="text-[#111111] font-bold">${circle.budget} {isExchange ? "per person" : "contribution"}</p>
            </div>
          </div>
          {eventDate && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#B8CED0] rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-[#1A3D42]" />
              </div>
              <div>
                <p className="text-xs text-[#888888] font-semibold uppercase tracking-wide">Event date</p>
                <p className="text-[#111111] font-bold">{eventDate}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#ECC8AE] rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-[#5C3118]" />
            </div>
            <div>
              <p className="text-xs text-[#888888] font-semibold uppercase tracking-wide">Members</p>
              <p className="text-[#111111] font-bold">{circle.memberCount} joined</p>
            </div>
          </div>
        </div>

        {isClosed && (
          <div className="bg-[#F5F5F0] rounded-2xl p-4 text-center mb-4">
            <p className="text-[#888888] text-sm">Names have already been drawn for this circle. You can&apos;t join after the draw.</p>
          </div>
        )}

        {!isExchange && circle.recipient_username && (
          <div className="bg-[#B8CED0] rounded-2xl p-4 mb-4">
            <p className="text-xs font-bold text-[#1A3D42] uppercase tracking-wide mb-1">Celebrating</p>
            <p className="text-[#111111] font-semibold">@{circle.recipient_username}</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        {!isClosed && (
          <>
            {!isLoaded && (
              <div className="w-6 h-6 border-2 border-[#111111] border-t-transparent rounded-full animate-spin mx-auto" />
            )}
            {isLoaded && !user && (
              <div className="flex flex-col gap-2.5">
                <Link
                  href={`/sign-up?redirect_url=/join/${inviteCode}`}
                  className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-center text-sm transition-colors"
                >
                  Create account to join
                </Link>
                <Link
                  href={`/sign-in?redirect_url=/join/${inviteCode}`}
                  className="w-full py-3.5 bg-white border border-[#E0E0D8] hover:bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-center text-sm transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
            {isLoaded && user && (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors"
              >
                {joining ? "Joining..." : isExchange ? `Join ${circle.name}` : `Join the occasion`}
              </button>
            )}
          </>
        )}

        <p className="text-center text-xs text-[#CCCCCC] mt-6">
          <Link href="/" className="hover:text-[#888888]">GiftButler</Link>
        </p>
      </div>
    </main>
  );
}
