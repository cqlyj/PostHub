import Image from "next/image";
import React from "react";

const AVATARS = [
  {
    src: "/avatar1-clean.png",
    style: {
      top: "10%",
      left: "5%",
      width: "90px",
      height: "90px",
      animationDelay: "0s",
    } as React.CSSProperties,
  },
  {
    src: "/avatar2-clean.png",
    style: {
      top: "8%",
      right: "3%",
      width: "110px",
      height: "110px",
      animationDelay: "1.5s",
    } as React.CSSProperties,
  },
  {
    src: "/avatar3-clean.png",
    style: {
      bottom: "12%",
      left: "40%",
      width: "100px",
      height: "100px",
      animationDelay: "3s",
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
