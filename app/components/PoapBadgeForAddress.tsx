import React, { useEffect, useState } from "react";
import WinnerBadge from "@/components/WinnerBadge";
import { hasPoapOnChain } from "@/utils/poap";

interface Props {
  address?: string | null;
  size?: number;
}

const PoapBadgeForAddress: React.FC<Props> = ({ address, size = 20 }) => {
  const [has, setHas] = useState(false);

  // Enforce a practical minimum size so label remains legible
  const clampedSize = Math.max(14, size);

  useEffect(() => {
    let cancelled = false;
    if (!address) {
      setHas(false);
      return;
    }
    hasPoapOnChain(address)
      .then((res) => {
        if (!cancelled) setHas(res);
      })
      .catch((err) => {
        console.error("POAP lookup", err);
      });
    return () => {
      cancelled = true;
    };
  }, [address]);

  return has ? (
    <a
      href="/poap"
      title="View POAP details"
      className="inline-block align-middle ml-0.5"
      onClick={(e) => {
        // prevent comment link interference (if any)
        e.stopPropagation();
      }}
    >
      <WinnerBadge size={clampedSize} />
    </a>
  ) : null;
};

export default PoapBadgeForAddress;
