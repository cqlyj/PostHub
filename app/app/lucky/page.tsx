"use client";
import React from "react";
import BottomNav from "@/components/BottomNav";

const LuckyCatPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--muted-bg)]">
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-hand font-bold text-[var(--primary)]">
          Lucky Cat Wheel
        </h1>
        <p className="text-sm text-gray-600 max-w-xs">
          Every Sunday at 8:00 AM (UTC), the Lucky Cat Wheel selects one of the
          week’s top 10 posts (by likes ⭐ + hearts ❤️). The winning creator
          receives <strong>500&nbsp;USDC</strong> straight to their wallet.
        </p>
        <div className="w-64 h-64 rounded-full border-8 border-[var(--primary)] flex items-center justify-center animate-pulse select-none">
          {/* TODO: Replace with spinning wheel animation */}
          <span className="text-4xl">🐱🎡</span>
        </div>
        <p className="text-xs text-gray-400">
          Hang tight! The wheel spins automatically each week.
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default LuckyCatPage; 