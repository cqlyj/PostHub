"use client";
import React, { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import { supabase } from "@/lib/supabaseClient";

// Utility to read/write reward history from localStorage
const LS_KEY = "rewardHistory";

function loadHistoryLS(): RewardRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RewardRecord[];
  } catch {
    return [];
  }
}

function saveHistoryLS(records: RewardRecord[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(records));
  } catch {}
}

interface PostInfo {
  id: string;
  title: string | null;
  summary: string | null;
  media_urls: string[] | null;
  author: string | null;
}

interface PostRank {
  post: PostInfo;
  score: number;
}

interface RewardRecord {
  id: string;
  recipient: string;
  tx_hash: string | null;
  status: string; // "pending" | "success" | "failed"
  created_at: string;
}

const RewardsPage: React.FC = () => {
  const [posts, setPosts] = useState<PostRank[]>([]); // already sorted by rank
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [vrfProof, setVrfProof] = useState<string | null>(null); // raw VRF value for display
  // We only need the setter functions to trigger re-renders when status/hash change
  const [, setTxHash] = useState<string | null>(null);
  const [, setTxStatus] = useState<string | null>(null);

  const [history, setHistory] = useState<RewardRecord[]>([]);

  // Fetch top posts from the last 7 days
  useEffect(() => {
    async function fetchTop() {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // Fetch likes & stars within last week
        const [{ data: likes }, { data: stars }] = await Promise.all([
          supabase
            .from("likes")
            .select("post_id")
            .gte("created_at", oneWeekAgo.toISOString()),
          supabase
            .from("stars")
            .select("post_id")
            .gte("created_at", oneWeekAgo.toISOString()),
        ]);

        if (!likes && !stars) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // Aggregate scores
        const scoreMap = new Map<string, number>();
        for (const row of likes || []) {
          scoreMap.set(row.post_id, (scoreMap.get(row.post_id) || 0) + 1);
        }
        for (const row of stars || []) {
          scoreMap.set(row.post_id, (scoreMap.get(row.post_id) || 0) + 1);
        }

        // Sort post ids by score desc
        const rankedIds = Array.from(scoreMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id);

        if (rankedIds.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // Fetch post records for top ids
        const { data: postRows } = await supabase
          .from("posts")
          .select("id,title,summary,media_urls,author")
          .in("id", rankedIds);

        const postMap = new Map<string, PostInfo>();
        (postRows || []).forEach((p) => postMap.set(p.id, p as PostInfo));

        const ranked: PostRank[] = rankedIds
          .filter((id) => postMap.has(id))
          .map((id) => ({ post: postMap.get(id)!, score: scoreMap.get(id)! }));

        setPosts(ranked);
      } catch (err) {
        console.error("Failed to fetch top posts", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTop();
  }, []);

  // Load reward history from localStorage on mount
  useEffect(() => {
    setHistory(loadHistoryLS());
  }, []);

  const roll = async () => {
    if (isRolling || loading || posts.length === 0) return;
    setIsRolling(true);

    // Shake animation
    const duration = 1500;
    const steps = 20;
    let current = 1;
    const interval = duration / steps;
    const tempTimer = setInterval(() => {
      current = (current % 5) + 1;
      setSelected(current);
    }, interval);

    try {
      const res = await fetch("/api/random");
      const json = await res.json();
      if (json.random) {
        const raw = BigInt(json.random);
        const final = Number(raw % BigInt(5)) + 1;
        setVrfProof(json.random);
        // after settle, trigger reward transfer
        setTimeout(async () => {
          clearInterval(tempTimer);
          setSelected(final);
          setIsRolling(false);

          const winner = posts[final - 1]?.post.author;
          if (winner) {
            // Create pending record
            const newRecord: RewardRecord = {
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? (crypto.randomUUID as () => string)()
                  : `${Date.now()}-${Math.random()}`,
              recipient: winner,
              tx_hash: null,
              status: "pending",
              created_at: new Date().toISOString(),
            };

            setHistory((prev) => {
              const next = [newRecord, ...prev].slice(0, 20);
              saveHistoryLS(next);
              return next;
            });

            setTxStatus("Sending 500 USDC reward…");

            // Helper to update record in local history by id
            const updateRecord = (updates: Partial<RewardRecord>) => {
              setHistory((prev) => {
                const next = prev.map((r) =>
                  r.id === newRecord.id ? { ...r, ...updates } : r
                );
                saveHistoryLS(next);
                return next;
              });
            };
            try {
              const resTx = await fetch("/api/reward", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recipient: winner }),
              });
              const jsonTx = await resTx.json();
              if (jsonTx.hash) {
                setTxHash(jsonTx.hash as string);
                updateRecord({
                  tx_hash: jsonTx.hash as string,
                  status: "success",
                });
                setTxStatus("Reward sent!");
              } else {
                updateRecord({ status: "failed" });
                setTxStatus(jsonTx.error || "Reward tx failed");
              }
            } catch (e: unknown) {
              console.error("Reward tx failed", e);
              updateRecord({ status: "failed" });
              setTxStatus(
                "Reward tx failed: " + (e as Error)?.message || "unknown"
              );
            } finally {
              // nothing extra; updates handled in helper
            }
          }
        }, duration + 100);
        return;
      }
      throw new Error("No random in response");
    } catch (err) {
      console.error("VRF fetch failed, falling back to Math.random", err);
      // fallback
      const final = Math.floor(Math.random() * 5) + 1;
      setVrfProof(null);
      setTimeout(() => {
        clearInterval(tempTimer);
        setSelected(final);
        setIsRolling(false);
      }, duration + 100);
    }
  };

  // Helper to apply highlight ring to selected card
  const isHighlighted = (idx: number) => selected === idx + 1;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--muted-bg)]">
      <main className="flex-1 flex flex-col items-center gap-6 p-6 pb-32 text-center">
        <h1 className="text-3xl font-hand font-bold text-[var(--primary)]">
          Rewards
        </h1>
        <p className="text-sm text-gray-600 max-w-xs">
          Top 5 posts of the week (❤️ + ⭐). The lucky cat 😽 will send one of
          the posters 500 USDC!
        </p>

        {/* Grid layout */}
        <div className="grid grid-cols-3 gap-4 auto-rows-max w-full max-w-md">
          {/* Cat occupies first row full width */}
          <div className="col-span-3 row-start-1 flex justify-center">
            <button
              onClick={roll}
              disabled={isRolling || loading || posts.length === 0}
              className="relative focus:outline-none"
            >
              <img
                src="/lucky.png"
                alt="Lucky Cat"
                className={`w-36 h-36 object-contain transition-transform ${
                  isRolling ? "animate-pulse" : ""
                }`}
              />
            </button>
          </div>

          {/* Winner number cell (row 2 col 2) */}
          <div className="col-start-2 row-start-2 flex items-center justify-center">
            {selected !== null && (
              <span className="text-4xl font-bold text-blue-600 drop-shadow-lg">
                {selected}
              </span>
            )}
          </div>

          {/* Cards */}
          {([0, 1, 2, 3, 4] as const).map((i) => {
            const posMap = [
              { col: 1, row: 2 }, // post 0 second row left
              { col: 3, row: 2 }, // post 1 second row right
              { col: 1, row: 3 }, // post 2 last row left
              { col: 2, row: 3 }, // post 3 last row middle
              { col: 3, row: 3 }, // post 4 last row right
            ];
            const pos = posMap[i];
            const item = posts[i];
            return (
              <div
                key={i}
                className={`col-start-${pos.col} row-start-${pos.row}`}
              >
                {!loading && item ? (
                  <div
                    className={
                      isHighlighted(i)
                        ? "ring-4 ring-blue-500 rounded-xl scale-[1.03] transition-transform"
                        : ""
                    }
                  >
                    <div className="relative">
                      <PostCard post={item.post} />
                      {/* rank badge top-left for quick reference */}
                      <span className="absolute top-1 left-1 bg-[var(--primary)] text-white text-[10px] px-1.5 py-0.5 rounded-full shadow">
                        {i + 1}
                      </span>
                    </div>
                    {/* score text below */}
                    <p className="text-center text-xs mt-1 text-gray-700 font-medium">
                      Total Score: {item.score}
                    </p>
                  </div>
                ) : (
                  <div className="w-full aspect-[3/4] rounded-xl bg-gray-100 animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {vrfProof && (
          <p className="text-sm text-gray-600 mt-4">
            Flow VRF random:{" "}
            <span className="font-mono select-all text-base">{vrfProof}</span>
          </p>
        )}

        {/* txStatus and txHash are now surfaced through the history list */}

        {/* Rewards history dashboard */}
        {history.length > 0 && (
          <div className="w-full mt-8">
            <h2 className="text-lg font-semibold mb-2 text-[var(--primary)]">
              Recent Winners
            </h2>
            <div className="border rounded-lg divide-y bg-white shadow-sm">
              {history.map((r) => {
                const shortAddr = `${r.recipient.slice(
                  0,
                  6
                )}…${r.recipient.slice(-4)}`;
                const shortHash = r.tx_hash
                  ? `${r.tx_hash.slice(0, 8)}…${r.tx_hash.slice(-6)}`
                  : "-";
                const statusColor =
                  r.status === "success"
                    ? "text-green-600"
                    : r.status === "failed"
                    ? "text-red-600"
                    : "text-yellow-600";
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-3 gap-2 px-3 py-2 text-sm items-center"
                  >
                    <span className="font-mono truncate" title={r.recipient}>
                      {shortAddr}
                    </span>
                    {r.tx_hash ? (
                      <a
                        href={`https://evm.flowscan.io/tx/${r.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-600 truncate font-mono"
                        title={r.tx_hash}
                      >
                        {shortHash}
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                    <span className={`capitalize ${statusColor}`}>
                      {r.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default RewardsPage;
