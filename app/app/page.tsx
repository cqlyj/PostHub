"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import Image from "next/image";
import AnimatedAvatars from "@/components/AnimatedAvatars";
// Address of the deployed Customization contract on Flow Mainnet EVM
const CONTRACT_ADDRESS = "0xbd0Efe0890B8107fDa1495754ccb25FdbCCcE2aF";
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
      <main className="relative min-h-screen flex items-center justify-center bg-white p-4 text-center">
        <AnimatedAvatars />
        <h1 className="relative z-10 text-3xl md:text-4xl font-hand font-bold text-gray-700 animate-pulse">
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
    <main className="relative min-h-screen flex items-center justify-center bg-white p-4 text-center">
      {/* Decorative floating avatars */}
      <AnimatedAvatars />
      <div className="relative z-10 bg-white px-12 py-16 rounded-xl shadow-2xl flex flex-col items-center gap-10 fade-in-up">
        {/* App logo */}
        <Image
          src="/logo.png"
          alt="PostHub Logo"
          width={160}
          height={160}
          priority
          className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-lg select-none"
        />
        {/* Tagline */}
        <p className="text-2xl md:text-3xl font-hand font-bold text-gray-700">
          Share moments, Help others
        </p>
        <button
          onClick={handleClick}
          className="rounded-full bg-[var(--primary)] hover:bg-red-600 active:scale-95 text-white transition-transform transform-gpu duration-200 font-semibold px-12 py-4 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-red-300"
        >
          {authenticated ? "Disconnect" : "Get Started"}
        </button>
      </div>
    </main>
  );
};

export default Page;
