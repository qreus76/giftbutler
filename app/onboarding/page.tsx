"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Copy, Check, Search, Users, Cake } from "lucide-react";

const LABELS = ["Husband", "Wife", "Partner", "Dad", "Mom", "Son", "Daughter", "Brother", "Sister", "Grandfather", "Grandmother", "Grandson", "Granddaughter", "Uncle", "Aunt", "Nephew", "Niece", "Cousin", "Best Friend", "Friend", "Colleague", "Other"];

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

  // Find people state
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
    if (step < QUIZ_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(QUIZ_STEPS.length);
    }
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
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim().toLowerCase(), answers }),
      });
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
    await fetch("/api/follows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: searchUsername, label: selectedLabel }),
    });
    setSentRequests(prev => [...prev, searchUsername]);
    setSearchResult(null);
    setSearchQuery("");
    setSelectedLabel("");
    setSendingRequest(false);
  }

  async function copyLink() {
    const isMobile = window.innerWidth < 768;
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: "My GiftButler profile",
          text: "Here's what I actually want — no more guessing!",
          url: profileUrl,
        });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(profileUrl).catch(() => {
        alert("Unable to copy — please copy manually.");
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function saveBirthday() {
    setSavingBirthday(true);
    if (birthdayInput) {
      await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthday: birthdayInput }),
      });
    }
    setSavingBirthday(false);
    setBirthdayDone(true);
  }

  // Find your people screen
  if (done && findingPeople) {
    return (
      <main className="min-h-screen bg-[#fef9ef] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Users className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h2 className="text-2xl font-display text-stone-900 mb-1">Find your people</h2>
            <p className="text-stone-400 text-sm">Search by username to send a connection request.</p>
          </div>

          {sentRequests.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-4">
              <p className="text-green-700 text-sm font-semibold">✓ {sentRequests.length} request{sentRequests.length > 1 ? "s" : ""} sent</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                value={searchQuery}
                onChange={e => handleSearchInput(e.target.value)}
                placeholder="Enter their username..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                autoFocus
              />
            </div>

            {searching && <p className="text-xs text-stone-400">Searching...</p>}

            {searchNotFound && !searching && (
              <p className="text-xs text-stone-400">No profile found with that username.</p>
            )}
            {searchIsSelf && !searching && (
              <p className="text-xs text-stone-400">That's you! Search for someone else.</p>
            )}

            {searchResult && !searching && (
              <div>
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
              </div>
            )}
          </div>

          <button
            onClick={() => router.push(`/for/${username}`)}
            className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl transition-colors"
          >
            Go to my profile →
          </button>
        </div>
      </main>
    );
  }

  // Birthday step
  if (done && !birthdayDone) {
    return (
      <main className="min-h-screen bg-[#fef9ef] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Cake className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-display text-stone-900 mb-2">When&apos;s your birthday?</h2>
          <p className="text-stone-400 text-sm mb-8">
            We&apos;ll remind you to share your profile before your birthday — so the people who matter know exactly what to get you.
          </p>
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
            <input
              type="date"
              value={birthdayInput}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => setBirthdayInput(e.target.value)}
              className="w-full text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg px-1 py-1"
            />
          </div>
          <button
            onClick={saveBirthday}
            disabled={savingBirthday || !birthdayInput}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-2xl transition-colors mb-3"
          >
            {savingBirthday ? "Saving..." : "Save my birthday →"}
          </button>
          <button
            onClick={() => setBirthdayDone(true)}
            className="text-xs text-stone-400 hover:text-stone-600 underline"
          >
            Skip for now
          </button>
        </div>
      </main>
    );
  }

  // Profile live! share screen
  if (done) {
    const shareMessages = [
      `My birthday is coming up — here's what I actually want: ${profileUrl}`,
      `Tired of getting asked "what do you want?" — here's my answer: ${profileUrl}`,
    ];

    return (
      <main className="min-h-screen bg-[#fef9ef] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-display text-stone-900 mb-2">Your profile is live!</h2>
          <p className="text-stone-400 text-sm mb-2">Share your link — that&apos;s when the magic happens.</p>
          <p className="text-xs text-stone-400 mb-8">We added a few hints from your answers. You can edit or replace them from your profile anytime.</p>

          {/* Link copy box */}
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex items-center justify-between gap-3">
            <p className="text-stone-700 font-medium text-sm truncate">giftbutler.io/for/{username}</p>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-stone-900 font-semibold rounded-xl text-xs transition-colors flex-shrink-0"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
            </button>
          </div>

          {/* Pre-written messages */}
          <div className="flex flex-col gap-2 mb-6">
            {shareMessages.map((msg, i) => (
              <button
                key={i}
                onClick={() => { navigator.clipboard.writeText(msg).catch(() => { alert("Unable to copy — please copy manually."); }); setCopiedMsgIndex(i); setTimeout(() => setCopiedMsgIndex(null), 2000); }}
                className="text-left bg-white border border-stone-200 rounded-xl px-4 py-3 hover:border-amber-300 transition-colors group"
              >
                <p className="text-stone-600 text-xs leading-relaxed">{msg}</p>
                <p className="text-amber-600 text-xs font-semibold mt-1.5 group-hover:text-amber-700">{copiedMsgIndex === i ? "✓ Copied!" : "Copy this message →"}</p>
              </button>
            ))}
          </div>

          <button
            onClick={() => setFindingPeople(true)}
            className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl transition-colors mb-3"
          >
            Find my people →
          </button>
          <button
            onClick={() => router.push(`/for/${username}`)}
            className="text-xs text-stone-400 hover:text-stone-600 underline"
          >
            Skip — go to my profile
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fef9ef] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {[...QUIZ_STEPS, { id: "username" }].map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-amber-400" : "bg-stone-200"}`} />
          ))}
        </div>

        {isQuiz ? (
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Quick question {step + 1} of {QUIZ_STEPS.length}</p>
            <h2 className="text-2xl font-display text-stone-900 mb-6">{currentQuiz.question}</h2>
            <div className="flex flex-col gap-3">
              {currentQuiz.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="w-full text-left px-5 py-4 bg-white border-2 border-stone-200 hover:border-amber-400 hover:bg-[#FFF3CC] rounded-2xl text-stone-700 font-medium transition-all active:scale-[0.98] active:border-amber-400 active:bg-[#FFF3CC] duration-100"
                >
                  {opt.label}
                </button>
              ))}

              {!showCustom ? (
                <button
                  onClick={() => setShowCustom(true)}
                  className="w-full text-left px-5 py-4 bg-white border-2 border-dotted border-stone-300 hover:border-amber-400 hover:bg-[#FFF3CC] rounded-2xl text-stone-400 font-medium transition-all active:scale-[0.98] duration-100"
                >
                  Something else — type your own
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                    placeholder="Type your answer..."
                    className="w-full px-5 py-4 bg-white border-2 border-amber-400 rounded-2xl text-stone-700 font-medium focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCustomSubmit}
                      disabled={!customAnswer.trim()}
                      className="flex-1 py-3 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-semibold rounded-xl transition-colors"
                    >
                      Continue →
                    </button>
                    <button
                      onClick={() => { setShowCustom(false); setCustomAnswer(""); }}
                      className="px-4 py-3 border border-stone-200 text-stone-400 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Almost done</p>
            <h2 className="text-2xl font-display text-stone-900 mb-2">Choose your username</h2>
            <p className="text-stone-400 text-sm mb-6">Your profile will live at <span className="text-stone-700 font-medium">giftbutler.io/for/[username]</span></p>
            <div className="flex items-center gap-2 bg-white border-2 border-stone-200 rounded-2xl px-4 py-3 mb-3 focus-within:border-amber-400 transition-colors">
              <span className="text-stone-400 text-sm">giftbutler.io/for/</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder="yourname"
                className="flex-1 text-stone-900 font-medium text-sm focus:outline-none"
                autoFocus
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              onClick={handleFinish}
              disabled={!username.trim() || saving}
              className="w-full py-4 bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 font-bold rounded-2xl transition-colors"
            >
              {saving ? "Setting up your profile..." : "Create my profile →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
