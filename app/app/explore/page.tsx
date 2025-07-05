"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

import TopSearchBar from "@/components/TopSearchBar";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";

// On-chain constants not needed for UI-only explore page

const ExplorePage = () => {
  const { user, logout, authenticated } = usePrivy();
  // const [userType, setUserType] = useState<string | null>(null);
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id,title,summary,media_urls,author")
      .order("created_at", { ascending: false })
      .limit(50);
    if (!error && data) setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    // Detect wallet disconnection and force logout
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0 && authenticated) {
        logout();
      }
    };
    const handleDisconnect = () => {
      if (authenticated) logout();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("disconnect", handleDisconnect);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [authenticated, logout]);

  // Redirect unauthenticated users back to home
  useEffect(() => {
    if (!user) {
      router.push("/");
    }
  }, [user, router]);

  /* userType fetching removed from explore UI to avoid unused var */

  return (
    <div className="flex flex-col min-h-screen bg-[var(--muted-bg)]">
      <TopSearchBar />

      <main className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="text-center text-sm text-gray-500 mb-2">Loading...</p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ExplorePage;
