import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePrivy } from "@privy-io/react-auth";

export type NotificationType =
  | "like"
  | "star"
  | "comment"
  | "reply"
  | "gift_sent"
  | "gift_received";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  text: string;
  timestamp: number;
}

const STORAGE_KEY = "posthub_notifications_v1";
const MAX_ITEMS = 50;

function load(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    /* ignore corrupted storage */
  }
  return [];
}

function save(list: NotificationItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

interface ContextValue {
  notifications: NotificationItem[];
  add: (n: Omit<NotificationItem, "id" | "timestamp">) => void;
  clear: () => void;
}

const NotificationsContext = createContext<ContextValue | undefined>(undefined);

// Helper to broadcast a realtime message to a specific wallet address.
// It does NOT store anything in the recipient's DB – the recipient's NotificationProvider
// will receive the broadcast and call `add` locally to show a toast + persist in its own localStorage.
export async function sendNotification(
  recipient: string,
  type: NotificationType
) {
  if (!recipient) return;
  // Fire-and-forget. We don't await subscription success; `send` works without it.
  const channel = supabase.channel("realtime_notifications");
  channel.send({
    type: "broadcast",
    event: "notify",
    payload: { recipient, type },
  });
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<NotificationItem | null>(null);

  // user wallet address via Privy
  const { user } = usePrivy();
  const walletAddress = user?.wallet?.address ?? "";

  // Load on mount
  useEffect(() => {
    setNotifications(load());
  }, []);

  const add: ContextValue["add"] = (n) => {
    setNotifications((prev) => {
      const newList = [
        {
          ...n,
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, MAX_ITEMS);
      save(newList);
      const newest = newList[0];
      // trigger toast
      setToast(newest);
      return newList;
    });
  };

  const clear = () => {
    setNotifications([]);
    save([]);
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Supabase realtime listeners – likes, stars, comments
  useEffect(() => {
    if (!walletAddress) return;

    // Helper to ignore self actions
    const isSelf = (addr?: string | null) =>
      addr && addr.toLowerCase() === walletAddress.toLowerCase();

    const channel = supabase.channel("realtime_notifications");

    // Likes
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "likes" },
      async (payload) => {
        const row = payload.new as { post_id: string; user_address: string };
        if (isSelf(row.user_address)) return;
        // fetch post to check author
        const { data: post } = await supabase
          .from("posts")
          .select("author")
          .eq("id", row.post_id)
          .single();
        if (post?.author && isSelf(post.author)) {
          add({ type: "like", text: "Someone liked your post" });
        }
      }
    );

    // Stars
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "stars" },
      async (payload) => {
        const row = payload.new as { post_id: string; user_address: string };
        if (isSelf(row.user_address)) return;
        const { data: post } = await supabase
          .from("posts")
          .select("author")
          .eq("id", row.post_id)
          .single();
        if (post?.author && isSelf(post.author)) {
          add({ type: "star", text: "Someone starred your post" });
        }
      }
    );

    // Comments & Replies
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comments" },
      async (payload) => {
        const row = payload.new as {
          id: string;
          author: string;
          post_id: string;
          parent_comment_id: string | null;
        };
        if (isSelf(row.author)) return;

        if (row.parent_comment_id) {
          // it is a reply – check if parent comment is mine
          const { data: parent } = await supabase
            .from("comments")
            .select("author")
            .eq("id", row.parent_comment_id)
            .single();
          if (parent?.author && isSelf(parent.author)) {
            add({ type: "reply", text: "Someone replied to your comment" });
          }
        } else {
          // normal comment – check if post is mine
          const { data: post } = await supabase
            .from("posts")
            .select("author")
            .eq("id", row.post_id)
            .single();
          if (post?.author && isSelf(post.author)) {
            add({ type: "comment", text: "Someone commented on your post" });
          }
        }
      }
    );

    // Broadcast listener – receives notifications sent from other clients
    channel.on(
      "broadcast",
      { event: "notify" },
      ({ payload }) => {
        const data = payload as { recipient: string; type: NotificationType };
        if (!data || !data.recipient || !data.type) return;
        if (!isSelf(data.recipient)) return;

        // Map to user-friendly text (same as DB change handlers)
        const textMap: Record<NotificationType, string> = {
          like: "Someone liked your post",
          star: "Someone starred your post",
          comment: "Someone commented on your post",
          reply: "Someone replied to your comment",
          gift_sent: "You sent a gift", // unlikely to be received – sender side only
          gift_received: "Someone sent you a gift",
        } as const;

        add({ type: data.type, text: textMap[data.type] });
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  return (
    <NotificationsContext.Provider value={{ notifications, add, clear }}>
      {children}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fadeInOut">
          {toast.text}
        </div>
      )}
    </NotificationsContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return ctx;
}
