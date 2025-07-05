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
          className="h-7 w-7 mb-0.5"
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

      {/* Rewards */}
      <button
        onClick={() => router.push("/rewards")}
        className="flex flex-col items-center text-gray-500 hover:text-[var(--primary)] text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.96a1 1 0 00.95.69h4.17c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.286 3.959c.3.921-.755 1.688-1.54 1.118l-3.368-2.448a1 1 0 00-1.175 0l-3.368 2.448c-.785.57-1.84-.197-1.54-1.118l1.286-3.959a1 1 0 00-.364-1.118L2.05 9.387c-.783-.57-.38-1.81.588-1.81h4.17a1 1 0 00.95-.69l1.286-3.96z"
          />
        </svg>
        Rewards
      </button>

      {/* Add */}
      <button
        className="-mt-8 bg-[var(--primary)] w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg border-4 border-white"
        onClick={() => router.push("/create")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="h-8 w-8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 4.5v15m7.5-7.5h-15"
          />
        </svg>
      </button>

      {/* Notifications */}
      <button
        onClick={() => router.push("/notifications")}
        className="flex flex-col items-center text-gray-500 hover:text-[var(--primary)] text-xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-7 w-7 mb-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 10V6a2 2 0 10-4 0v4c0 3.866-2.239 6.572-3 7h10c-.761-.428-3-3.134-3-7z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.73 21a2.001 2.001 0 01-3.46 0"
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
          className="h-7 w-7 mb-0.5"
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
