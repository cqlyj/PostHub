"use client";
import React from "react";
import { useRouter } from "next/navigation";

const BottomNav = () => {
  const router = useRouter();
  return (
    <footer className="sticky bottom-0 z-10 bg-white shadow-md px-6 py-2 flex justify-between items-center">
      {/* Home */}
      <button
        onClick={() => router.push("/explore")}
        className="flex flex-col items-center text-gray-500 hover:text-[var(--primary)] text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7m-2 2v7a2 2 0 01-2 2h-3m-6 0H5a2 2 0 01-2-2v-7z"
          />
        </svg>
        Home
      </button>

      {/* Wheel */}
      <button
        onClick={() => router.push("/lucky")}
        className="flex flex-col items-center text-gray-500 hover:text-[var(--primary)] text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.95-6.95l-1.414 1.414M6.464 17.536l-1.414 1.414m0-13.95l1.414 1.414M17.536 17.536l1.414 1.414"
          />
        </svg>
        Lucky
      </button>

      {/* Add */}
      <button
        className="-mt-8 bg-[var(--primary)] w-14 h-14 rounded-full text-white flex items-center justify-center text-3xl shadow-lg border-4 border-white"
        onClick={() => router.push("/create")}
      >
        +
      </button>

      {/* Notifications */}
      <button
        onClick={() => router.push("/notifications")}
        className="flex flex-col items-center text-gray-500 hover:text-[var(--primary)] text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 00-3 0v.68C7.64 5.36 6 7.92 6 11v3.159c0 .538-.214 1.054-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        Notify
      </button>

      {/* Profile */}
      <button
        onClick={() => router.push("/profile")}
        className="flex flex-col items-center text-gray-500 hover:text-[var(--primary)] text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        Me
      </button>
    </footer>
  );
};

export default BottomNav;
