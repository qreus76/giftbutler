"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Gift, Shuffle, Share2, CalendarDays, Pencil, X, DollarSign, Calendar, AtSign } from "lucide-react";
import { use } from "react";

interface CircleDetail {
  id: string;
  name: string;
  budget: number | null;
  event_date: string | null;
  status: string;
  invite_code: string;
  isOrganizer: boolean;
  memberCount: number;
  circle_type: string;
  recipient_username: string | null;
}

interface Member {
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
}

interface AssignedTo {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
}

interface Recipient {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
}

export default function CirclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [circle, setCircle] = useState<CircleDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignedTo, setAssignedTo] = useState<AssignedTo | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState("");
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editRecipient, setEditRecipient] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => { setIsMobile(window.innerWidth < 768); }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { router.push("/sign-in"); return; }
    fetch(`/api/circles/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); return; }
        setCircle(d.circle);
        setMembers(d.members);
        setAssignedTo(d.assignedTo);
        setRecipient(d.recipient || null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, isLoaded, user, router]);

  function openEdit() {
    if (!circle) return;
    setEditName(circle.name);
    setEditBudget(circle.budget ? String(circle.budget) : "");
    setEditDate(circle.event_date ? circle.event_date.slice(0, 10) : "");
    setEditRecipient(circle.recipient_username || "");
    setSaveError("");
    setEditing(true);
  }

  async function saveEdit() {
    if (!circle || !editName.trim()) return;
    setSaving(true); setSaveError("");
    const res = await fetch(`/api/circles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        budget: editBudget || null,
        eventDate: editDate || null,
        recipientUsername: circle.circle_type === "occasion" ? editRecipient : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setSaveError(data.error || "Failed to save"); return; }
    setCircle(prev => prev ? { ...prev, ...data.circle, isOrganizer: prev.isOrganizer, memberCount: prev.memberCount } : prev);
    setEditing(false);
  }

  async function handleDraw() {
    if (!circle) return;
    setDrawing(true);
    setDrawError("");
    const res = await fetch(`/api/circles/${id}/draw`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setDrawError(data.error || "Something went wrong"); setDrawing(false); return; }
    // Reload to show assignments
    const r2 = await fetch(`/api/circles/${id}`);
    const d2 = await r2.json();
    setCircle(d2.circle);
    setAssignedTo(d2.assignedTo);
    setDrawing(false);
  }

  async function handleLeaveOrDelete() {
    if (!circle) return;
    setLeaving(true);
    await fetch(`/api/circles/${id}`, { method: "DELETE" });
    router.push("/my-people");
  }

  async function shareInviteLink() {
    const url = `${window.location.origin}/join/${circle?.invite_code}`;
    if (navigator.share && window.innerWidth < 768) {
      const budgetText = circle?.budget ? ` — $${circle.budget} budget` : "";
      try { await navigator.share({ title: `Join ${circle?.name}`, text: `Join our Gift Circle on GiftButler${budgetText}!`, url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url).catch(() => {
        window.prompt("Copy this link:", url);
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading || !isLoaded) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (notFound || !circle) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-[#111111] mb-2">Circle not found</p>
        <Link href="/my-people" className="text-sm text-[#888888] underline">Back to My People</Link>
      </div>
    </main>
  );

  const isExchange = circle.circle_type !== "occasion";
  const isOpen = circle.status === "open";
  const isDrawn = circle.status === "drawn" && isExchange;
  const eventDate = circle.event_date
    ? new Date(circle.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <main className="min-h-screen bg-[#EAEAE0]">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[#888888] hover:text-[#111111] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#111111]">{circle.name}</h1>
              {circle.isOrganizer && (
                <button onClick={openEdit} className="p-1.5 text-[#888888] hover:text-[#111111] transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {isExchange ? (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${isOpen ? "bg-[#C4D4B4] text-[#2D4A1E]" : "bg-[#ECC8AE] text-[#5C3118]"}`}>
                  {isOpen ? "Open" : "Names drawn"}
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#B8CED0] text-[#1A3D42]">
                  Group Occasion
                </span>
              )}
            </div>
            <p className="text-[#888888] text-sm">
              {circle.budget ? `$${circle.budget} budget · ` : ""}{circle.memberCount} {circle.memberCount === 1 ? "member" : "members"}
              {eventDate ? ` · ${eventDate}` : ""}
            </p>
          </div>
        </div>

        {/* Assignment card (after draw) */}
        {isDrawn && assignedTo && (
          <div className="bg-[#ECC8AE] rounded-2xl p-5">
            <p className="text-xs font-bold text-[#5C3118] uppercase tracking-wide mb-3 flex items-center gap-1.5"><Gift className="w-3.5 h-3.5" /> You&apos;re buying for</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                {assignedTo.avatar
                  ? <img src={assignedTo.avatar} alt={assignedTo.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#5C3118] bg-[#F5C49A]">{assignedTo.name[0]?.toUpperCase()}</div>
                }
              </div>
              <div>
                <p className="text-2xl font-bold text-[#111111]">{assignedTo.name}</p>
                {circle.budget ? <p className="text-sm text-[#5C3118]">${circle.budget} budget</p> : null}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={`/for/${assignedTo.username}`}
                className="w-full py-3 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm text-center transition-colors"
              >
                View their wishlist →
              </Link>
              <Link
                href={`/for/${assignedTo.username}?gift=true`}
                className="w-full py-3 bg-white hover:bg-[#F5F5F0] text-[#111111] font-semibold rounded-full text-sm text-center transition-colors"
              >
                Get gift ideas with AI
              </Link>
            </div>
          </div>
        )}

        {isDrawn && !assignedTo && (
          <div className="bg-white rounded-2xl shadow-card p-5 text-center">
            <Gift className="w-10 h-10 text-[#CCCCCC] mx-auto mb-2" />
            <p className="text-[#888888] text-sm">Names have been drawn. Check your email for your assignment.</p>
          </div>
        )}

        {/* Occasion: Celebrating card */}
        {!isExchange && recipient && (
          <div className="bg-[#B8CED0] rounded-2xl p-5">
            <p className="text-xs font-bold text-[#1A3D42] uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Celebrating
            </p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                {recipient.avatar
                  ? <img src={recipient.avatar} alt={recipient.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[#1A3D42] bg-[#8FAFB3]">{recipient.name[0]?.toUpperCase()}</div>
                }
              </div>
              <div>
                <p className="text-2xl font-bold text-[#111111]">{recipient.name}</p>
                <p className="text-sm text-[#1A3D42]">@{recipient.username}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Link
                href={`/for/${recipient.username}`}
                className="w-full py-3 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full text-sm text-center transition-colors"
              >
                View their wishlist →
              </Link>
              <Link
                href={`/for/${recipient.username}?gift=true`}
                className="w-full py-3 bg-white hover:bg-[#F5F5F0] text-[#111111] font-semibold rounded-full text-sm text-center transition-colors"
              >
                Get gift ideas with AI
              </Link>
            </div>
          </div>
        )}

        {!isExchange && !recipient && (
          <div className="bg-[#F5F5F0] rounded-2xl p-5">
            <p className="text-xs font-bold text-[#888888] uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Group Occasion
            </p>
            <p className="text-sm text-[#888888]">Everyone is contributing to a group gift. Coordinate with the organizer on what to get.</p>
          </div>
        )}

        {/* Organizer actions (open) */}
        {isOpen && circle.isOrganizer && (
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
            <p className="text-sm font-bold text-[#111111]">Invite people</p>
            <div className="flex items-center gap-2 bg-[#F5F5F0] rounded-xl px-4 py-3">
              <p className="flex-1 text-sm text-[#555555] truncate font-mono">
                giftbutler.io/join/{circle.invite_code}
              </p>
              <button onClick={shareInviteLink} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] text-white font-semibold rounded-full text-xs flex-shrink-0">
                {copied ? <><Check className="w-3 h-3" /> Copied</> : isMobile ? <><Share2 className="w-3 h-3" /> Share</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>

            {isExchange && (
              <div className="pt-1">
                {drawError && <p className="text-red-500 text-xs mb-2">{drawError}</p>}
                <button
                  onClick={handleDraw}
                  disabled={drawing || circle.memberCount < 2}
                  className="w-full py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] disabled:text-[#888888] text-white font-bold rounded-full text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  {drawing ? "Drawing names..." : circle.memberCount < 2 ? "Need at least 2 members" : "Draw names"}
                </button>
                <p className="text-xs text-[#888888] text-center mt-2">Everyone will be emailed their assignment. This can&apos;t be undone.</p>
              </div>
            )}
          </div>
        )}

        {/* Non-organizer invite link (open) */}
        {isOpen && !circle.isOrganizer && (
          <div className="bg-white rounded-2xl shadow-card p-4">
            <p className="text-sm font-bold text-[#111111] mb-2">Share with others</p>
            <div className="flex items-center gap-2 bg-[#F5F5F0] rounded-xl px-4 py-3">
              <p className="flex-1 text-sm text-[#555555] truncate font-mono">
                giftbutler.io/join/{circle.invite_code}
              </p>
              <button onClick={shareInviteLink} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111111] text-white font-semibold rounded-full text-xs flex-shrink-0">
                {copied ? <><Check className="w-3 h-3" /> Copied</> : isMobile ? <><Share2 className="w-3 h-3" /> Share</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="bg-white rounded-2xl shadow-card p-4">
          <p className="text-sm font-bold text-[#111111] mb-3">Members ({members.length})</p>
          <div className="space-y-2.5">
            {members.map(m => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  {m.avatar
                    ? <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[#2D4A1E] bg-[#C4D4B4]">{m.name[0]?.toUpperCase()}</div>
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#111111]">{m.name}</p>
                  <p className="text-xs text-[#888888]">@{m.username}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave / Delete */}
        <div className="pb-2">
          {confirmLeave ? (
            <div className="flex gap-2">
              <button
                onClick={handleLeaveOrDelete}
                disabled={leaving}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full text-sm transition-colors"
              >
                {leaving ? "..." : circle.isOrganizer ? "Yes, delete circle" : "Yes, leave circle"}
              </button>
              <button onClick={() => setConfirmLeave(false)} className="flex-1 py-3 bg-[#F0F0E8] text-[#111111] font-semibold rounded-full text-sm">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full py-3 bg-white border border-[#E0E0D8] hover:border-red-200 hover:text-red-500 text-[#888888] font-semibold rounded-full text-sm transition-colors"
            >
              {circle.isOrganizer ? "Delete circle" : "Leave circle"}
            </button>
          )}
        </div>
      </div>

      {/* Edit sheet */}
      {editing && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setEditing(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] max-h-[85svh] overflow-y-auto md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-3xl md:max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#111111]">Edit circle</h2>
              <button onClick={() => setEditing(false)} className="p-1.5 text-[#888888] hover:text-[#111111]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">Circle name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">
                  {circle.circle_type === "occasion" ? "Suggested contribution ($)" : "Budget per person ($)"}
                  <span className="text-[#CCCCCC] normal-case font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                  <input
                    type="number"
                    value={editBudget}
                    onChange={e => setEditBudget(e.target.value)}
                    placeholder="0"
                    min={1}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
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
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111] appearance-none"
                  />
                </div>
              </div>

              {circle.circle_type === "occasion" && (
                <div>
                  <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide block mb-1.5">
                    Recipient username <span className="text-[#CCCCCC] normal-case font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                    <input
                      value={editRecipient}
                      onChange={e => setEditRecipient(e.target.value.replace(/^@/, ""))}
                      placeholder="their username"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] text-sm text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#111111]"
                    />
                  </div>
                </div>
              )}

              {saveError && <p className="text-red-500 text-xs">{saveError}</p>}

              <button
                onClick={saveEdit}
                disabled={saving || !editName.trim()}
                className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors"
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
