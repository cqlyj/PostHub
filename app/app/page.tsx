"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
// Address of the deployed Customization contract on Flow Mainnet EVM
const CONTRACT_ADDRESS = "0x1bA052BD126d7C5EE3A4baEAF51e3cc2eeBd32D7";
// Minimal ABI to read nationality mapping
const NAT_ABI = ["function s_userNationality(address) view returns (string)"];
// Celo Alfajores (testnet) RPC for on-chain reads
const CELO_TESTNET_RPC = "https://alfajores-forno.celo-testnet.org";

const Page = () => {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const router = useRouter();

  // Detect wallet disconnection at the provider level and force logout
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0 && authenticated) {
        logout();
      }
    };

    const handleDisconnect = () => {
      if (authenticated) logout();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("disconnect", handleDisconnect);

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("disconnect", handleDisconnect);
    };
  }, [authenticated, logout]);

  // After connection, determine whether the user has already customized
  useEffect(() => {
    const decideRedirect = async () => {
      if (!ready || !authenticated || !user?.wallet?.address) return;

      try {
        // Always read from the Celo testnet
        const provider = new ethers.JsonRpcProvider(CELO_TESTNET_RPC);

        // Read nationality directly from the contract using a lightweight ABI
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          NAT_ABI,
          provider
        );
        const nationality: string = await contract.s_userNationality(
          user.wallet.address
        );

        if (nationality && nationality.trim() !== "") {
          router.push("/explore");
        } else {
          router.push("/customize");
        }
      } catch (err) {
        console.error("Error fetching nationality:", err);
        router.push("/customize");
      }
    };

    decideRedirect();
  }, [ready, authenticated, user, router]);

  // Only render once the Privy provider is ready
  if (!ready) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-4 text-center">
        <h1 className="text-4xl font-bold text-white animate-pulse">
          Loading...
        </h1>
      </main>
    );
  }

  const handleClick = () => {
    if (authenticated) {
      logout();
    } else {
      login();
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center animated-gradient p-4 text-center">
      <div className="bg-white/70 backdrop-blur-sm px-12 py-16 rounded-xl shadow-2xl flex flex-col items-center gap-10 fade-in-up">
        <h1 className="text-5xl md:text-7xl font-extrabold text-blue-800 tracking-tight drop-shadow-md select-none">
          PostHub
        </h1>
        <button
          onClick={handleClick}
          className="rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:via-purple-700 hover:to-pink-700 active:scale-95 text-white transition-transform transform-gpu duration-200 font-semibold px-10 py-4 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-400"
        >
          {authenticated ? "Disconnect" : "Connect"}
        </button>
      </div>
    </main>
  );
};

export default Page;
