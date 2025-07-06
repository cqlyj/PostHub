import Image from "next/image";
import React from "react";

const AVATARS = [
  {
    src: "/avatar1-clean.png",
    style: {
      top: "40px", // lowered again
      left: "10%",
      width: "110px",
      height: "110px",
      animationDelay: "0s",
    } as React.CSSProperties,
  },
  {
    src: "/avatar2-clean.png",
    style: {
      top: "20px", // lowered again for center cat
      left: "50%",
      transform: "translateX(-50%)",
      width: "120px",
      height: "120px",
      animationDelay: "1.2s",
    } as React.CSSProperties,
  },
];

const AnimatedAvatars = () => {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {AVATARS.map((avatar, idx) => (
        <Image
          key={idx}
          src={avatar.src}
          alt={`Decorative avatar ${idx + 1}`}
          width={100}
          height={100}
          priority={idx === 0}
          className={`absolute opacity-60 md:opacity-70 ${
            idx % 2 === 0 ? "float-animation" : "float-tilt"
          }`}
          style={avatar.style}
        />
      ))}
    </div>
  );
};

export default AnimatedAvatars;
