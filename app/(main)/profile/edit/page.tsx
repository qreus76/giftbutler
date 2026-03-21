"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, LogOut, Check, AlertTriangle, Share2, Copy } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [usernameLockedUntil, setUsernameLockedUntil] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.profile) {
        setName(data.profile.name || "");
        setBio(data.profile.bio || "");
        setBirthday(data.profile.birthday || "");
        setUsername(data.profile.username || "");
        setCurrentUsername(data.profile.username || "");
        if (data.profile.username_changed_at) {
          const changedAt = new Date(data.profile.username_changed_at);
          const nextAllowed = new Date(changedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (new Date() < nextAllowed) setUsernameLockedUntil(nextAllowed);
        }
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), bio: bio.trim(), birthday: birthday || null, username: username.trim() !== currentUsername ? username.trim() : undefined }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error || "Failed to save — try again"); return; }
    if (data.username) { setCurrentUsername(data.username); setUsername(data.username); }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function shareProfile() {
    if (!currentUsername) return;
    const url = `${window.location.origin}/for/${currentUsername}`;
    if (navigator.share && window.innerWidth < 768) {
      try { await navigator.share({ title: `${name || currentUsername}'s gift profile`, text: "Here's what I actually want — no more guessing!", url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url).catch(() => alert("Unable to copy."));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return (
    <main className="min-h-screen bg-[#EAEAE0] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#EAEAE0]">
      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[#888888] hover:text-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div>
          <h1 className="text-3xl font-bold text-[#111111]">Edit profile</h1>
          <p className="text-[#888888] text-sm mt-0.5">Update your details</p>
        </div>

        {/* Share / copy link */}
        {currentUsername && (
          <button
            onClick={shareProfile}
            className="w-full flex items-center gap-4 bg-[#ECC8AE] rounded-2xl p-4 active:opacity-80 transition-opacity text-left"
          >
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-card">
              {copied ? <Check className="w-5 h-5 text-[#111111]" /> : <Share2 className="w-5 h-5 text-[#111111]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#111111]">{copied ? "Link copied!" : "Share my profile"}</p>
              <p className="text-sm text-[#111111]/60 truncate">giftbutler.io/for/{currentUsername}</p>
            </div>
            <div className="w-8 h-8 bg-[#111111] rounded-full flex items-center justify-center flex-shrink-0">
              <Copy className="w-4 h-4 text-white" />
            </div>
          </button>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          {[
            { label: "Display name", value: name, onChange: setName, placeholder: "Your name", maxLength: 60, type: "text" },
          ].map(field => (
            <div key={field.label} className="bg-white rounded-2xl shadow-card overflow-hidden">
              <div className="px-4 pt-3 pb-0.5">
                <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide">{field.label}</label>
              </div>
              <div className="px-4 pb-4">
                <input
                  type={field.type}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="w-full text-[#111111] text-base focus:outline-none placeholder-[#CCCCCC] mt-1"
                />
              </div>
            </div>
          ))}

          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide">Username</label>
            </div>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[#888888] text-sm">giftbutler.io/for/</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => !usernameLockedUntil && setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  disabled={!!usernameLockedUntil}
                  className="flex-1 text-[#111111] text-base focus:outline-none font-medium disabled:text-[#888888]"
                />
              </div>
              {usernameLockedUntil ? (
                <p className="text-xs text-[#888888] mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  Next change available {usernameLockedUntil.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              ) : username !== currentUsername ? (
                <p className="text-xs text-[#888888] mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  Old links will automatically redirect to your new username.
                </p>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide">Bio <span className="text-[#CCCCCC] normal-case font-normal">(optional)</span></label>
            </div>
            <div className="px-4 pb-4">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A little about you..."
                rows={3}
                maxLength={160}
                className="w-full text-[#111111] text-base focus:outline-none resize-none placeholder-[#CCCCCC] mt-1"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-4 pt-3 pb-0.5">
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wide">Birthday <span className="text-[#CCCCCC] normal-case font-normal">(optional)</span></label>
            </div>
            <div className="px-4 pb-4">
              <input
                type="date"
                value={birthday}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setBirthday(e.target.value)}
                className="w-full text-[#111111] text-base focus:outline-none mt-1"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors text-base"
          >
            {saved ? <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Saved!</span> : saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <button
          onClick={() => signOut(() => router.push("/"))}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-[#E0E0D8] hover:bg-red-50 hover:border-red-200 text-[#888888] hover:text-red-500 font-semibold rounded-full text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </main>
  );
}
