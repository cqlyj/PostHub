"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { getDisplayName } from "@/utils/displayName";

export type NotificationType =
  | "like"
  | "star"
  | "comment"
  | "reply"
  | "gift_sent"
  | "gift_received"
  | "comment_like";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  text: string;
  timestamp: number;
  link?: string;
  read: boolean; // whether the user has opened/read this notification
}

const STORAGE_KEY = "posthub_notifications_v1";
const MAX_ITEMS = 50;

function load(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Back-compat: if older entries have no `read` flag, assume they were read
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((n: any) => ({ ...n, read: n.read ?? true }));
    }
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
  add: (n: Omit<NotificationItem, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<ContextValue | undefined>(undefined);

export type NotificationPayload = {
  recipient: string;
  actor: string;
  postId: string;
  type: NotificationType;
  commentId?: string;
};

export async function sendNotification(payload: NotificationPayload) {
  if (!payload.recipient) return;

  const channel = getNotificationChannel();

  // Ensure we've joined the channel before sending. If we're already joined
  // (`SUBSCRIBED`) this resolves immediately.
  await new Promise<void>((resolve, reject) => {
    if (channel.state === "joined") {
      resolve();
      return;
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
      if (
        status === "CLOSED" ||
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      )
        reject(new Error("Failed to subscribe to notifications channel"));
    });
  });

  try {
    // Wait for server ACK so we know the message has actually been accepted.
    await channel.send({ type: "broadcast", event: "notify", payload });
  } catch (err) {
    console.error("Failed to broadcast notification", err);
  }
}

function getNotificationChannel() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== "undefined" ? (window as any) : {};
  if (!w.__posthub_notify_channel) {
    w.__posthub_notify_channel = supabase.channel("realtime_notifications", {
      // Ask the server to acknowledge the message so we can detect failures.
      config: { broadcast: { ack: true } },
    });
  }
  return w.__posthub_notify_channel as ReturnType<typeof supabase.channel>;
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toast, setToast] = useState<NotificationItem | null>(null);

  const { user } = usePrivy();
  const router = useRouter();
  const walletAddress = user?.wallet?.address ?? "";

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
          read: false,
        },
        ...prev,
      ].slice(0, MAX_ITEMS);
      save(newList);
      const newest = newList[0];
      setToast(newest);
      return newList;
    });
  };

  const markRead: ContextValue["markRead"] = (id) => {
    setNotifications((prev) => {
      // Find the notification we’re marking so we can dedupe by underlying event.
      const target = prev.find((n) => n.id === id);

      const updated = prev.map((n) => {
        // 1. Mark the explicit target as read
        if (n.id === id) return { ...n, read: true };

        if (!target) return n; // safety – shouldn’t happen

        // 2. Duplicate detection logic.
        const sameType = n.type === target.type;

        // a) Links are identical → definitely same event
        if (sameType && target.link && n.link === target.link) {
          return { ...n, read: true };
        }

        // b) One of the entries has no link (legacy entry). Treat as duplicate
        //    if timestamps are very close (10 s) – they derive from the same DB action.
        const timeClose = Math.abs(n.timestamp - target.timestamp) < 10_000;
        if (sameType && timeClose && (!n.link || !target.link)) {
          return { ...n, read: true };
        }

        return n;
      });

      save(updated);
      return updated;
    });
  };

  const markAllRead: ContextValue["markAllRead"] = () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      save(updated);
      return updated;
    });
  };

  const clear = () => {
    setNotifications([]);
    save([]);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!walletAddress) return;

    const isSelf = (addr?: string | null) =>
      addr && addr.toLowerCase() === walletAddress.toLowerCase();

    const channel = getNotificationChannel();

    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "likes" },
      async (payload) => {
        const row = payload.new as { post_id: string; user_address: string };
        if (isSelf(row.user_address)) return;
        const { data: post } = await supabase
          .from("posts")
          .select("author")
          .eq("id", row.post_id)
          .single();
        if (post?.author && isSelf(post.author)) {
          const actorName = await getDisplayName(row.user_address);
          add({
            type: "like",
            text: `${actorName} liked your post`,
            link: `/post/${row.post_id}`,
          });
        }
      }
    );

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
          const actorName = await getDisplayName(row.user_address);
          add({
            type: "star",
            text: `${actorName} starred your post`,
            link: `/post/${row.post_id}`,
          });
        }
      }
    );

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
          const { data: parent } = await supabase
            .from("comments")
            .select("author")
            .eq("id", row.parent_comment_id)
            .single();
          if (parent?.author && isSelf(parent.author)) {
            const actorName = await getDisplayName(row.author);
            add({
              type: "reply",
              text: `${actorName} replied to your comment`,
              link: `/post/${row.post_id}#comment-${row.id}`,
            });
          }
        } else {
          const { data: post } = await supabase
            .from("posts")
            .select("author")
            .eq("id", row.post_id)
            .single();
          if (post?.author && isSelf(post.author)) {
            const actorName = await getDisplayName(row.author);
            add({
              type: "comment",
              text: `${actorName} commented on your post`,
              link: `/post/${row.post_id}#comment-${row.id}`,
            });
          }
        }
      }
    );

    // Comment likes
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "comment_likes" },
      async (payload) => {
        const row = payload.new as { comment_id: string; user_address: string };
        if (isSelf(row.user_address)) return; // ignore self
        // fetch comment to check author
        const { data: c } = await supabase
          .from("comments")
          .select("author, post_id")
          .eq("id", row.comment_id)
          .single();
        if (c?.author && isSelf(c.author)) {
          const actorName = await getDisplayName(row.user_address);
          add({
            type: "comment_like",
            text: `${actorName} liked your comment`,
            link: `/post/${c.post_id}#comment-${row.comment_id}`,
          });
        }
      }
    );

    channel.on("broadcast", { event: "notify" }, async ({ payload }) => {
      const data = payload as NotificationPayload;
      if (!data || !data.recipient || !data.type) return;
      if (!isSelf(data.recipient)) return;

      const actorName = await getDisplayName(data.actor);
      const verbMap: Record<NotificationType, string> = {
        like: "liked your post",
        star: "starred your post",
        comment: "commented on your post",
        reply: "replied to your comment",
        gift_sent: "sent a gift",
        gift_received: "sent you a gift",
        comment_like: "liked your comment",
      } as const;

      const text = `${actorName} ${verbMap[data.type]}`;
      const link = `/post/${data.postId}${
        data.commentId ? `#comment-${data.commentId}` : ""
      }`;

      add({ type: data.type, text, link });
    });

    // Subscribe if we haven't yet and make sure we auto-reconnect on errors.
    if (channel.state !== "joined" && channel.state !== "joining") {
      channel.subscribe((status) => {
        if (
          status === "CLOSED" ||
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT"
        ) {
          // Attempt to resubscribe after a short delay.
          console.warn(
            `Notifications channel lost (status: ${status}). Reconnecting…`
          );
          setTimeout(() => {
            if (channel.state !== "joined" && channel.state !== "joining") {
              channel.subscribe();
            }
          }, 1000);
        }
      });
    }

    // No need to explicitly remove the shared channel – it is reused across the
    // entire session. Cleaning up here would break other listeners or broadcasts.
    return () => {
      /* noop */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, add, markRead, markAllRead, clear }}
    >
      {children}
      {toast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fadeInOut cursor-pointer"
          onClick={() => {
            // Mark it as read immediately
            markRead(toast.id);
            if (toast.link) router.push(toast.link);
          }}
        >
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
