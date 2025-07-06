"use client";

import React from "react";
import WinnerBadge from "@/components/WinnerBadge";
import BottomNav from "@/components/BottomNav";

const PoapInfoPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--muted-bg)]">
      <main className="flex-1 flex flex-col items-center text-center p-6 gap-4">
        <h1 className="text-3xl font-hand font-bold text-purple-700">
          Post Winner POAP
        </h1>
        <div className="flex flex-col items-center gap-3">
          <WinnerBadge size={140} />
          <p className="max-w-md text-sm text-gray-700">
            This badge is awarded weekly to one lucky post author selected from
            the top 5 highest-scoring posts (❤️ + ⭐). It’s minted on Flow
            mainnet, forever commemorating the achievement.
          </p>
          <p className="max-w-md text-sm text-gray-700">
            Holders enjoy bragging rights and future surprises delivered by our
            playful Lucky Cat 🐱.
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default PoapInfoPage;
