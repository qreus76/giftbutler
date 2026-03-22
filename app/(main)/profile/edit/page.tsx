"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, LogOut, Check, AlertTriangle, Lock, Globe } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [usernameLockedUntil, setUsernameLockedUntil] = useState<Date | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.profile) {
        setName(data.profile.name || "");
        setBio(data.profile.bio || "");
        setBirthday(data.profile.birthday || "");
        setUsername(data.profile.username || "");
        setCurrentUsername(data.profile.username || "");
        setIsPrivate(data.profile.is_private || false);
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
    setUsernameError("");
    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), bio: bio.trim(), birthday: birthday || null, username: username.trim() !== currentUsername ? username.trim() : undefined, is_private: isPrivate }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      const msg = data.error || "Failed to save — try again";
      if (msg.toLowerCase().includes("username")) {
        setUsernameError(msg);
      } else {
        setError(msg);
      }
      return;
    }
    if (data.username) { setCurrentUsername(data.username); setUsername(data.username); }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
                  onChange={e => { setUsernameError(""); !usernameLockedUntil && setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); }}
                  disabled={!!usernameLockedUntil}
                  className="flex-1 text-[#111111] text-base focus:outline-none font-medium disabled:text-[#888888]"
                />
              </div>
              {usernameError ? (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {usernameError}
                </p>
              ) : usernameLockedUntil ? (
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
              {bio.length > 0 && (
                <p className={`text-xs text-right mt-1 ${bio.length >= 140 ? "text-red-500" : "text-[#CCCCCC]"}`}>
                  {160 - bio.length}
                </p>
              )}
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
              <p className="text-xs text-[#AAAAAA] mt-1.5">Shows on your profile so people can find the perfect birthday gift.</p>
            </div>
          </div>

          {/* Privacy toggle */}
          <div className="bg-white rounded-2xl shadow-card p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {isPrivate ? <Lock className="w-5 h-5 text-[#111111] flex-shrink-0" /> : <Globe className="w-5 h-5 text-[#888888] flex-shrink-0" />}
              <div>
                <p className="text-sm font-semibold text-[#111111]">{isPrivate ? "Private profile" : "Public profile"}</p>
                <p className="text-xs text-[#888888] mt-0.5">{isPrivate ? "Only your connections can see your wishlist" : "Anyone with your link can see your wishlist"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrivate(p => !p)}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isPrivate ? "bg-[#111111]" : "bg-[#CCCCCC]"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPrivate ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 bg-[#111111] hover:bg-[#333333] disabled:bg-[#CCCCCC] text-white font-bold rounded-full transition-colors text-base mt-4"
          >
            {saved ? <span className="flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Saved!</span> : saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <div className="border-t border-[#E8E8E0] pt-5">
          {confirmSignOut ? (
            <div className="space-y-2">
              <p className="text-sm text-center text-[#888888]">Are you sure you want to sign out?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => signOut(() => router.push("/"))}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full text-sm transition-colors"
                >
                  Yes, sign out
                </button>
                <button
                  onClick={() => setConfirmSignOut(false)}
                  className="flex-1 py-3 bg-white border border-[#E0E0D8] text-[#111111] font-semibold rounded-full text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmSignOut(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-[#E0E0D8] hover:bg-red-50 hover:border-red-200 text-[#888888] hover:text-red-500 font-semibold rounded-full text-sm transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
