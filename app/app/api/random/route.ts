import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// Cadence Arch precompile address (same across networks)
const ARCH_ADDRESS = "0x0000000000000000000000010000000000000001";

// Minimal ABI for the revertibleRandom() view function
const ABI = ["function revertibleRandom() view returns (uint64)"];

// Public Flow EVM mainnet RPC; can be overridden via env
const RPC_URL =
  process.env.FLOW_EVM_RPC_URL || "https://mainnet.evm.nodes.onflow.org";

// Memoized provider instance to avoid reconnect spam across hot reloads
let provider: ethers.JsonRpcProvider | undefined;
function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

export async function GET(_req: NextRequest) {
  try {
    const pv = getProvider();
    const cadenceArch = new ethers.Contract(ARCH_ADDRESS, ABI, pv);

    // Static call to fetch random uint64
    const rand: bigint = await cadenceArch.revertibleRandom();

    return NextResponse.json(
      {
        random: rand.toString(), // return as string to avoid JS bigint issues
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Failed to fetch Flow VRF random", err);
    return NextResponse.json(
      { error: "Randomness fetch failed" },
      { status: 500 }
    );
  }
}
