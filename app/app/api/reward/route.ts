import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { supabase } from "@/lib/supabaseClient";

// Mock USDC (ERC20) contract address provided by user
const USDC_ADDRESS = "0xa7FbcaAD0D4c2e8188b386B7C3951E1e0792Bf8E";
// Minimal ERC20 ABI for transfer
const ERC20_ABI = [
  "function transfer(address to,uint256 amount) returns (bool)",
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
