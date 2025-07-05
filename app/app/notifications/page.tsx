"use client";

import React from "react";
import { useNotifications } from "@/utils/notifications";
import { useRouter } from "next/navigation";

const NotificationsPage: React.FC = () => {
  const { notifications, markAllRead, markRead, clear } = useNotifications();
  const router = useRouter();

  const unread = notifications.some((n) => !n.read);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--muted-bg)]">
      <header className="bg-white shadow p-4 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="text-[var(--primary)] text-lg"
        >
          ←
        </button>
        <h1 className="font-semibold text-[var(--primary)] flex-1">
          Notifications
        </h1>
        {unread && (
          <button
            onClick={markAllRead}
            className="text-xs text-[var(--primary)] underline mr-2"
          >
            Mark all read
          </button>
        )}
        {notifications.length > 0 && (
          <button onClick={clear} className="text-xs text-red-500 underline">
            Clear
          </button>
        )}
      </header>
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        {notifications.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-4">No mews yet</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`bg-white rounded-lg shadow p-3 text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${
                !n.read ? "font-semibold" : "opacity-70"
              }`}
              onClick={() => {
                if (n.link) router.push(n.link);
                if (!n.read) markRead(n.id);
              }}
            >
              <span className="text-lg">
                {n.type === "like" && "❤️"}
                {n.type === "star" && "⭐"}
                {n.type === "comment" && "💬"}
                {n.type === "reply" && "↩️"}
                {(n.type === "gift_sent" || n.type === "gift_received") && "🎁"}
              </span>
              <span className="flex-1">{n.text}</span>
              <span className="text-gray-400 text-xs">
                {new Date(n.timestamp).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
