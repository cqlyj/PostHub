import React from "react";

interface GiftOption {
  amount: number;
  emoji: string;
  name: string;
  description: string;
}

interface GiftModalProps {
  options: readonly GiftOption[];
  onClose: () => void;
  onSelect: (option: GiftOption) => void;
}

const GiftModal: React.FC<GiftModalProps> = ({
  options,
  onClose,
  onSelect,
}) => {
  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 slide-up">
        <h3 className="text-center text-lg font-bold mb-4 text-[var(--primary)]">
          Send a Gift
        </h3>
        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.amount}
              onClick={() => onSelect(opt)}
              className="w-full flex items-center justify-between border border-gray-200 rounded-lg p-3 active:scale-95 transition duration-150"
            >
              <span className="text-3xl">{opt.emoji}</span>
              <div className="flex-1 text-left ml-3">
                <div className="font-semibold">{opt.name}</div>
                <div className="text-xs text-gray-500">{opt.description}</div>
              </div>
              <span className="font-bold text-[var(--primary)]">
                {opt.amount}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GiftModal;
