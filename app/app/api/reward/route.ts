import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { supabase } from "@/lib/supabaseClient";

// Mock USDC (ERC20) contract address provided by user
const USDC_ADDRESS = "0xa7FbcaAD0D4c2e8188b386B7C3951E1e0792Bf8E";
// Minimal ERC20 ABI for transfer
const ERC20_ABI = [
  "function transfer(address to,uint256 amount) returns (bool)",
];

// Post Winner POAP contract configuration
const POAP_ADDRESS =
  process.env.POAP_CONTRACT_ADDRESS ||
  "0x9A5CF28f9dC827a367C2a0eFF4b4f02bD589DB67";
const POAP_ABI = [
  "function mintPoap(address to,uint256 week,uint256 likes,uint256 stars,uint256 postId) returns (uint256)",
];

// Flow EVM RPC endpoint (reuse env from random route or fallback)
const RPC_URL =
  process.env.FLOW_EVM_RPC_URL || "https://mainnet.evm.nodes.onflow.org";

// Memoized provider
let provider: ethers.JsonRpcProvider | undefined;
function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

export async function POST(req: NextRequest) {
  let pendingId: string | undefined;
  try {
    const { recipient } = await req.json();
    if (!recipient || !ethers.isAddress(recipient)) {
      return NextResponse.json(
        { error: "Invalid recipient address" },
        { status: 400 }
      );
    }

    const pk = process.env.FLOW_TX_PRIVATE_KEY;
    if (!pk) {
      return NextResponse.json(
        { error: "Server missing FLOW_TX_PRIVATE_KEY env" },
        { status: 500 }
      );
    }

    // Log reward record as pending
    const { data: pendingRows, error: insertErr } = await supabase
      .from("reward_logs")
      .insert({ recipient, status: "pending" })
      .select()
      .single();

    if (insertErr) {
      console.error("Failed to insert pending reward log", insertErr);
    }

    pendingId = pendingRows?.id as string | undefined;

    // Create wallet signer
    const wallet = new ethers.Wallet(pk, getProvider());

    // Connect to USDC contract
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);

    // 500 USDC with 6 decimals
    const amount = ethers.parseUnits("500", 6);

    const tx = await usdc.transfer(recipient, amount);

    // Wait for 1 confirmation but don't block UI too long.
    await tx.wait(1);

    // Update log to success
    if (pendingId) {
      const { error: updateErr } = await supabase
        .from("reward_logs")
        .update({ tx_hash: tx.hash, status: "success" })
        .eq("id", pendingId);
      if (updateErr) {
        console.error("Failed to update reward log to success", updateErr);
      }
    }

    // Mint Post Winner POAP badge for the winner (non-blocking)
    try {
      const poap = new ethers.Contract(POAP_ADDRESS, POAP_ABI, wallet);
      const now = new Date();
      const week =
        Math.floor(
          (now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) /
            (7 * 24 * 60 * 60 * 1000)
        ) + 1;
      await poap.mintPoap(recipient, week, 0, 0, 0);
    } catch (mintErr) {
      console.error("POAP mint failed", mintErr);
      // Do not revert overall reward processing if POAP mint fails
    }

    return NextResponse.json({ hash: tx.hash }, { status: 200 });
  } catch (err: any) {
    // On error, mark failed
    if (pendingId) {
      await supabase
        .from("reward_logs")
        .update({ status: "failed" })
        .eq("id", pendingId);
    }
    console.error("Reward transfer failed", err);
    return NextResponse.json(
      { error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
