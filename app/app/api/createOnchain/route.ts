import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xb9e6B05EC9c15E3a2898594AD8b81A177D664F46";
const ABI = [
  "function createPost(address author,string title,string summary,string[] mediaLinks)",
];

export async function POST(req: NextRequest) {
  try {
    const { author, title, summary, mediaLinks } = await req.json();

    if (!author || !title || !summary) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const privateKey = process.env.FLOW_TX_PRIVATE_KEY;
    // Use official Flow EVM mainnet public RPC if env not set
    const rpcUrl =
      process.env.FLOW_EVM_RPC_URL || "https://mainnet.evm.nodes.onflow.org";

    // quick connectivity check to fail fast when RPC unreachable
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    try {
      await provider.getNetwork();
    } catch (connErr) {
      console.error("RPC connectivity error", connErr);
      return NextResponse.json(
        { error: "RPC connection failed", details: (connErr as Error).message },
        { status: 500 }
      );
    }

    if (!privateKey) {
      console.error("FLOW_TX_PRIVATE_KEY not set");
      return NextResponse.json(
        { error: "Server mis-configuration" },
        { status: 500 }
      );
    }

    const signer = new ethers.Wallet(privateKey, provider);

    try {
      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        return NextResponse.json(
          { error: "Contract not found at address" },
          { status: 500 }
        );
      }

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      const tx = await contract.createPost(
        author,
        title,
        summary,
        mediaLinks ?? []
      );

      // Return immediately with the transaction hash; the client can monitor status separately.
      return NextResponse.json({ hash: tx.hash }, { status: 200 });
    } catch (txErr) {
      console.error("EVM tx error", txErr);
      return NextResponse.json(
        { error: "On-chain posting failed", details: (txErr as Error).message },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("Failed to post on-chain", err);
    return NextResponse.json(
      { error: "On-chain posting failed" },
      { status: 500 }
    );
  }
}
