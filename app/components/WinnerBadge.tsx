import React from "react";
import { IMAGE_URL } from "@/utils/poap";

interface WinnerBadgeProps {
  size?: number; // pixel size of the icon (square)
}

/**
 * Simple image badge for Post Winner POAP.
 */
const WinnerBadge: React.FC<WinnerBadgeProps> = ({ size = 28 }) => {
  const labelFont = Math.max(4, size * 0.25); // slightly smaller label
  const catScale = 0.7; // bigger cat to fill space
  const catSize = size * catScale;

  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        verticalAlign: "middle",
      }}
      className="relative inline-block rounded-full shadow-md bg-white overflow-hidden"
      // apply thinner ring for tiny sizes via inline style
      // using box-shadow to mimic ring so width can scale
      style={{
        width: `${size}px`,
        height: `${size}px`,
        verticalAlign: "middle",
        boxShadow: `0 0 0 ${size < 18 ? 1 : 2}px #9333EA, 0 0 0 ${
          size < 18 ? 2 : 4
        }px #fff`,
        borderRadius: "50%",
      }}
      title="Post Winner POAP"
    >
      {/* POAP label */}
      <span
        className="absolute left-1/2 -translate-x-1/2 leading-none font-bold tracking-tight text-purple-700 select-none pointer-events-none"
        style={{
          textShadow: "0 0 1px #fff",
          top: `${size * 0.07}px`,
          fontSize: `${labelFont}px`,
        }}
      >
        POAP
      </span>

      {/* Cat image centred below label */}
      <img
        src={IMAGE_URL}
        alt="Winner POAP"
        className="absolute rounded-full object-contain select-none pointer-events-none"
        style={{
          width: `${catSize}px`,
          height: `${catSize}px`,
          top: `${size * 0.32}px`, // move cat down a bit
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Ribbon */}
      <span
        className="absolute block"
        style={{
          bottom: "-4px",
          left: "50%",
          transform: "translateX(-50%)",
          width: `${size * 0.6}px`,
          height: `${size * 0.25}px`,
        }}
      >
        <span
          className="block w-full h-full bg-pink-400"
          style={{ clipPath: "polygon(0% 0%, 100% 0%, 75% 100%, 25% 100%)" }}
        />
      </span>
    </span>
  );
};

export default WinnerBadge;
