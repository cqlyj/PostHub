"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
// simple debounce via setTimeout inside useEffect
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

import TopSearchBar from "@/components/TopSearchBar";
import {
  computeSearchRank,
  PostWithCounts,
  userTypeToAgeGroup,
  UserInfo,
} from "@/utils/searchRanking";
import { fetchVerification } from "@/utils/verification";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabaseClient";
import PostCard from "@/components/PostCard";
import { useSenior } from "@/components/SeniorModeProvider";

// On-chain constants not needed for UI-only explore page

const ExplorePage = () => {
  const { isSenior } = useSenior();
  const { user, logout, authenticated } = usePrivy();
  // const [userType, setUserType] = useState<string | null>(null);
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithCounts[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [userInfo, setUserInfo] = useState<UserInfo>({
    nationality: "",
    ageGroup: "adult",
  });

  // Fetch user verification info once
  useEffect(() => {
    const loadVerification = async () => {
      if (user?.wallet?.address) {
        const info = await fetchVerification(user.wallet.address);
        setUserInfo({
          nationality: info.nationality,
          ageGroup: userTypeToAgeGroup(info.userType),
        });
      }
    };
    loadVerification();
  }, [user]);

  const fetchPosts = async (keyword: string) => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("id,title,summary,media_urls,author,age_group")
      .limit(50);

    if (keyword.trim() !== "") {
      // simple ILIKE search on title + summary
      const escaped = keyword.replace(/[%_]/g, "\\$&");
      query = query.or(`title.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
    } else {
      // default order: latest
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (!error && data) {
      // enrich with likes / stars counts
      const enriched = await Promise.all(
        data.map(async (p) => {
          const likeRes = await supabase
            .from("likes")
            .select("id", { head: true, count: "exact" })
            .eq("post_id", p.id);

          const { count: starCnt } = await supabase
            .from("stars")
            .select("id", { head: true, count: "exact" })
            .eq("post_id", p.id);

          return {
            ...p,
            likesCount: likeRes.count ?? 0,
            starsCount: starCnt ?? 0,
          } as PostWithCounts;
        })
      );

      // ranking
      const keywordsArr = keyword.toLowerCase().split(/\s+/).filter(Boolean);
      enriched.sort(
        (a, b) =>
          computeSearchRank(b, keywordsArr, userInfo) -
          computeSearchRank(a, keywordsArr, userInfo)
      );

      setPosts(enriched);
    }
    setLoading(false);
  };

  // initial fetch
  useEffect(() => {
    fetchPosts("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPosts(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

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
      <TopSearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="flex-1 overflow-y-auto p-2">
        {loading && (
          <p className="text-center text-sm text-gray-500 mb-2">Loading...</p>
        )}
        <div
          className={`grid ${isSenior ? "grid-cols-1" : "grid-cols-2"} gap-2`}
        >
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
