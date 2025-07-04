"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { supabase } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";
import { useRouter } from "next/navigation";
import { getAvatarSrc } from "@/utils/avatar";
import {
  getDisplayName,
  invalidateDisplayNameCache,
} from "@/utils/displayName";
import { fetchVerification } from "@/utils/verification";
import PoapBadgeForAddress from "@/components/PoapBadgeForAddress";
import { useSenior } from "@/components/SeniorModeProvider";

interface Post {
  id: string;
  title: string | null;
  summary: string | null;
  media_urls: string[] | null;
  author: string | null;
}

const ProfilePage: React.FC = () => {
  const { user, logout } = usePrivy();
  const router = useRouter();
  const walletAddress = user?.wallet?.address ?? "";

  // Pick a deterministic avatar based on address so it persists
  const avatarSrc = useMemo(() => getAvatarSrc(walletAddress), [walletAddress]);

  const [displayName, setDisplayName] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");
  const [verified, setVerified] = useState<boolean>(false);

  // Username / ENS & verification fetch
  useEffect(() => {
    if (!walletAddress) return;
    getDisplayName(walletAddress).then((n) => {
      setDisplayName(n);
      setNameInput(n);
    });
    fetchVerification(walletAddress).then((info) => setVerified(info.verified));
  }, [walletAddress]);

  const [showSavedToast, setShowSavedToast] = useState(false);

  const handleSaveName = async () => {
    if (!walletAddress || !nameInput.trim()) return;
    await supabase.from("usernames").upsert({
      wallet_address: walletAddress.toLowerCase(),
      username: nameInput.trim(),
    });
    invalidateDisplayNameCache(walletAddress);
    setDisplayName(nameInput.trim());
    setShowSavedToast(true);
  };

  // Auto-hide the toast after a few seconds
  useEffect(() => {
    if (!showSavedToast) return;
    const t = setTimeout(() => setShowSavedToast(false), 3000);
    return () => clearTimeout(t);
  }, [showSavedToast]);

  const [tab, setTab] = useState<"posts" | "likes" | "stars" | "update">(
    "posts"
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [starredPosts, setStarredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyPosts = useCallback(async () => {
    if (!walletAddress) return;
    const { data } = await supabase
      .from("posts")
      .select("id,title,summary,media_urls,author")
      .eq("author", walletAddress)
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
  }, [walletAddress]);

  const fetchLikedPosts = useCallback(async () => {
    if (!walletAddress) return;
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_address", walletAddress);
    const ids = (likes ?? []).map((l) => l.post_id);
    if (ids.length === 0) {
      setLikedPosts([]);
      return;
    }
    const { data } = await supabase
      .from("posts")
      .select("id,title,summary,media_urls,author")
      .in("id", ids);
    setLikedPosts(data ?? []);
  }, [walletAddress]);

  const fetchStarredPosts = useCallback(async () => {
    if (!walletAddress) return;
    const { data: stars } = await supabase
      .from("stars")
      .select("post_id")
      .eq("user_address", walletAddress);
    const ids = (stars ?? []).map((s) => s.post_id);
    if (ids.length === 0) {
      setStarredPosts([]);
      return;
    }
    const { data } = await supabase
      .from("posts")
      .select("id,title,summary,media_urls,author")
      .in("id", ids);
    setStarredPosts(data ?? []);
  }, [walletAddress]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMyPosts(), fetchLikedPosts(), fetchStarredPosts()]).then(
      () => setLoading(false)
    );
  }, [fetchMyPosts, fetchLikedPosts, fetchStarredPosts]);

  const tabButton = (key: typeof tab, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`flex-1 py-2 text-sm font-medium border-b-2 ${
        tab === key
          ? "border-[var(--primary)] text-[var(--primary)]"
          : "border-transparent text-gray-500"
      }`}
    >
      {label}
    </button>
  );

  // verified state already set

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      // Force redirect regardless of logout timing
      router.push("/");
    }
  }, [logout, router]);

  const { isSenior } = useSenior();

  return (
    <div className="flex flex-col min-h-screen bg-[var(--muted-bg)]">
      {/* Header */}
      <header className="bg-white shadow p-6 flex flex-col items-center gap-2 relative">
        <img
          src={avatarSrc}
          alt="avatar"
          className="w-24 h-24 rounded-full object-cover"
        />
        <p className="text-lg font-semibold text-[var(--primary)] truncate max-w-xs">
          {displayName || "Anonymous"}
        </p>
        <PoapBadgeForAddress address={walletAddress} size={24} />
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            verified ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          }`}
        >
          {verified ? "Verified" : "Unverified"}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs text-red-500 underline mt-2 hover:opacity-80"
        >
          Log out
        </button>
      </header>

      {/* Tabs */}
      <nav className="flex bg-white shadow-sm sticky top-0 z-10">
        {/*should stay under header*/}
        {tabButton("posts", "My Posts")}
        {tabButton("likes", "My Likes")}
        {tabButton("stars", "My Stars")}
        {tabButton("update", "Update Info")}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {loading && (
          <p className="text-center text-sm text-gray-500">Loading...</p>
        )}
        {!loading && tab === "posts" && (
          <div
            className={`grid ${isSenior ? "grid-cols-1" : "grid-cols-2"} gap-2`}
          >
            {posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {posts.length === 0 && (
              <p className="text-sm text-gray-400 col-span-2">No posts yet.</p>
            )}
          </div>
        )}
        {!loading && tab === "likes" && (
          <div
            className={`grid ${isSenior ? "grid-cols-1" : "grid-cols-2"} gap-2`}
          >
            {likedPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {likedPosts.length === 0 && (
              <p className="text-sm text-gray-400 col-span-2">
                No liked posts yet.
              </p>
            )}
          </div>
        )}
        {!loading && tab === "stars" && (
          <div
            className={`grid ${isSenior ? "grid-cols-1" : "grid-cols-2"} gap-2`}
          >
            {starredPosts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
            {starredPosts.length === 0 && (
              <p className="text-sm text-gray-400 col-span-2">
                No starred posts yet.
              </p>
            )}
          </div>
        )}
        {tab === "update" && (
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Username editor */}
            <div className="bg-white rounded-lg shadow p-4 w-full max-w-sm flex flex-col gap-2">
              <label htmlFor="username" className="text-sm font-medium">
                Display Name
              </label>
              <input
                id="username"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="border rounded px-3 py-1 focus:outline-none"
                placeholder="Enter your preferred name"
              />
              <button
                onClick={handleSaveName}
                className="bg-[var(--primary)] text-white px-4 py-1 rounded self-end disabled:opacity-50"
                disabled={!nameInput.trim()}
              >
                Save
              </button>
            </div>

            {/* Verification section */}
            {verified ? (
              <p className="text-sm text-gray-600 text-center max-w-xs">
                You’re already verified! If you’d like to review or update your
                info, you can do so anytime below.
              </p>
            ) : (
              <p className="text-sm text-gray-600 text-center max-w-xs">
                Verify your account to unlock the full PostHub experience
                (age-appropriate content, gifting, and more).
              </p>
            )}
            <button
              onClick={() => router.push("/customize")}
              className="bg-[var(--primary)] text-white px-6 py-2 rounded-full shadow hover:opacity-90"
            >
              {verified ? "Update Info" : "Verify Now"}
            </button>
          </div>
        )}
      </main>

      {/* mobile-style toast */}
      {showSavedToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fadeInOut">
          Name updated!
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
