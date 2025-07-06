// POAP helper functions
import { ethers } from "ethers";

export const IMAGE_URL =
  "https://tnxlazzhdahkkfmoqboa.supabase.co/storage/v1/object/public/post-media//lucky.png";

// Fallback to static allowlist for immediate response while on-chain call happens
const STATIC_WINNERS = new Set<string>([
  "0x9a5cf28f9dc827a367c2a0eff4b4f02bd589db67",
]);

// Simple in-memory cache to avoid duplicate RPC calls
const cache: Record<string, boolean> = {};

const POAP_ABI = ["function balanceOf(address owner) view returns (uint256)"];

function getProvider(): ethers.JsonRpcProvider {
  const rpc =
    process.env.NEXT_PUBLIC_FLOW_EVM_RPC_URL ||
    "https://mainnet.evm.nodes.onflow.org";
  return new ethers.JsonRpcProvider(rpc);
}

function getContractAddress(): string {
  const addr = process.env.NEXT_PUBLIC_POAP_CONTRACT_ADDRESS;
  if (!addr || addr.length === 0) {
    // Default to deployed PostWinner POAP address on Flow mainnet
    return "0x9A5CF28f9dC827a367C2a0eFF4b4f02bD589DB67";
  }
  return addr;
}

/**
 * Check on-chain if the given wallet owns any PostWinner POAP.
 * Result is cached this session. Falls back to static list while loading.
 */
export async function hasPoapOnChain(
  address?: string | null
): Promise<boolean> {
  if (!address) return false;
  const lower = address.toLowerCase();

  // cache hit
  if (cache[lower] !== undefined) return cache[lower];

  // immediate optimistic static list
  if (STATIC_WINNERS.has(lower)) {
    cache[lower] = true;
    return true;
  }

  try {
    const provider = getProvider();
    const contract = new ethers.Contract(
      getContractAddress(),
      POAP_ABI,
      provider
    );
    const bal: bigint = await contract.balanceOf(lower);
    const has = bal > 0n;
    cache[lower] = has;
    return has;
  } catch (e) {
    console.error("POAP lookup failed", e);
    cache[lower] = false;
    return false;
  }
}
