"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Copy, Check, Search, Users, Cake, ArrowRight } from "lucide-react";

const LABELS = ["Husband","Wife","Partner","Dad","Mom","Son","Daughter","Brother","Sister","Grandfather","Grandmother","Grandson","Granddaughter","Uncle","Aunt","Nephew","Niece","Cousin","Best Friend","Friend","Colleague","Other"];

interface SearchResult {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  followStatus: "none" | "pending" | "accepted";
}

const QUIZ_STEPS = [
  {
    id: "selfbuy",
    question: "What's one thing you've been putting off buying for yourself?",
    options: [
      { label: "New gear for a hobby I keep neglecting", value: "I've been putting off buying new gear for a hobby I love but don't invest in enough" },
      { label: "An upgrade for something I use every day", value: "I'd love to upgrade something I use every day but can't justify splurging on" },
      { label: "Something for my home or workspace", value: "I've been meaning to improve my home or workspace but keep putting it off" },
      { label: "An experience I keep saying I'll treat myself to", value: "I keep saying I'll treat myself to a special experience or outing but never actually do it" },
    ],
  },
  {
    id: "unwind",
    question: "How do you like to unwind?",
    options: [
      { label: "Reading, podcasts, or learning something new", value: "I love unwinding with books, podcasts, and learning — I'm always curious about something" },
      { label: "Getting outside — walks, hikes, fresh air", value: "Getting outside for walks, hikes, or any kind of fresh air is how I recharge" },
      { label: "Cooking, baking, or exploring new food", value: "I love unwinding by cooking, baking, or discovering new food and drink experiences" },
      { label: "Films, gaming, or anything immersive", value: "I unwind with films, gaming, or anything immersive and entertaining" },
    ],
  },
  {
    id: "perfect",
    question: "What makes a gift feel perfect to you?",
    options: [
      { label: "It connects to a hobby or passion of mine", value: "The best gifts connect to one of my hobbies or passions — it shows someone truly paid attention" },
      { label: "It makes my daily life easier or better", value: "I love practical gifts that genuinely improve my everyday life" },
      { label: "It's something I'd never buy myself", value: "The best gifts are things I'd never splurge on myself but secretly really want" },
      { label: "It's a shared experience — not just a thing", value: "I value experiences over things — the best gift is something we can enjoy together" },
    ],
  },
];

export default function OnboardingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [birthdayDone, setBirthdayDone] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState("");
  const [savingBirthday, setSavingBirthday] = useState(false);
  const [findingPeople, setFindingPeople] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedMsgIndex, setCopiedMsgIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchNotFound, setSearchNotFound] = useState(false);
  const [searchIsSelf, setSearchIsSelf] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isQuiz = step < QUIZ_STEPS.length;
  const currentQuiz = QUIZ_STEPS[step];
  const [customAnswer, setCustomAnswer] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://giftbutler.io"}/for/${username}`;

  function handleAnswer(value: string) {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);
    setShowCustom(false);
    setCustomAnswer("");
    if (step < QUIZ_STEPS.length - 1) setStep(step + 1);
    else setStep(QUIZ_STEPS.length);
  }

  function handleCustomSubmit() {
    if (!customAnswer.trim()) return;
    handleAnswer(customAnswer.trim());
  }

  async function handleFinish() {
    if (!username.trim() || !user) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim().toLowerCase(), answers }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

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

  async function sendFollowRequest(searchUsername: string) {
    if (!selectedLabel) return;
    setSendingRequest(true);
    await fetch("/api/follows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: searchUsername, label: selectedLabel }) });
    setSentRequests(prev => [...prev, searchUsername]);
    setSearchResult(null);
    setSearchQuery("");
    setSelectedLabel("");
    setSendingRequest(false);
  }

  async function copyLink() {
    if (navigator.share && window.innerWidth < 768) {
      try { await navigator.share({ title: "My GiftButler profile", text: "Here's what I actually want — no more guessing!", url: profileUrl }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(profileUrl).catch(() => alert("Unable to copy."));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function saveBirthday() {
    setSavingBirthday(true);
    if (birthdayInput) await fetch("/api/profile/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ birthday: birthdayInput }) });
    setSavingBirthday(false);
    setBirthdayDone(true);
  }

  if (done && findingPeople) {
    return (
      <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Users className="w-12 h-12 text-[#CCCCCC] mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-[#111111] mb-1">Find your people</h2>
            <p className="text-[#888888] text-sm">Search by username to send a connection request.</p>
          </div>
          {sentRequests.length > 0 && (
            <div className="bg-[#C4D4B4] rounded-2xl px-4 py-3 mb-3">
              <p className="text-[#111111] text-sm font-semibold">✓ {sentRequests.length} request{sentRequests.length > 1 ? "s" : ""} sent</p>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-card p-4 mb-3">
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
              <input value={searchQuery} onChange={e => handleSearchInput(e.target.value)} placeholder="Enter their username..." autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#F5F5F0] border-0 text-sm text-[#111111] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#111111]" />
            </div>
            {searching && <p className="text-xs text-[#888888]">Searching...</p>}
            {searchNotFound && !searching && <p className="text-xs text-[#888888]">No profile found with that username.</p>}
            {searchIsSelf && !searching && <p className="text-xs text-[#888888]">That&apos;s you! Search for someone else.</p>}
            {searchResult && !searching && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
                    {searchResult.avatar ? <img src={searchResult.avatar} alt={searchResult.name} className="w-full h-full object-cover" /> : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white bg-[#111111]">{searchResult.name[0]?.toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111] text-sm">{searchResult.name}</p>
                    <p className="text-xs text-[#888888]">@{searchResult.username}</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-[#888888] mb-2">Who are they to you?</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {LABELS.map(l => (
                    <button key={l} onClick={() => setSelectedLabel(l)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${selectedLabel === l ? "bg-[#111111] border-[#111111] text-white" : "bg-white border-[#E0E0D8] text-[#111111] hover:border-[#111111]"}`}>
                      {l}
                    </button>
                  ))}
                </div>
                <button onClick={() => sendFollowRequest(searchResult.username)} disabled={!selectedLabel || sendingRequest}
                  className="w-full py-3 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full text-sm transition-colors">
                  {sendingRequest ? "Sending..." : "Send request"}
                </button>
              </div>
            )}
          </div>
          <button onClick={() => router.push(`/for/${username}`)} className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2">
            Go to my profile <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    );
  }

  if (done && !birthdayDone) {
    return (
      <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-[#ECC8AE] rounded-full flex items-center justify-center mx-auto mb-4">
            <Cake className="w-8 h-8 text-[#111111]" />
          </div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">When&apos;s your birthday?</h2>
          <p className="text-[#888888] text-sm mb-8">We&apos;ll remind you to share your profile before your birthday.</p>
          <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
            <input type="date" value={birthdayInput} max={new Date().toISOString().split("T")[0]} onChange={e => setBirthdayInput(e.target.value)}
              className="w-full text-[#111111] text-base focus:outline-none" />
          </div>
          <button onClick={saveBirthday} disabled={savingBirthday || !birthdayInput}
            className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors mb-3">
            {savingBirthday ? "Saving..." : "Save my birthday →"}
          </button>
          <button onClick={() => setBirthdayDone(true)} className="text-sm text-[#888888] hover:text-[#111111] underline">Skip for now</button>
        </div>
      </main>
    );
  }

  if (done) {
    const shareMessages = [
      `My birthday is coming up — here's what I actually want: ${profileUrl}`,
      `Tired of getting asked "what do you want?" — here's my answer: ${profileUrl}`,
    ];
    return (
      <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-5">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-[#111111] mb-2">Your profile is live!</h2>
          <p className="text-[#888888] text-sm mb-2">Share your link — that&apos;s when the magic happens.</p>
          <p className="text-xs text-[#888888] mb-6">We added a few hints from your answers. Edit them anytime.</p>
          <div className="bg-white rounded-2xl shadow-card p-4 mb-3 flex items-center justify-between gap-3">
            <p className="text-[#111111] font-medium text-sm truncate">giftbutler.io/for/{username}</p>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-4 py-2 bg-[#111111] hover:bg-[#333333] text-white font-semibold rounded-full text-xs flex-shrink-0">
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
            </button>
          </div>
          <div className="flex flex-col gap-2 mb-5">
            {shareMessages.map((msg, i) => (
              <button key={i}
                onClick={() => { navigator.clipboard.writeText(msg).catch(() => alert("Unable to copy.")); setCopiedMsgIndex(i); setTimeout(() => setCopiedMsgIndex(null), 2000); }}
                className="text-left bg-white rounded-2xl shadow-card px-4 py-3 hover:bg-[#F5F5F0] transition-colors">
                <p className="text-[#888888] text-xs leading-relaxed">{msg}</p>
                <p className="text-[#111111] text-xs font-semibold mt-1.5">{copiedMsgIndex === i ? "✓ Copied!" : "Copy this message →"}</p>
              </button>
            ))}
          </div>
          <button onClick={() => setFindingPeople(true)} className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] text-white font-bold rounded-full transition-colors mb-3 flex items-center justify-center gap-2">
            Find my people <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => router.push(`/for/${username}`)} className="text-sm text-[#888888] hover:text-[#111111] underline">
            Skip — go to my profile
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex gap-1.5 mb-10">
          {[...QUIZ_STEPS, { id: "username" }].map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-[#111111]" : "bg-[#CCCCCC]"}`} />
          ))}
        </div>

        {isQuiz ? (
          <div>
            <p className="text-xs font-bold text-[#888888] uppercase tracking-wide mb-3">{step + 1} of {QUIZ_STEPS.length}</p>
            <h2 className="text-2xl font-bold text-[#111111] mb-6 leading-snug">{currentQuiz.question}</h2>
            <div className="flex flex-col gap-2.5">
              {currentQuiz.options.map(opt => (
                <button key={opt.value} onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left px-5 py-4 bg-white rounded-2xl shadow-card hover:bg-[#F0F0E8] text-[#111111] font-medium text-sm transition-all active:scale-[0.98] duration-100">
                  {opt.label}
                </button>
              ))}
              {!showCustom ? (
                <button onClick={() => setShowCustom(true)}
                  className="w-full text-left px-5 py-4 bg-white rounded-2xl border-2 border-dashed border-[#CCCCCC] hover:border-[#111111] text-[#888888] font-medium text-sm transition-all duration-100">
                  Something else — type your own
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input autoFocus type="text" value={customAnswer} onChange={e => setCustomAnswer(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCustomSubmit()}
                    placeholder="Type your answer..."
                    className="w-full px-5 py-4 bg-white rounded-2xl border-2 border-[#111111] text-[#111111] font-medium text-sm focus:outline-none shadow-card" />
                  <div className="flex gap-2">
                    <button onClick={handleCustomSubmit} disabled={!customAnswer.trim()}
                      className="flex-1 py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors">
                      Continue →
                    </button>
                    <button onClick={() => { setShowCustom(false); setCustomAnswer(""); }}
                      className="px-5 py-3.5 bg-white text-[#111111] font-semibold rounded-full shadow-card transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-[#888888] uppercase tracking-wide mb-3">Almost done</p>
            <h2 className="text-2xl font-bold text-[#111111] mb-2">Choose your username</h2>
            <p className="text-[#888888] text-sm mb-5">Your profile will live at <span className="text-[#111111] font-semibold">giftbutler.io/for/[username]</span></p>
            <div className="flex items-center gap-2 bg-white rounded-2xl shadow-card px-5 py-4 mb-3">
              <span className="text-[#888888] text-sm">giftbutler.io/for/</span>
              <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="yourname" autoFocus
                className="flex-1 text-[#111111] font-semibold text-sm focus:outline-none" />
            </div>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button onClick={handleFinish} disabled={!username.trim() || saving}
              className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2">
              {saving ? "Setting up your profile..." : <><span>Create my profile</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
