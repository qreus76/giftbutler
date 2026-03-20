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
    fetch("/api/me")
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setName(data.profile.name || "");
          setBio(data.profile.bio || "");
          setBirthday(data.profile.birthday || "");
          setUsername(data.profile.username || "");
          setCurrentUsername(data.profile.username || "");
        }
      })
      .catch(() => { /* silent fail */ })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/profile/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        bio: bio.trim(),
        birthday: birthday || null,
        username: username.trim() !== currentUsername ? username.trim() : undefined,
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to save — try again");
      return;
    }

    if (data.username) {
      setCurrentUsername(data.username);
      setUsername(data.username);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return (
    <main className="min-h-screen bg-[#FAF4EC] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#C08A3C] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  return (
    <main className="min-h-screen bg-[#FAF4EC]">
      <div className="max-w-xl mx-auto px-4 py-8">
        <button
          onClick={() => router.push(currentUsername ? `/for/${currentUsername}` : "/activity")}
          className="flex items-center gap-2 text-[#7A6A5E] hover:text-[#1A1410] mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to profile</span>
        </button>

        <h1 className="text-2xl font-display text-[#1A1410] mb-6">Edit profile</h1>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-card p-4">
            <label className="text-xs font-semibold text-[#7A6A5E] mb-2 block">Display name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              className="w-full text-[#1A1410] text-sm focus:outline-none placeholder-[#7A6A5E]"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <label className="text-xs font-semibold text-[#7A6A5E] mb-2 block">Username</label>
            <div className="flex items-center gap-1">
              <span className="text-[#7A6A5E] text-sm">giftbutler.io/for/</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="flex-1 text-[#1A1410] text-sm focus:outline-none font-medium"
              />
            </div>
            {username !== currentUsername && (
              <p className="text-xs text-[#C08A3C] mt-2">⚠ Your old link will stop working — share your new link after saving.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <label className="text-xs font-semibold text-[#7A6A5E] mb-2 block">
              Bio <span className="text-[#E5D9CC] font-normal">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A little about you..."
              rows={3}
              maxLength={160}
              className="w-full text-[#1A1410] text-sm focus:outline-none resize-none placeholder-[#7A6A5E]"
            />
          </div>

          <div className="bg-white rounded-2xl shadow-card p-4">
            <label className="text-xs font-semibold text-[#7A6A5E] mb-2 block">
              Birthday <span className="text-[#E5D9CC] font-normal">(optional — helps people know when to shop)</span>
            </label>
            <input
              type="date"
              value={birthday}
              max={new Date().toISOString().split("T")[0]}
              onChange={e => setBirthday(e.target.value)}
              className="w-full text-[#1A1410] text-sm focus:outline-none focus:ring-2 focus:ring-[#6B2437] rounded-lg px-1"
            />
          </div>

          {error && (
            <p className="text-[#922B21] text-sm px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#C08A3C] hover:bg-[#A87A32] disabled:bg-[#E5D9CC] disabled:text-[#7A6A5E] text-white font-bold rounded-2xl transition-colors"
          >
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <button
          onClick={() => signOut(() => router.push("/"))}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 border-2 border-[#E5D9CC] text-[#7A6A5E] hover:text-[#922B21] hover:border-red-200 font-semibold rounded-2xl text-sm transition-colors active:scale-[0.98] duration-100"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </main>
  );
}
