import React, { useEffect } from "react";

export type GiftOption = {
  amount: number;
  emoji: string;
  name: string;
  description: string;
};

interface GiftAnimationOverlayProps {
  option: GiftOption;
  txHash?: string;
  confirmed?: boolean;
  onClose: () => void;
}

const GiftAnimationOverlay: React.FC<GiftAnimationOverlayProps> = ({
  option,
  onClose,
}) => {
  // auto-close after 2 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const renderAnimation = () => {
    switch (option.name) {
      case "Rocket":
        // Simplified: one big rocket bouncing for 2 seconds
        return <span className="rocket-anim">🚀</span>;
      case "Car":
        return <span className="car-anim">🚗</span>;
      case "Confetti":
        return (
          <div className="confetti-wrapper">
            {Array.from({ length: 25 }).map((_, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{ left: `${Math.random() * 100}%` }}
              >
                🎊
              </span>
            ))}
          </div>
        );
      case "Flower":
      default:
        return <span className="flower-anim">🌸</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center">
      {renderAnimation()}
    </div>
  );
};

export default GiftAnimationOverlay;
