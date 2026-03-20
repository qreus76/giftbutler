"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { ArrowLeft, LogOut } from "lucide-react";

export default function EditProfilePage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [username, setUsername] = useState("");
  const [currentUsername, setCurrentUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/me").then(r => r.json()).then(data => {
      if (data.profile) {
        setName(data.profile.name || "");
        setBio(data.profile.bio || "");
        setBirthday(data.profile.birthday || "");
        setUsername(data.profile.username || "");
        setCurrentUsername(data.profile.username || "");
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

  if (loading) return (
    <main className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#F0F2F5]">
      <div className="max-w-xl mx-auto px-3 py-4 space-y-3">
        <button
          onClick={() => router.push(currentUsername ? `/for/${currentUsername}` : "/activity")}
          className="flex items-center gap-2 text-[#65676B] hover:text-[#1C1E21] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to profile</span>
        </button>

        <h1 className="text-2xl font-bold text-[#1C1E21] px-1">Edit profile</h1>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E6EB]">
              <label className="text-xs font-semibold text-[#65676B] uppercase tracking-wide">Display name</label>
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
                className="w-full text-[#1C1E21] text-sm focus:outline-none placeholder-[#BCC0C4]"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E6EB]">
              <label className="text-xs font-semibold text-[#65676B] uppercase tracking-wide">Username</label>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="text-[#65676B] text-sm">giftbutler.io/for/</span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="flex-1 text-[#1C1E21] text-sm focus:outline-none font-medium"
                />
              </div>
              {username !== currentUsername && (
                <p className="text-xs text-amber-600 mt-1.5">⚠ Your old link will stop working after saving.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E6EB]">
              <label className="text-xs font-semibold text-[#65676B] uppercase tracking-wide">Bio <span className="text-[#BCC0C4] normal-case font-normal">(optional)</span></label>
            </div>
            <div className="px-4 py-3">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="A little about you..."
                rows={3}
                maxLength={160}
                className="w-full text-[#1C1E21] text-sm focus:outline-none resize-none placeholder-[#BCC0C4]"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-card border border-[#E4E6EB] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E4E6EB]">
              <label className="text-xs font-semibold text-[#65676B] uppercase tracking-wide">Birthday <span className="text-[#BCC0C4] normal-case font-normal">(optional)</span></label>
            </div>
            <div className="px-4 py-3">
              <input
                type="date"
                value={birthday}
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setBirthday(e.target.value)}
                className="w-full text-[#1C1E21] text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-lg px-1"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#F59E0B] hover:bg-[#D97706] disabled:bg-[#E4E6EB] disabled:text-[#BCC0C4] text-white font-bold rounded-xl transition-colors"
          >
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <button
          onClick={() => signOut(() => router.push("/"))}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-[#E4E6EB] hover:bg-red-50 hover:border-red-200 text-[#65676B] hover:text-red-500 font-semibold rounded-xl text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </main>
  );
}
